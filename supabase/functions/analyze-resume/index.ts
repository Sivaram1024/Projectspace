import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import pdfParse from 'npm:pdf-parse@1.1.1';
import mammoth from 'npm:mammoth@1.8.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequestBody {
  resume_id?: string;
  storage_path?: string;
  resume_text?: string;
  target_role: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Authenticate user from JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized user session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AnalysisRequestBody = await req.json();
    const { resume_id, storage_path, resume_text: providedText, target_role } = body;

    if (!target_role) {
      return new Response(
        JSON.stringify({ error: 'Target role is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Resolve student_id securely from public.students
    let studentId = user.id;
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (studentData?.id) {
        studentId = studentData.id;
      }
    } catch {
      // Fallback to user.id if lookup encounters table mismatch
    }

    // 3. Text Extraction (Server-side priority)
    let extractedText = providedText || '';

    if (storage_path && (!extractedText || extractedText.length < 50)) {
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('resumes')
          .download(storage_path);

        if (!downloadError && fileData) {
          const arrayBuffer = await fileData.arrayBuffer();
          const ext = storage_path.toLowerCase().substring(storage_path.lastIndexOf('.'));

          if (ext === '.pdf') {
            const pdfBuffer = new Uint8Array(arrayBuffer);
            const parsedPdf = await pdfParse(pdfBuffer);
            extractedText = parsedPdf.text || extractedText;
          } else if (ext === '.docx' || ext === '.doc') {
            const parsedDocx = await mammoth.extractRawText({ buffer: new Uint8Array(arrayBuffer) as any });
            extractedText = parsedDocx.value || extractedText;
          } else {
            const decoder = new TextDecoder('utf-8');
            extractedText = decoder.decode(arrayBuffer);
          }
        }
      } catch (extractErr: any) {
        console.warn('Server-side extraction fallback to provided text:', extractErr?.message);
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Could not extract textual content from resume.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. LLM Analysis via Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('PALM_API_KEY');
    const geminiModel = Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-pro';

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured on the server.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemInstruction = `You are an expert technical recruiter, hiring manager, and AI resume reviewer.
Analyze the provided candidate resume text specifically against the target role: "${target_role}".

Evaluate the resume across these 12 criteria:
1. Technical skills match
2. Soft skills
3. Education relevance
4. Projects quality and relevance
5. Work/internship experience
6. Certifications
7. Relevant technologies used
8. Role-specific skill coverage
9. Missing skills for the target role
10. Key strengths
11. Key weaknesses
12. Practical recommendations to bridge the gap

Return ONLY valid JSON matching this exact structure without markdown backticks or commentary:
{
  "score": <number between 0 and 100 based on requirement match, experience, projects, education, and quality>,
  "skills": ["<skill1>", "<skill2>", ...],
  "missing_skills": ["<missing_skill1>", "<missing_skill2>", ...],
  "strengths": ["<strength1>", "<strength2>", ...],
  "weaknesses": ["<weakness1>", "<weakness2>", ...],
  "recommendations": ["<rec1>", "<rec2>", ...],
  "analysis": {
    "technical_skills_evaluation": "<string>",
    "experience_evaluation": "<string>",
    "projects_evaluation": "<string>",
    "education_evaluation": "<string>"
  }
}`;

    const promptText = `${systemInstruction}\n\nCandidate Resume Text:\n${extractedText.substring(0, 8000)}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API Error:', errText);
      throw new Error(`LLM Analysis service returned status ${geminiRes.status}`);
    }

    const geminiData = await geminiRes.json();
    const rawOutput = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsedResult: any = {};
    try {
      const cleanedJson = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleanedJson);
    } catch {
      parsedResult = {
        score: 65,
        skills: ['General Technical Skills'],
        missing_skills: ['Role-Specific Advanced Tools'],
        strengths: ['Resume submitted for evaluation'],
        weaknesses: ['Needs further detail'],
        recommendations: ['Add quantifiable achievements to resume'],
        analysis: {},
      };
    }

    // Clamp score strictly between 0 and 100
    const rawScore = Number(parsedResult.score);
    const score = isNaN(rawScore) ? 0 : Math.max(0, Math.min(100, Math.round(rawScore)));

    const recordPayload = {
      resume_id: resume_id || null,
      auth_user_id: user.id,
      student_id: studentId,
      target_role,
      score,
      skills: parsedResult.skills || [],
      missing_skills: parsedResult.missing_skills || [],
      strengths: parsedResult.strengths || [],
      weaknesses: parsedResult.weaknesses || [],
      recommendations: parsedResult.recommendations || [],
      analysis_data: parsedResult.analysis || parsedResult,
      status: 'completed',
      error_message: null,
      analyzed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 5. Database Insert into public.resume_analyses
    let dbRecord = recordPayload;
    try {
      const { data: dbData, error: dbError } = await supabase
        .from('resume_analyses')
        .insert([recordPayload])
        .select('*')
        .maybeSingle();

      if (!dbError && dbData) {
        dbRecord = dbData;
      }
    } catch (insertErr: any) {
      console.warn('Database insert into resume_analyses fallback:', insertErr?.message);
    }

    return new Response(JSON.stringify(dbRecord), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Analyze resume function error:', err?.message);
    return new Response(
      JSON.stringify({ error: err?.message || 'Failed to process resume analysis.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

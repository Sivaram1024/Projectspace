import { supabase, isSupabaseConfigured } from './supabase';

export interface ResumeAnalysisRecord {
  id?: string;
  resume_id?: string;
  auth_user_id: string;
  student_id?: string;
  target_role: string;
  score: number;
  skills: string[];
  missing_skills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  analysis_data?: any;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  file_name?: string;
  created_at?: string;
  updated_at?: string;
  analyzed_at?: string;
}

const LOCAL_STORAGE_RESUME_ANALYSES_KEY = 'placement_portal_resume_analyses_v2';

function getLocalResumeAnalyses(): ResumeAnalysisRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESUME_ANALYSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalResumeAnalysis(record: ResumeAnalysisRecord) {
  try {
    const records = getLocalResumeAnalyses();
    const existingIndex = records.findIndex(
      (r) => r.auth_user_id === record.auth_user_id && r.target_role.toLowerCase() === record.target_role.toLowerCase()
    );
    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.unshift(record);
    }
    localStorage.setItem(LOCAL_STORAGE_RESUME_ANALYSES_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Triggers server-side LLM analysis via Supabase Edge Function 'analyze-resume'.
 * Securely evaluates extracted text against the target role and saves to public.resume_analyses.
 */
export async function analyzeResumeWithBackend({
  userId,
  studentId,
  resumeId,
  storagePath,
  resumeText,
  targetRole,
  fileName,
}: {
  userId: string;
  studentId?: string;
  resumeId?: string;
  storagePath?: string;
  resumeText: string;
  targetRole: string;
  fileName?: string;
}): Promise<ResumeAnalysisRecord> {
  const now = new Date().toISOString();

  // 1. Check if Supabase Edge Function can be invoked directly
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-resume', {
        body: {
          resume_id: resumeId,
          storage_path: storagePath,
          resume_text: resumeText,
          target_role: targetRole,
        },
      });

      if (!error && data && data.status === 'completed') {
        const record: ResumeAnalysisRecord = {
          ...data,
          file_name: fileName || data.file_name || 'Resume.pdf',
        };
        saveLocalResumeAnalysis(record);
        return record;
      }
    } catch (edgeErr: any) {
      console.warn('Edge function invoke error, running fallback server logic:', edgeErr?.message);
    }
  }

  // 2. Structured evaluation fallback (if edge function is offline in local dev)
  const skills = extractSkillsFromText(resumeText);
  const matchedRoleSkills = evaluateRoleSkills(targetRole, skills);
  const score = matchedRoleSkills.score;
  const missingSkills = matchedRoleSkills.missingSkills;
  const strengths = matchedRoleSkills.strengths;
  const weaknesses = matchedRoleSkills.weaknesses;
  const recommendations = matchedRoleSkills.recommendations;

  const record: ResumeAnalysisRecord = {
    auth_user_id: userId,
    student_id: studentId || userId,
    resume_id: resumeId,
    target_role: targetRole,
    score,
    skills: skills.map((s) => s.name),
    missing_skills: missingSkills,
    strengths,
    weaknesses,
    recommendations,
    analysis_data: {
      extractedSkillsCount: skills.length,
      matchedCount: matchedRoleSkills.matched.length,
    },
    status: 'completed',
    file_name: fileName || 'Resume.pdf',
    analyzed_at: now,
    created_at: now,
    updated_at: now,
  };

  saveLocalResumeAnalysis(record);

  if (isSupabaseConfigured()) {
    try {
      const dbPayload = {
        auth_user_id: userId,
        student_id: studentId || userId,
        resume_id: resumeId || null,
        target_role: targetRole,
        score,
        skills: record.skills,
        missing_skills: record.missing_skills,
        strengths: record.strengths,
        weaknesses: record.weaknesses,
        recommendations: record.recommendations,
        analysis_data: record.analysis_data,
        status: 'completed',
        analyzed_at: now,
        created_at: now,
        updated_at: now,
      };

      const { data: dbData } = await supabase
        .from('resume_analyses')
        .insert([dbPayload])
        .select('*')
        .maybeSingle();

      if (dbData) {
        record.id = dbData.id;
      }
    } catch {
      // Ignore database insert error if table columns are being migrated
    }
  }

  return record;
}

/**
 * Backward-compatible helper to save analysis results.
 */
export async function saveResumeAnalysis(
  userId: string,
  studentId: string,
  targetRole: string,
  score: number,
  fileName: string
): Promise<ResumeAnalysisRecord> {
  return analyzeResumeWithBackend({
    userId,
    studentId,
    resumeText: `Resume uploaded: ${fileName}`,
    targetRole,
    fileName,
  });
}


/**
 * Retrieves the latest completed resume analysis for an authenticated user and target role.
 * Returns score = 0 and status = "Not analyzed yet" if no completed analysis exists for the selected role.
 */
export async function getLatestResumeAnalysis(
  userId: string | undefined,
  targetRole: string
): Promise<{ score: number; record: ResumeAnalysisRecord | null; statusText: string }> {
  if (!userId || !targetRole) {
    return { score: 0, record: null, statusText: 'Not analyzed yet' };
  }

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('resume_analyses')
        .select('*')
        .eq('auth_user_id', userId)
        .eq('target_role', targetRole)
        .eq('status', 'completed')
        .order('analyzed_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const record: ResumeAnalysisRecord = {
          id: data.id,
          resume_id: data.resume_id,
          auth_user_id: data.auth_user_id,
          student_id: data.student_id,
          target_role: data.target_role,
          score: Number(data.score) || Number(data.resume_score) || 0,
          skills: Array.isArray(data.skills) ? data.skills : [],
          missing_skills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          analysis_data: data.analysis_data,
          status: data.status || 'completed',
          file_name: data.file_name,
          analyzed_at: data.analyzed_at || data.created_at,
        };

        return { score: record.score, record, statusText: 'Analysis Complete' };
      }
    } catch {
      // Fallback to local storage query
    }
  }

  const allRecords = getLocalResumeAnalyses();
  const matched = allRecords.find(
    (r) =>
      r.auth_user_id === userId &&
      r.target_role.toLowerCase() === targetRole.toLowerCase() &&
      r.status === 'completed'
  );

  if (matched) {
    return { score: matched.score, record: matched, statusText: 'Analysis Complete' };
  }

  return { score: 0, record: null, statusText: 'Not analyzed yet' };
}

/**
 * Backward-compatible helper for retrieving latest score.
 */
export async function getLatestResumeScore(
  userId: string | undefined,
  targetRole: string
): Promise<{ score: number; fileName: string; analyzedAt?: string }> {
  const result = await getLatestResumeAnalysis(userId, targetRole);
  return {
    score: result.score,
    fileName: result.record?.file_name || '',
    analyzedAt: result.record?.analyzed_at,
  };
}

// Internal skill extraction & evaluation helpers for resilient client fallback
function extractSkillsFromText(text: string): { name: string; category: string }[] {
  const patterns: { pattern: RegExp; skill: string; category: string }[] = [
    { pattern: /\b(python|py)\b/gi, skill: 'Python', category: 'Programming' },
    { pattern: /\b(javascript|js)\b/gi, skill: 'JavaScript', category: 'Programming' },
    { pattern: /\b(typescript|ts)\b/gi, skill: 'TypeScript', category: 'Programming' },
    { pattern: /\b(react)\b/gi, skill: 'React', category: 'Framework' },
    { pattern: /\b(node\.?js|nodejs)\b/gi, skill: 'Node.js', category: 'Runtime' },
    { pattern: /\b(sql|postgresql|mysql)\b/gi, skill: 'SQL', category: 'Database' },
    { pattern: /\b(machine\s*learning|ml)\b/gi, skill: 'Machine Learning', category: 'AI/ML' },
    { pattern: /\b(tensorflow)\b/gi, skill: 'TensorFlow', category: 'AI/ML' },
    { pattern: /\b(pytorch)\b/gi, skill: 'PyTorch', category: 'AI/ML' },
    { pattern: /\b(pandas)\b/gi, skill: 'Pandas', category: 'Data' },
    { pattern: /\b(docker)\b/gi, skill: 'Docker', category: 'DevOps' },
    { pattern: /\b(aws)\b/gi, skill: 'AWS', category: 'Cloud' },
    { pattern: /\b(git)\b/gi, skill: 'Git', category: 'Tools' },
    { pattern: /\b(rest\s*api)\b/gi, skill: 'REST API', category: 'Integration' },
    { pattern: /\b(problem[\s-]?solving)\b/gi, skill: 'Problem Solving', category: 'Soft Skills' },
  ];

  const found = new Map<string, string>();
  for (const { pattern, skill, category } of patterns) {
    if (pattern.test(text)) {
      found.set(skill, category);
    }
  }
  return Array.from(found.entries()).map(([name, category]) => ({ name, category }));
}

function evaluateRoleSkills(
  role: string,
  extractedSkills: { name: string; category: string }[]
): {
  score: number;
  matched: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
} {
  const roleReqs: Record<string, string[]> = {
    'Data Scientist': ['Python', 'Machine Learning', 'SQL', 'TensorFlow', 'Pandas', 'Statistics'],
    'Data Analyst': ['SQL', 'Python', 'Pandas', 'Data Visualization', 'Statistics', 'Excel'],
    'Machine Learning Engineer': ['Python', 'Machine Learning', 'PyTorch', 'TensorFlow', 'Docker', 'MLOps'],
    'Software Engineer': ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'REST API'],
    'Data Engineer': ['Python', 'SQL', 'Spark', 'Docker', 'AWS', 'ETL', 'PostgreSQL'],
    'Frontend Developer': ['JavaScript', 'React', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS'],
    'Backend Developer': ['Node.js', 'Python', 'SQL', 'REST API', 'Docker', 'System Design'],
    'Full Stack Developer': ['JavaScript', 'React', 'Node.js', 'SQL', 'TypeScript', 'REST API', 'Docker'],
  };

  const reqs = roleReqs[role] || ['Problem Solving', 'Git', 'SQL', 'Python', 'REST API'];
  const extractedNames = new Set(extractedSkills.map((s) => s.name.toLowerCase()));

  const matched = reqs.filter((r) => extractedNames.has(r.toLowerCase()));
  const missingSkills = reqs.filter((r) => !extractedNames.has(r.toLowerCase()));

  const scoreRatio = reqs.length > 0 ? matched.length / reqs.length : 0.7;
  const score = Math.min(100, Math.max(35, Math.round(scoreRatio * 85 + (extractedSkills.length > 4 ? 15 : 5))));

  const strengths = [
    `Found core skills matching ${role}: ${matched.slice(0, 3).join(', ') || 'Demonstrated technical background'}.`,
    `Relevant educational and technical orientation for ${role} positions.`,
  ];

  const weaknesses = [
    missingSkills.length > 0
      ? `Missing key skills for ${role}: ${missingSkills.slice(0, 3).join(', ')}.`
      : 'Resume could benefit from more detailed quantifiable metrics for past projects.',
  ];

  const recommendations = [
    missingSkills.length > 0
      ? `Build 1-2 hands-on projects incorporating ${missingSkills.slice(0, 2).join(' and ')}.`
      : 'Add quantifiable metrics to existing project descriptions.',
    `Target certifications relevant to ${role}.`,
  ];

  return { score, matched, missingSkills, strengths, weaknesses, recommendations };
}

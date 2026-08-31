import { supabase, isSupabaseConfigured } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface ResumeRecord {
  id?: string;
  auth_user_id: string;
  student_id?: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  target_role: string;
  status: 'uploaded' | 'analyzed' | 'failed';
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

const LOCAL_STORAGE_RESUMES_KEY = 'placement_portal_uploaded_resumes';

function getLocalUploadedResumes(): ResumeRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_RESUMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUploadedResume(record: ResumeRecord) {
  try {
    const records = getLocalUploadedResumes();
    records.unshift(record);
    localStorage.setItem(LOCAL_STORAGE_RESUMES_KEY, JSON.stringify(records));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Validates file format and size limits (max 10MB; PDF, DOC, DOCX allowed).
 */
export function validateResumeFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Please select a resume file.' };
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB limit
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10 MB limit.' };
  }

  const validTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validExtensions = ['.pdf', '.doc', '.docx'];
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
    return { valid: false, error: 'Invalid file format. Only PDF, DOC, and DOCX files are allowed.' };
  }

  return { valid: true };
}

/**
 * Uploads resume file to Supabase Storage ('resumes' bucket) and records metadata in DB.
 */
export async function uploadResumeToSupabase(
  user: User,
  file: File,
  targetRole: string,
  studentId?: string
): Promise<ResumeRecord> {
  // 1. Validate file
  const validation = validateResumeFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.')) || '.pdf';
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const uniqueFileName = `resume_${timestamp}_${randomId}${ext}`;
  const storagePath = `${user.id}/${uniqueFileName}`;
  const now = new Date().toISOString();

  // Resolve student_id directly from public.students database table
  let resolvedStudentId = studentId;
  if (isSupabaseConfigured()) {
    try {
      const { data: studentData } = await supabase
        .from('students')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (studentData?.id) {
        resolvedStudentId = studentData.id;
      }
    } catch {
      // Fallback to provided studentId or user.id
    }
  }

  const record: ResumeRecord = {
    auth_user_id: user.id,
    student_id: resolvedStudentId || user.id,
    file_name: file.name,
    storage_path: storagePath,
    file_type: file.type || ext,
    file_size: file.size,
    target_role: targetRole || 'Software Engineer',
    status: 'uploaded',
    uploaded_at: now,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    // 2. Upload to Supabase Storage 'resumes' bucket
    const { error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // 3. Insert record into public.resumes table
    const insertPayload: Record<string, any> = {
      auth_user_id: user.id,
      file_name: file.name,
      storage_path: storagePath,
      file_type: file.type || ext,
      file_size: file.size,
      target_role: targetRole || 'Software Engineer',
      status: 'uploaded',
      uploaded_at: now,
      created_at: now,
      updated_at: now,
    };

    if (resolvedStudentId) {
      insertPayload.student_id = resolvedStudentId;
    }

    const { data: dbData, error: dbError } = await supabase
      .from('resumes')
      .insert([insertPayload])
      .select('*')
      .maybeSingle();

    if (dbError) {
      // Automatic rollback: Clean up storage object if DB insert fails
      await supabase.storage.from('resumes').remove([storagePath]);
      throw new Error(`Database record insert failed: ${dbError.message}`);
    }

    if (dbData) {
      record.id = dbData.id;
    }
  }

  // Save local cache record for fallback
  saveLocalUploadedResume(record);
  return record;
}

/**
 * Retrieves all uploaded resumes for the authenticated user.
 */
export async function getUserResumes(userId: string): Promise<ResumeRecord[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('auth_user_id', userId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        return data as ResumeRecord[];
      }
    } catch {
      // Fallback to local storage
    }
  }

  const localResumes = getLocalUploadedResumes();
  return localResumes.filter((r) => r.auth_user_id === userId);
}

import { supabase, isSupabaseConfigured } from './supabase';
import type { Student } from '../generated/models/student-model';
import type { User } from '@supabase/supabase-js';

const LOCAL_STORAGE_PROFILES_KEY = 'placement_portal_student_profiles';

export interface DBStudentRow {
  id: string;
  auth_user_id: string;
  student_id: string;
  full_name: string | null;
  email: string;
  roll_number: string | null;
  phone: string | null;
  department: string | null;
  year: string | null;
  cgpa: number | null;
  created_at?: string;
  updated_at?: string;
}

function getLocalProfiles(): Record<string, Student> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalProfile(userId: string, profile: Student) {
  try {
    const profiles = getLocalProfiles();
    profiles[userId] = profile;
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    // Ignore storage errors
  }
}

function mapDBRowToStudent(row: DBStudentRow, fallbackEmail: string): Student {
  return {
    id: row.id || row.auth_user_id,
    name1: row.full_name || fallbackEmail.split('@')[0] || 'Student',
    rollNumber: row.roll_number || '',
    email: fallbackEmail || row.email || '',
    departmentKey: (row.department as any) || 'DepartmentKey0',
    yearKey: (row.year as any) || 'YearKey3',
    cGPA: Number(row.cgpa) || 0.0,
    readinessScore: 0,
    roleKey: 'RoleKey0',
    phoneNumber: row.phone || '',
  };
}

/**
 * Retrieves existing student profile for an authenticated user,
 * or automatically creates a new profile record if none exists.
 */
export async function getOrCreateStudentProfile(user: User): Promise<Student> {
  const defaultName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'Student';

  const initialProfile: Student = {
    id: user.id,
    name1: defaultName,
    rollNumber: '',
    email: user.email || '',
    departmentKey: 'DepartmentKey0', // Computer Science
    yearKey: 'YearKey3', // 4th Year
    cGPA: 0.0,
    readinessScore: 0,
    roleKey: 'RoleKey0',
    phoneNumber: '',
  };

  if (!isSupabaseConfigured()) {
    const localProfiles = getLocalProfiles();
    if (!localProfiles[user.id]) {
      saveLocalProfile(user.id, initialProfile);
      return initialProfile;
    }
    return localProfiles[user.id];
  }

  try {
    // 1. Query Supabase students table for matching auth_user_id
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (data && !error) {
      return mapDBRowToStudent(data as DBStudentRow, user.email || data.email);
    }

    // 2. Insert new profile if not found (e.g. user created before DB trigger)
    const newRecord = {
      auth_user_id: user.id,
      student_id: 'STU-' + user.id.substring(0, 8).toUpperCase(),
      full_name: defaultName,
      email: user.email || '',
      roll_number: '',
      phone: '',
      department: 'DepartmentKey0',
      year: 'YearKey3',
      cgpa: 0.0,
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('students')
      .insert([newRecord])
      .select('*')
      .maybeSingle();

    if (!insertError && insertedData) {
      return mapDBRowToStudent(insertedData as DBStudentRow, user.email || insertedData.email);
    }
  } catch {
    // If table doesn't exist yet or network fails, fallback to local storage
  }

  // Fallback to local profile scoped by user.id
  const localProfiles = getLocalProfiles();
  if (!localProfiles[user.id]) {
    saveLocalProfile(user.id, initialProfile);
    return initialProfile;
  }
  return localProfiles[user.id];
}

/**
 * Updates an authenticated student's profile in Supabase.
 */
export async function updateStudentProfile(
  user: User,
  updates: Partial<Omit<Student, 'id' | 'email'>>
): Promise<Student> {
  const currentProfile = await getOrCreateStudentProfile(user);

  const updatedProfile: Student = {
    ...currentProfile,
    ...updates,
    email: user.email || currentProfile.email, // Email is strictly locked to auth user
  };

  // Save to local storage cache
  saveLocalProfile(user.id, updatedProfile);

  if (isSupabaseConfigured()) {
    try {
      const dbUpdates = {
        full_name: updatedProfile.name1,
        roll_number: updatedProfile.rollNumber,
        phone: updatedProfile.phoneNumber || '',
        department: updatedProfile.departmentKey,
        year: updatedProfile.yearKey,
        cgpa: updatedProfile.cGPA,
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from('students')
        .update(dbUpdates)
        .eq('auth_user_id', user.id);
    } catch {
      // Ignore Supabase update error if table doesn't exist yet
    }
  }

  return updatedProfile;
}

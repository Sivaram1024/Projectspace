import { z } from 'zod';

/**
 * Zod schema for Student validation
 */
export const StudentSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  cGPA: z.number(),
  departmentKey: z.enum(['DepartmentKey0', 'DepartmentKey1', 'DepartmentKey2', 'DepartmentKey3', 'DepartmentKey4', 'DepartmentKey5']),
  email: z.string().email().min(1, { message: "Email is required" }),
  profileImage: z.string().optional(),
  readinessScore: z.number().int().optional(),
  roleKey: z.enum(['RoleKey0', 'RoleKey1']),
  rollNumber: z.string().min(1, { message: "Roll Number is required" }),
  yearKey: z.enum(['YearKey0', 'YearKey1', 'YearKey2', 'YearKey3']),
  phoneNumber: z.string().optional(),
});

/**
 * Schema for creating a new Student (omits system-generated ID)
 */
export const CreateStudentSchema = StudentSchema.omit({ id: true });

/**
 * Schema for updating an existing Student
 */
export const UpdateStudentSchema = StudentSchema;

export type StudentInput = z.infer<typeof StudentSchema>;
export type CreateStudentInput = z.infer<typeof CreateStudentSchema>;
export type UpdateStudentInput = z.infer<typeof UpdateStudentSchema>;

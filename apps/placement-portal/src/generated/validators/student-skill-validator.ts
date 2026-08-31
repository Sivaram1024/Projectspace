import { z } from 'zod';

/**
 * Zod schema for StudentSkill validation
 */
export const StudentSkillSchema = z.object({
  id: z.string().uuid(),
  studentSkillName: z.string().min(1, { message: "Student Skill Name is required" }),
  proficiencyKey: z.enum(['ProficiencyKey0', 'ProficiencyKey1', 'ProficiencyKey2']),
  skill: z.object({ id: z.string().uuid(), name1: z.string() }),
  student: z.object({ id: z.string().uuid(), name1: z.string() }),
  verified: z.boolean(),
});

/**
 * Schema for creating a new StudentSkill (omits system-generated ID)
 */
export const CreateStudentSkillSchema = StudentSkillSchema.omit({ id: true });

/**
 * Schema for updating an existing StudentSkill
 */
export const UpdateStudentSkillSchema = StudentSkillSchema;

export type StudentSkillInput = z.infer<typeof StudentSkillSchema>;
export type CreateStudentSkillInput = z.infer<typeof CreateStudentSkillSchema>;
export type UpdateStudentSkillInput = z.infer<typeof UpdateStudentSkillSchema>;

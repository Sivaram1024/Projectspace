import { z } from 'zod';

/**
 * Zod schema for Skill validation
 */
export const SkillSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
  categoryKey: z.enum(['CategoryKey0', 'CategoryKey1', 'CategoryKey2', 'CategoryKey3', 'CategoryKey4', 'CategoryKey5', 'CategoryKey6']),
  demandWeight: z.number().int(),
  isTrending: z.boolean(),
});

/**
 * Schema for creating a new Skill (omits system-generated ID)
 */
export const CreateSkillSchema = SkillSchema.omit({ id: true });

/**
 * Schema for updating an existing Skill
 */
export const UpdateSkillSchema = SkillSchema;

export type SkillInput = z.infer<typeof SkillSchema>;
export type CreateSkillInput = z.infer<typeof CreateSkillSchema>;
export type UpdateSkillInput = z.infer<typeof UpdateSkillSchema>;

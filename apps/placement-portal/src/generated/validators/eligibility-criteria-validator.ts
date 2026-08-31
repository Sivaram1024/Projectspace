import { z } from 'zod';

/**
 * Zod schema for EligibilityCriteria validation
 */
export const EligibilityCriteriaSchema = z.object({
  id: z.string().uuid(),
  criteriaName: z.string().min(1, { message: "Criteria Name is required" }),
  allowedDepartments: z.string().min(1, { message: "Allowed Departments is required" }),
  allowedYears: z.string().min(1, { message: "Allowed Years is required" }),
  maximumBacklogs: z.number().int(),
  minimumCGPA: z.number(),
  placementDrive: z.object({ id: z.string().uuid(), companyName: z.string() }),
});

/**
 * Schema for creating a new EligibilityCriteria (omits system-generated ID)
 */
export const CreateEligibilityCriteriaSchema = EligibilityCriteriaSchema.omit({ id: true });

/**
 * Schema for updating an existing EligibilityCriteria
 */
export const UpdateEligibilityCriteriaSchema = EligibilityCriteriaSchema;

export type EligibilityCriteriaInput = z.infer<typeof EligibilityCriteriaSchema>;
export type CreateEligibilityCriteriaInput = z.infer<typeof CreateEligibilityCriteriaSchema>;
export type UpdateEligibilityCriteriaInput = z.infer<typeof UpdateEligibilityCriteriaSchema>;

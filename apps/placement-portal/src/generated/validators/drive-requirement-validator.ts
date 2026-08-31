import { z } from 'zod';

/**
 * Zod schema for DriveRequirement validation
 */
export const DriveRequirementSchema = z.object({
  id: z.string().uuid(),
  requirementName: z.string().min(1, { message: "Requirement Name is required" }),
  isMandatory: z.boolean(),
  minimumProficiencyKey: z.enum(['MinimumProficiencyKey0', 'MinimumProficiencyKey1', 'MinimumProficiencyKey2']),
  placementDrive: z.object({ id: z.string().uuid(), companyName: z.string() }),
  skill: z.object({ id: z.string().uuid(), name1: z.string() }),
});

/**
 * Schema for creating a new DriveRequirement (omits system-generated ID)
 */
export const CreateDriveRequirementSchema = DriveRequirementSchema.omit({ id: true });

/**
 * Schema for updating an existing DriveRequirement
 */
export const UpdateDriveRequirementSchema = DriveRequirementSchema;

export type DriveRequirementInput = z.infer<typeof DriveRequirementSchema>;
export type CreateDriveRequirementInput = z.infer<typeof CreateDriveRequirementSchema>;
export type UpdateDriveRequirementInput = z.infer<typeof UpdateDriveRequirementSchema>;

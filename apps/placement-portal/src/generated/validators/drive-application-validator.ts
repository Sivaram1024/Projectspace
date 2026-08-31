import { z } from 'zod';

/**
 * Zod schema for DriveApplication validation
 */
export const DriveApplicationSchema = z.object({
  id: z.string().uuid(),
  applicationName: z.string().min(1, { message: "Application Name is required" }),
  appliedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Applied At is required" }),
  placementDrive: z.object({ id: z.string().uuid(), companyName: z.string() }),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2', 'StatusKey3', 'StatusKey4', 'StatusKey5']),
  student: z.object({ id: z.string().uuid(), name1: z.string() }),
});

/**
 * Schema for creating a new DriveApplication (omits system-generated ID)
 */
export const CreateDriveApplicationSchema = DriveApplicationSchema.omit({ id: true });

/**
 * Schema for updating an existing DriveApplication
 */
export const UpdateDriveApplicationSchema = DriveApplicationSchema;

export type DriveApplicationInput = z.infer<typeof DriveApplicationSchema>;
export type CreateDriveApplicationInput = z.infer<typeof CreateDriveApplicationSchema>;
export type UpdateDriveApplicationInput = z.infer<typeof UpdateDriveApplicationSchema>;

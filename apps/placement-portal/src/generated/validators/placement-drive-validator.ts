import { z } from 'zod';

/**
 * Zod schema for PlacementDrive validation
 */
export const PlacementDriveSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1, { message: "Company Name is required" }),
  applicationDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Application Deadline is required" }),
  companyLogo: z.string().optional(),
  description: z.string().optional(),
  driveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Drive Date is required" }),
  jobRole: z.string().min(1, { message: "Job Role is required" }),
  location: z.string().min(1, { message: "Location is required" }),
  openings: z.number().int(),
  packageLPA: z.number(),
  statusKey: z.enum(['StatusKey0', 'StatusKey1', 'StatusKey2', 'StatusKey3']),
});

/**
 * Schema for creating a new PlacementDrive (omits system-generated ID)
 */
export const CreatePlacementDriveSchema = PlacementDriveSchema.omit({ id: true });

/**
 * Schema for updating an existing PlacementDrive
 */
export const UpdatePlacementDriveSchema = PlacementDriveSchema;

export type PlacementDriveInput = z.infer<typeof PlacementDriveSchema>;
export type CreatePlacementDriveInput = z.infer<typeof CreatePlacementDriveSchema>;
export type UpdatePlacementDriveInput = z.infer<typeof UpdatePlacementDriveSchema>;

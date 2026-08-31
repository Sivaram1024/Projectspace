import { z } from 'zod';

/**
 * Zod schema for Notification validation
 */
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, { message: "Title is required" }),
  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").min(1, { message: "Created At is required" }),
  isRead: z.boolean(),
  message: z.string().min(1, { message: "Message is required" }),
  notificationTypeKey: z.enum(['NotificationTypeKey0', 'NotificationTypeKey1', 'NotificationTypeKey2', 'NotificationTypeKey3', 'NotificationTypeKey4']),
  student: z.object({ id: z.string().uuid(), name1: z.string() }).optional(),
  targetAudienceKey: z.enum(['TargetAudienceKey0', 'TargetAudienceKey1', 'TargetAudienceKey2', 'TargetAudienceKey3']),
});

/**
 * Schema for creating a new Notification (omits system-generated ID)
 */
export const CreateNotificationSchema = NotificationSchema.omit({ id: true });

/**
 * Schema for updating an existing Notification
 */
export const UpdateNotificationSchema = NotificationSchema;

export type NotificationInput = z.infer<typeof NotificationSchema>;
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof UpdateNotificationSchema>;

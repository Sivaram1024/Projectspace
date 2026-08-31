import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationService } from "../services/notification-service";
import type { Notification } from "../models/notification-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Notification records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, title, createdAt, isRead, message, notificationTypeKey, targetAudienceKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useNotificationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["notification-list", options],
    queryFn: () => NotificationService.getAll(options),
  });
}

/**
 * Retrieve a single Notification record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useNotification(id: string) {
  return useQuery({
    queryKey: ["notification", id],
    queryFn: () => NotificationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Notification record.
 * @remarks Form validation: use CreateNotificationSchema with zodResolver for type-safe create forms
 */
export function useCreateNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Notification, "id">) => NotificationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["notification-list"] });
    },
  });
}

/**
 * Update an existing Notification record.
 * @remarks Form validation: use UpdateNotificationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Notification, "id">>;
    }) => NotificationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["notification-list"] });
      client.invalidateQueries({ queryKey: ["notification", variables.id] });
    },
  });
}

/**
 * Delete a Notification record by its unique identifier.
 */
export function useDeleteNotification() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => NotificationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["notification-list"] });
      client.invalidateQueries({ queryKey: ["notification", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Notification_DATA_SOURCE_TYPE = 'InMemory' as const;

export { NotificationSchema, CreateNotificationSchema, UpdateNotificationSchema } from "../validators/notification-validator";
export type { NotificationInput, CreateNotificationInput, UpdateNotificationInput } from "../validators/notification-validator";

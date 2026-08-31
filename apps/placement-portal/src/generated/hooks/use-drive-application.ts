import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DriveApplicationService } from "../services/drive-application-service";
import type { DriveApplication } from "../models/drive-application-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all DriveApplication records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, applicationName, appliedAt, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useDriveApplicationList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["driveApplication-list", options],
    queryFn: () => DriveApplicationService.getAll(options),
  });
}

/**
 * Retrieve a single DriveApplication record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useDriveApplication(id: string) {
  return useQuery({
    queryKey: ["driveApplication", id],
    queryFn: () => DriveApplicationService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new DriveApplication record.
 * @remarks Form validation: use CreateDriveApplicationSchema with zodResolver for type-safe create forms
 */
export function useCreateDriveApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DriveApplication, "id">) => DriveApplicationService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["driveApplication-list"] });
    },
  });
}

/**
 * Update an existing DriveApplication record.
 * @remarks Form validation: use UpdateDriveApplicationSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateDriveApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<DriveApplication, "id">>;
    }) => DriveApplicationService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["driveApplication-list"] });
      client.invalidateQueries({ queryKey: ["driveApplication", variables.id] });
    },
  });
}

/**
 * Delete a DriveApplication record by its unique identifier.
 */
export function useDeleteDriveApplication() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DriveApplicationService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["driveApplication-list"] });
      client.invalidateQueries({ queryKey: ["driveApplication", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const DriveApplication_DATA_SOURCE_TYPE = 'InMemory' as const;

export { DriveApplicationSchema, CreateDriveApplicationSchema, UpdateDriveApplicationSchema } from "../validators/drive-application-validator";
export type { DriveApplicationInput, CreateDriveApplicationInput, UpdateDriveApplicationInput } from "../validators/drive-application-validator";

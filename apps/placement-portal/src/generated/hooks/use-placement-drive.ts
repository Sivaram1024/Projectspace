import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PlacementDriveService } from "../services/placement-drive-service";
import type { PlacementDrive } from "../models/placement-drive-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all PlacementDrive records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, companyName, applicationDeadline, companyLogo, description, driveDate, jobRole, location, openings, packageLPA, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function usePlacementDriveList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["placementDrive-list", options],
    queryFn: () => PlacementDriveService.getAll(options),
  });
}

/**
 * Retrieve a single PlacementDrive record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function usePlacementDrive(id: string) {
  return useQuery({
    queryKey: ["placementDrive", id],
    queryFn: () => PlacementDriveService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new PlacementDrive record.
 * @remarks Form validation: use CreatePlacementDriveSchema with zodResolver for type-safe create forms
 */
export function useCreatePlacementDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PlacementDrive, "id">) => PlacementDriveService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["placementDrive-list"] });
    },
  });
}

/**
 * Update an existing PlacementDrive record.
 * @remarks Form validation: use UpdatePlacementDriveSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdatePlacementDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<PlacementDrive, "id">>;
    }) => PlacementDriveService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["placementDrive-list"] });
      client.invalidateQueries({ queryKey: ["placementDrive", variables.id] });
    },
  });
}

/**
 * Delete a PlacementDrive record by its unique identifier.
 */
export function useDeletePlacementDrive() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PlacementDriveService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["placementDrive-list"] });
      client.invalidateQueries({ queryKey: ["placementDrive", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const PlacementDrive_DATA_SOURCE_TYPE = 'InMemory' as const;

export { PlacementDriveSchema, CreatePlacementDriveSchema, UpdatePlacementDriveSchema } from "../validators/placement-drive-validator";
export type { PlacementDriveInput, CreatePlacementDriveInput, UpdatePlacementDriveInput } from "../validators/placement-drive-validator";

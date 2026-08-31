import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DriveRequirementService } from "../services/drive-requirement-service";
import type { DriveRequirement } from "../models/drive-requirement-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all DriveRequirement records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, requirementName, isMandatory, minimumProficiencyKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useDriveRequirementList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["driveRequirement-list", options],
    queryFn: () => DriveRequirementService.getAll(options),
  });
}

/**
 * Retrieve a single DriveRequirement record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useDriveRequirement(id: string) {
  return useQuery({
    queryKey: ["driveRequirement", id],
    queryFn: () => DriveRequirementService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new DriveRequirement record.
 * @remarks Form validation: use CreateDriveRequirementSchema with zodResolver for type-safe create forms
 */
export function useCreateDriveRequirement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DriveRequirement, "id">) => DriveRequirementService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["driveRequirement-list"] });
    },
  });
}

/**
 * Update an existing DriveRequirement record.
 * @remarks Form validation: use UpdateDriveRequirementSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateDriveRequirement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<DriveRequirement, "id">>;
    }) => DriveRequirementService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["driveRequirement-list"] });
      client.invalidateQueries({ queryKey: ["driveRequirement", variables.id] });
    },
  });
}

/**
 * Delete a DriveRequirement record by its unique identifier.
 */
export function useDeleteDriveRequirement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => DriveRequirementService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["driveRequirement-list"] });
      client.invalidateQueries({ queryKey: ["driveRequirement", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const DriveRequirement_DATA_SOURCE_TYPE = 'InMemory' as const;

export { DriveRequirementSchema, CreateDriveRequirementSchema, UpdateDriveRequirementSchema } from "../validators/drive-requirement-validator";
export type { DriveRequirementInput, CreateDriveRequirementInput, UpdateDriveRequirementInput } from "../validators/drive-requirement-validator";

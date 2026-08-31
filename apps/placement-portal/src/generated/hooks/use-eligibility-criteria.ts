import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EligibilityCriteriaService } from "../services/eligibility-criteria-service";
import type { EligibilityCriteria } from "../models/eligibility-criteria-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all EligibilityCriteria records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, criteriaName, allowedDepartments, allowedYears, maximumBacklogs, minimumCGPA
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useEligibilityCriteriaList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["eligibilityCriteria-list", options],
    queryFn: () => EligibilityCriteriaService.getAll(options),
  });
}

/**
 * Retrieve a single EligibilityCriteria record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useEligibilityCriteria(id: string) {
  return useQuery({
    queryKey: ["eligibilityCriteria", id],
    queryFn: () => EligibilityCriteriaService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new EligibilityCriteria record.
 * @remarks Form validation: use CreateEligibilityCriteriaSchema with zodResolver for type-safe create forms
 */
export function useCreateEligibilityCriteria() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<EligibilityCriteria, "id">) => EligibilityCriteriaService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["eligibilityCriteria-list"] });
    },
  });
}

/**
 * Update an existing EligibilityCriteria record.
 * @remarks Form validation: use UpdateEligibilityCriteriaSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateEligibilityCriteria() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<EligibilityCriteria, "id">>;
    }) => EligibilityCriteriaService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["eligibilityCriteria-list"] });
      client.invalidateQueries({ queryKey: ["eligibilityCriteria", variables.id] });
    },
  });
}

/**
 * Delete a EligibilityCriteria record by its unique identifier.
 */
export function useDeleteEligibilityCriteria() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => EligibilityCriteriaService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["eligibilityCriteria-list"] });
      client.invalidateQueries({ queryKey: ["eligibilityCriteria", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const EligibilityCriteria_DATA_SOURCE_TYPE = 'InMemory' as const;

export { EligibilityCriteriaSchema, CreateEligibilityCriteriaSchema, UpdateEligibilityCriteriaSchema } from "../validators/eligibility-criteria-validator";
export type { EligibilityCriteriaInput, CreateEligibilityCriteriaInput, UpdateEligibilityCriteriaInput } from "../validators/eligibility-criteria-validator";

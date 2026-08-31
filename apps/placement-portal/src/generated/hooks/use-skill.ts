import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SkillService } from "../services/skill-service";
import type { Skill } from "../models/skill-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Skill records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1, categoryKey, demandWeight, isTrending
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useSkillList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["skill-list", options],
    queryFn: () => SkillService.getAll(options),
  });
}

/**
 * Retrieve a single Skill record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useSkill(id: string) {
  return useQuery({
    queryKey: ["skill", id],
    queryFn: () => SkillService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Skill record.
 * @remarks Form validation: use CreateSkillSchema with zodResolver for type-safe create forms
 */
export function useCreateSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Skill, "id">) => SkillService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["skill-list"] });
    },
  });
}

/**
 * Update an existing Skill record.
 * @remarks Form validation: use UpdateSkillSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Skill, "id">>;
    }) => SkillService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["skill-list"] });
      client.invalidateQueries({ queryKey: ["skill", variables.id] });
    },
  });
}

/**
 * Delete a Skill record by its unique identifier.
 */
export function useDeleteSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SkillService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["skill-list"] });
      client.invalidateQueries({ queryKey: ["skill", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Skill_DATA_SOURCE_TYPE = 'InMemory' as const;

export { SkillSchema, CreateSkillSchema, UpdateSkillSchema } from "../validators/skill-validator";
export type { SkillInput, CreateSkillInput, UpdateSkillInput } from "../validators/skill-validator";

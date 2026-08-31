import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StudentSkillService } from "../services/student-skill-service";
import type { StudentSkill } from "../models/student-skill-model";
import type { IOperationOptions } from '@microsoft/power-apps/data';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all StudentSkill records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, studentSkillName, proficiencyKey, verified
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useStudentSkillList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["studentSkill-list", options],
    queryFn: () => StudentSkillService.getAll(options),
  });
}

/**
 * Retrieve a single StudentSkill record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useStudentSkill(id: string) {
  return useQuery({
    queryKey: ["studentSkill", id],
    queryFn: () => StudentSkillService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new StudentSkill record.
 * @remarks Form validation: use CreateStudentSkillSchema with zodResolver for type-safe create forms
 */
export function useCreateStudentSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<StudentSkill, "id">) => StudentSkillService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["studentSkill-list"] });
    },
  });
}

/**
 * Update an existing StudentSkill record.
 * @remarks Form validation: use UpdateStudentSkillSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateStudentSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<StudentSkill, "id">>;
    }) => StudentSkillService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["studentSkill-list"] });
      client.invalidateQueries({ queryKey: ["studentSkill", variables.id] });
    },
  });
}

/**
 * Delete a StudentSkill record by its unique identifier.
 */
export function useDeleteStudentSkill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => StudentSkillService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["studentSkill-list"] });
      client.invalidateQueries({ queryKey: ["studentSkill", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const StudentSkill_DATA_SOURCE_TYPE = 'InMemory' as const;

export { StudentSkillSchema, CreateStudentSkillSchema, UpdateStudentSkillSchema } from "../validators/student-skill-validator";
export type { StudentSkillInput, CreateStudentSkillInput, UpdateStudentSkillInput } from "../validators/student-skill-validator";

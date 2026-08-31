import { getClient } from '@microsoft/power-apps/data';
import type { DriveRequirement } from '../models/drive-requirement-model';
import type { IOperationOptions } from '@microsoft/power-apps/data';

const DATA_SOURCE_NAME = 'DriveRequirement';

export class DriveRequirementService {
  static async create(record: Omit<DriveRequirement, 'id'>): Promise<DriveRequirement> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as DriveRequirement;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<DriveRequirement, 'id'>>
  ): Promise<DriveRequirement> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as DriveRequirement;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<DriveRequirement> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as DriveRequirement;
  }

  static async getAll(options?: IOperationOptions): Promise<DriveRequirement[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as DriveRequirement[];
  }
}

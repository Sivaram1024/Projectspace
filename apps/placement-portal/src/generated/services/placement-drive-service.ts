import { getClient } from '@microsoft/power-apps/data';
import type { PlacementDrive } from '../models/placement-drive-model';
import type { IOperationOptions } from '@microsoft/power-apps/data';

const DATA_SOURCE_NAME = 'PlacementDrive';

export class PlacementDriveService {
  static async create(record: Omit<PlacementDrive, 'id'>): Promise<PlacementDrive> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as PlacementDrive;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<PlacementDrive, 'id'>>
  ): Promise<PlacementDrive> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as PlacementDrive;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<PlacementDrive> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as PlacementDrive;
  }

  static async getAll(options?: IOperationOptions): Promise<PlacementDrive[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as PlacementDrive[];
  }
}

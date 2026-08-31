import { getClient } from '@microsoft/power-apps/data';
import type { DriveApplication } from '../models/drive-application-model';
import type { IOperationOptions } from '@microsoft/power-apps/data';

const DATA_SOURCE_NAME = 'DriveApplication';

export class DriveApplicationService {
  static async create(record: Omit<DriveApplication, 'id'>): Promise<DriveApplication> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as DriveApplication;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<DriveApplication, 'id'>>
  ): Promise<DriveApplication> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as DriveApplication;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<DriveApplication> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as DriveApplication;
  }

  static async getAll(options?: IOperationOptions): Promise<DriveApplication[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as DriveApplication[];
  }
}

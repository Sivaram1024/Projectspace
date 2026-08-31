import { getClient } from '@microsoft/power-apps/data';
import type { Notification } from '../models/notification-model';
import type { IOperationOptions } from '@microsoft/power-apps/data';

const DATA_SOURCE_NAME = 'Notification';

export class NotificationService {
  static async create(record: Omit<Notification, 'id'>): Promise<Notification> {
    const result = await getClient().createRecordAsync(DATA_SOURCE_NAME, record);
    if (!result.success) throw result.error;
    return result.data as Notification;
  }

  static async update(
    id: string,
    changedFields: Partial<Omit<Notification, 'id'>>
  ): Promise<Notification> {
    const result = await getClient().updateRecordAsync(DATA_SOURCE_NAME, id, changedFields);
    if (!result.success) throw result.error;
    return result.data as Notification;
  }

  static async delete(id: string): Promise<void> {
    const result = await getClient().deleteRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
  }

  static async get(id: string): Promise<Notification> {
    const result = await getClient().retrieveRecordAsync(DATA_SOURCE_NAME, id);
    if (!result.success) throw result.error;
    return result.data as Notification;
  }

  static async getAll(options?: IOperationOptions): Promise<Notification[]> {
    const result = await getClient().retrieveMultipleRecordsAsync(DATA_SOURCE_NAME, options);
    if (!result.success) throw result.error;
    return result.data as Notification[];
  }
}

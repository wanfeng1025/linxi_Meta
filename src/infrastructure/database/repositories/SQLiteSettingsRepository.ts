import type { SettingsRepository } from '@/application/repositories';

import type { SqlDatabase } from '../types';

interface SettingRow {
  readonly setting_value: string;
}

export class SQLiteSettingsRepository implements SettingsRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async get(key: string): Promise<string | null> {
    const row = await this.database.getFirst<SettingRow>(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [key],
    );
    return row?.setting_value ?? null;
  }

  public async set(key: string, value: string, updatedAt: string): Promise<void> {
    await this.database.run(
      `INSERT INTO settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at`,
      [key, value, updatedAt],
    );
  }
}

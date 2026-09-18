export interface SettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, updatedAt: string): Promise<void>;
}

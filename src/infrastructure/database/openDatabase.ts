import { openDatabaseAsync } from 'expo-sqlite';

import productionDataset from '../../../data/source/content-dataset.json';
import { ContentImporter } from './content';
import { ExpoSha256Provider } from './ExpoSha256Provider';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase';
import { hashLegacyProfessionalRuleQuarantine } from './legacyProfessionalRuleQuarantine';
import { migrations, runMigrations } from './migrations';
import type { SqlDatabase } from './types';

export interface OpenApplicationDatabaseOptions {
  readonly databaseName?: string;
  readonly appVersion: string;
  readonly migrationTimestamp: string;
}

export async function configureDatabase(database: SqlDatabase): Promise<void> {
  await database.exec('PRAGMA foreign_keys = ON');
  await database.exec('PRAGMA journal_mode = WAL');
  await database.exec('PRAGMA busy_timeout = 5000');
}

export async function openApplicationDatabase(
  options: OpenApplicationDatabaseOptions,
): Promise<SqlDatabase> {
  const nativeDatabase = await openDatabaseAsync(options.databaseName ?? 'liuyao.db');
  const database = new ExpoSqliteDatabase(nativeDatabase);
  const hashProvider = new ExpoSha256Provider();
  await configureDatabase(database);
  await runMigrations(database, {
    appVersion: options.appVersion,
    appliedAt: options.migrationTimestamp,
    hashProvider,
    migrations,
  });
  await hashLegacyProfessionalRuleQuarantine(database, hashProvider);
  await new ContentImporter(database, hashProvider).import(productionDataset, {
    environment: 'production',
    importedAt: options.migrationTimestamp,
    sourceFile: 'data/source/content-dataset.json',
  });
  return database;
}

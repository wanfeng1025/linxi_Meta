import { canonicalJson } from '@/shared/data/canonical-json';

import type { HashProvider, SqlDatabase } from '../types';
import type { Migration } from './types';

interface MigrationRow {
  readonly version: number;
  readonly name: string;
  readonly kind: 'structure' | 'data';
  readonly checksum: string;
}

interface TableExistsRow {
  readonly table_count: number;
}

export class MigrationError extends Error {
  public constructor(
    public readonly code:
      | 'INVALID_MIGRATION_ORDER'
      | 'MIGRATION_GAP'
      | 'MIGRATION_CHECKSUM_MISMATCH'
      | 'MIGRATION_METADATA_MISMATCH',
    message: string,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

export interface RunMigrationsOptions {
  readonly appVersion: string;
  readonly appliedAt: string;
  readonly hashProvider: HashProvider;
  readonly migrations: readonly Migration[];
}

function validateMigrationOrder(migrations: readonly Migration[]): void {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new MigrationError(
        'INVALID_MIGRATION_ORDER',
        `Migration versions must be consecutive from 1; found ${migration.version} at index ${index}.`,
      );
    }
  });
}

async function schemaMigrationsExists(database: SqlDatabase): Promise<boolean> {
  const row = await database.getFirst<TableExistsRow>(
    `SELECT COUNT(*) AS table_count
     FROM sqlite_master
     WHERE type = 'table' AND name = 'schema_migrations'`,
  );
  return row?.table_count === 1;
}

export async function runMigrations(
  database: SqlDatabase,
  options: RunMigrationsOptions,
): Promise<void> {
  validateMigrationOrder(options.migrations);
  const tableExists = await schemaMigrationsExists(database);
  const applied = tableExists
    ? await database.getAll<MigrationRow>(
        'SELECT version, name, kind, checksum FROM schema_migrations ORDER BY version',
      )
    : [];
  const appliedByVersion = new Map(applied.map((row) => [row.version, row]));

  for (const migration of options.migrations) {
    const checksum = await options.hashProvider.sha256(
      canonicalJson({
        version: migration.version,
        name: migration.name,
        kind: migration.kind,
        statements: migration.statements,
      }),
    );
    const existing = appliedByVersion.get(migration.version);
    if (existing !== undefined) {
      if (existing.name !== migration.name || existing.kind !== migration.kind) {
        throw new MigrationError(
          'MIGRATION_METADATA_MISMATCH',
          `Applied migration ${migration.version} metadata no longer matches its source.`,
        );
      }
      if (existing.checksum !== checksum) {
        throw new MigrationError(
          'MIGRATION_CHECKSUM_MISMATCH',
          `Applied migration ${migration.version} checksum no longer matches its source.`,
        );
      }
      continue;
    }

    if (applied.some((row) => row.version > migration.version)) {
      throw new MigrationError(
        'MIGRATION_GAP',
        `Migration ${migration.version} is missing before an already-applied migration.`,
      );
    }

    await database.transaction(async (transaction) => {
      for (const statement of migration.statements) {
        await transaction.exec(statement);
      }
      await transaction.run(
        `INSERT INTO schema_migrations
          (version, name, kind, checksum, applied_at, app_version)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          migration.version,
          migration.name,
          migration.kind,
          checksum,
          options.appliedAt,
          options.appVersion,
        ],
      );
    });
  }
}

import type { Migration } from './types';

export const migration001: Migration = {
  version: 1,
  name: 'create-schema-migrations',
  kind: 'structure',
  statements: [
    `CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('structure', 'data')),
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL,
      app_version TEXT NOT NULL
    )`,
  ],
};

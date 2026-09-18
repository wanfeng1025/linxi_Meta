import { describe, expect, it } from 'vitest';

import { ContentImporter } from '../../src/infrastructure/database/content';
import {
  DEVELOPMENT_REBUILD_CONFIRMATION,
  rebuildDevelopmentDatabase,
} from '../../src/infrastructure/database/development';
import { migration001 } from '../../src/infrastructure/database/migrations/001_create_schema_migrations';
import { migration002 } from '../../src/infrastructure/database/migrations/002_create_content_schema';
import { migration003 } from '../../src/infrastructure/database/migrations/003_create_history_schema';
import { migration004 } from '../../src/infrastructure/database/migrations/004_create_indexes';
import { migration005 } from '../../src/infrastructure/database/migrations/005_expand_auditable_content_model';
import { hashLegacyProfessionalRuleQuarantine } from '../../src/infrastructure/database/legacyProfessionalRuleQuarantine';
import {
  migrations,
  runMigrations,
  type Migration,
} from '../../src/infrastructure/database/migrations';
import { createCompleteFixtureDataset } from '../fixtures/content-dataset.fixture';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

const hashProvider = new NodeSha256Provider();
const appliedAt = '2026-07-20T00:00:00.000Z';

async function apply(
  database: NodeSqliteDatabase,
  selected: readonly Migration[] = migrations,
): Promise<void> {
  await runMigrations(database, {
    appVersion: 'test-app-v1',
    appliedAt,
    hashProvider,
    migrations: selected,
  });
}

describe('database migrations', () => {
  it('upgrades an empty database to the latest schema', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database);
      const rows = await database.getAll<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version',
      );
      const requiredTables = await database.getAll<{ name: string }>(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN
           ('data_sources', 'content_versions', 'trigrams', 'hexagrams', 'hexagram_lines',
            'special_line_texts', 'palace_hexagrams', 'najia_assignments',
            'six_relative_rules', 'six_spirit_rules', 'branch_relations',
            'question_categories', 'interpretation_templates', 'rule_definitions',
            'divination_sessions', 'cast_lines', 'analysis_snapshots', 'schema_migrations',
            'content_record_audit', 'content_texts', 'content_terms', 'earthly_branches',
            'six_spirits', 'branch_relation_members', 'content_import_reports')`,
      );

      expect(rows.map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(requiredTables).toHaveLength(25);
      const quarantineTables = await database.getAll<{ name: string }>(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN
           ('legacy_professional_rule_quarantine', 'legacy_migration_reviews')`,
      );
      expect(quarantineTables).toHaveLength(2);
      const candidateStagingTables = await database.getAll<{ name: string }>(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN
           ('professional_candidate_packages', 'professional_candidate_sources',
            'professional_candidate_review_signoffs', 'professional_candidate_diffs',
            'professional_calendar_policies', 'professional_calendar_boundaries',
            'professional_candidate_gold_cases', 'professional_chart_snapshots')`,
      );
      expect(candidateStagingTables).toHaveLength(8);
    } finally {
      await database.close();
    }
  });

  it('upgrades a previous schema and preserves imported content and settings', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database, [migration001, migration002, migration003, migration004]);
      await database.run(
        `INSERT INTO content_versions
          (content_version, schema_version, status, completeness_mode, source_file,
           payload_hash, record_count, created_at, imported_at, notes)
         VALUES ('legacy-content-v1', 'legacy-schema-v1', 'verified', 'partial',
                 'legacy-seed', 'legacy-payload-hash', 3, ?, ?, 'legacy data')`,
        [appliedAt, appliedAt],
      );
      await database.run(
        `INSERT INTO data_sources
          (source_id, source_version, title, edition, locator, source_type, license_status,
           status, verified_by, verified_at, notes, metadata_hash)
         VALUES ('legacy-source', 'legacy-source-v1', 'Legacy source', NULL, 'legacy-test',
                 'authorized-dataset', 'cleared', 'verified', 'legacy-reviewer', ?,
                 'migration preservation fixture', 'legacy-source-hash')`,
        [appliedAt],
      );
      await database.run(
        `INSERT INTO trigrams
          (trigram_id, content_version, source_id, source_version, status, name, symbol,
           code, line_1, line_2, line_3, classical_text, modern_text)
         VALUES ('legacy-trigram', 'legacy-content-v1', 'legacy-source', 'legacy-source-v1',
                 'verified', 'Legacy trigram', 'legacy-symbol', '000', 0, 0, 0, NULL, NULL)`,
      );
      await database.run(
        `INSERT INTO hexagrams
          (hexagram_id, content_version, source_id, source_version, status, king_wen_sequence,
           name, upper_trigram_id, lower_trigram_id, code, classical_text, modern_text)
         VALUES ('legacy-hexagram', 'legacy-content-v1', 'legacy-source', 'legacy-source-v1',
                 'verified', 1, 'Legacy hexagram', 'legacy-trigram', 'legacy-trigram',
                 '000000', NULL, NULL)`,
      );
      await database.run(
        `INSERT INTO question_categories
          (category_id, content_version, source_id, source_version, status, label, description)
         VALUES ('legacy-category', 'legacy-content-v1', 'legacy-source', 'legacy-source-v1',
                 'verified', 'Legacy category', NULL)`,
      );
      await database.run(
        'INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)',
        ['theme', 'dark', appliedAt],
      );
      await database.run(
        `INSERT INTO divination_sessions
          (session_id, question, category_id, cast_at, timezone, input_schema_version,
           divination_ruleset_version, interpretation_ruleset_version,
           random_algorithm_version, content_version, primary_hexagram_id,
           changed_hexagram_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'upgrade-history',
          null,
          'legacy-category',
          appliedAt,
          'Asia/Shanghai',
          'input-v1',
          'divination-v1',
          'interpretation-v1',
          'random-v1',
          'legacy-content-v1',
          'legacy-hexagram',
          'legacy-hexagram',
          appliedAt,
        ],
      );
      for (const position of [1, 2, 3, 4, 5, 6]) {
        await database.run(
          `INSERT INTO cast_lines
            (session_id, line_position, coin_1, coin_2, coin_3, line_value,
             primary_bit, changed_bit, is_moving)
           VALUES (?, ?, 3, 3, 2, 8, 0, 0, 0)`,
          ['upgrade-history', position],
        );
      }
      await database.run(
        `INSERT INTO analysis_snapshots
          (snapshot_id, session_id, schema_version, ruleset_version, content_version,
           payload_json, payload_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'upgrade-snapshot',
          'upgrade-history',
          'analysis-v1',
          'interpretation-v1',
          'legacy-content-v1',
          '{"fixture":true}',
          'fixture-hash',
          appliedAt,
        ],
      );

      await apply(database);

      const version = await database.getFirst<{ record_count: number }>(
        'SELECT record_count FROM content_versions WHERE content_version = ?',
        ['legacy-content-v1'],
      );
      const setting = await database.getFirst<{ setting_value: string }>(
        'SELECT setting_value FROM settings WHERE setting_key = ?',
        ['theme'],
      );
      const historyLines = await database.getFirst<{ count: number }>(
        `SELECT COUNT(*) AS count FROM cast_lines WHERE session_id = 'upgrade-history'`,
      );
      const snapshot = await database.getFirst<{ payload_json: string }>(
        `SELECT payload_json FROM analysis_snapshots WHERE snapshot_id = 'upgrade-snapshot'`,
      );
      expect(version?.record_count).toBe(3);
      expect(setting?.setting_value).toBe('dark');
      expect(historyLines?.count).toBe(6);
      expect(snapshot?.payload_json).toBe('{"fixture":true}');
    } finally {
      await database.close();
    }
  });

  it('is idempotent across repeated startup', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database);
      await apply(database);
      const count = await database.getFirst<{ count: number }>(
        'SELECT COUNT(*) AS count FROM schema_migrations',
      );
      expect(count?.count).toBe(7);
    } finally {
      await database.close();
    }
  });

  it('quarantines an ambiguous legacy polarity row without guessing its scope', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database, [migration001, migration002, migration003, migration004, migration005]);
      await new ContentImporter(database, hashProvider).import(createCompleteFixtureDataset(), {
        environment: 'fixture',
        importedAt: appliedAt,
        sourceFile: 'synthetic-fixture',
      });
      const row = await database.getFirst<{ najia_assignment_id: string; content_version: string }>(
        'SELECT najia_assignment_id, content_version FROM najia_assignments LIMIT 1',
      );
      await database.run(
        'UPDATE najia_assignments SET scope = NULL WHERE najia_assignment_id = ? AND content_version = ?',
        [row?.najia_assignment_id ?? '', row?.content_version ?? ''],
      );

      await apply(database);
      await hashLegacyProfessionalRuleQuarantine(database, hashProvider);
      const quarantine = await database.getFirst<{
        migration_status: string;
        row_sha256: string | null;
      }>('SELECT migration_status, row_sha256 FROM legacy_professional_rule_quarantine LIMIT 1');
      const retained = await database.getFirst<{ scope: string | null }>(
        'SELECT scope FROM najia_assignments WHERE najia_assignment_id = ? AND content_version = ?',
        [row?.najia_assignment_id ?? '', row?.content_version ?? ''],
      );

      expect(quarantine?.migration_status).toBe('MANUAL_REVIEW_REQUIRED');
      expect(quarantine?.row_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(retained?.scope).toBeNull();
    } finally {
      await database.close();
    }
  });

  it('rolls back a migration that fails midway', async () => {
    const database = new NodeSqliteDatabase();
    const faultyMigration: Migration = {
      version: 2,
      name: 'faulty-test-migration',
      kind: 'structure',
      statements: [
        'CREATE TABLE rollback_probe (id INTEGER PRIMARY KEY)',
        'INSERT INTO table_that_does_not_exist (id) VALUES (1)',
      ],
    };
    try {
      await expect(apply(database, [migration001, faultyMigration])).rejects.toThrow();
      const probe = await database.getFirst<{ count: number }>(
        `SELECT COUNT(*) AS count FROM sqlite_master
         WHERE type = 'table' AND name = 'rollback_probe'`,
      );
      const applied = await database.getAll<{ version: number }>(
        'SELECT version FROM schema_migrations ORDER BY version',
      );
      expect(probe?.count).toBe(0);
      expect(applied.map((row) => row.version)).toEqual([1]);
    } finally {
      await database.close();
    }
  });

  it('detects a changed already-applied migration checksum', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database, [migration001]);
      const changed: Migration = {
        ...migration001,
        statements: [...migration001.statements, 'SELECT 1'],
      };
      await expect(apply(database, [changed])).rejects.toMatchObject({
        code: 'MIGRATION_CHECKSUM_MISMATCH',
      });
    } finally {
      await database.close();
    }
  });

  it('allows an explicitly confirmed development rebuild without weakening user upgrades', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await apply(database);
      await new ContentImporter(database, hashProvider).import(createCompleteFixtureDataset(), {
        environment: 'fixture',
        importedAt: appliedAt,
        sourceFile: 'synthetic-fixture',
      });

      await rebuildDevelopmentDatabase(database, {
        environment: 'development',
        confirmation: DEVELOPMENT_REBUILD_CONFIRMATION,
        appVersion: 'test-app-v1',
        rebuiltAt: appliedAt,
        hashProvider,
        migrations,
      });

      const migrationCount = await database.getFirst<{ count: number }>(
        'SELECT COUNT(*) AS count FROM schema_migrations',
      );
      const contentCount = await database.getFirst<{ count: number }>(
        'SELECT COUNT(*) AS count FROM content_versions',
      );
      expect(migrationCount?.count).toBe(7);
      expect(contentCount?.count).toBe(0);
    } finally {
      await database.close();
    }
  });
});

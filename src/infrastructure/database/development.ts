import { runMigrations, type Migration } from './migrations';
import type { HashProvider, SqlDatabase } from './types';

export const DEVELOPMENT_REBUILD_CONFIRMATION = 'REBUILD_DEVELOPMENT_DATABASE';

const tablesInDropOrder = [
  'professional_chart_snapshots',
  'professional_candidate_gold_cases',
  'professional_calendar_boundaries',
  'professional_calendar_policies',
  'professional_candidate_diffs',
  'professional_candidate_review_signoffs',
  'professional_candidate_sources',
  'professional_candidate_packages',
  'legacy_migration_reviews',
  'legacy_professional_rule_quarantine',
  'content_import_reports',
  'analysis_snapshots',
  'cast_lines',
  'divination_sessions',
  'settings',
  'template_variables',
  'content_terms',
  'content_record_audit',
  'content_texts',
  'interpretation_templates',
  'question_categories',
  'rule_definitions',
  'branch_relations',
  'branch_relation_members',
  'six_spirit_rules',
  'six_spirits',
  'six_relative_rules',
  'najia_assignments',
  'palace_hexagrams',
  'earthly_branches',
  'special_line_texts',
  'hexagram_lines',
  'hexagrams',
  'trigrams',
  'rule_version_sources',
  'rule_versions',
  'data_sources',
  'content_versions',
  'schema_migrations',
] as const;

export interface RebuildDevelopmentDatabaseOptions {
  readonly environment: 'development';
  readonly confirmation: string;
  readonly appVersion: string;
  readonly rebuiltAt: string;
  readonly hashProvider: HashProvider;
  readonly migrations: readonly Migration[];
}

export async function rebuildDevelopmentDatabase(
  database: SqlDatabase,
  options: RebuildDevelopmentDatabaseOptions,
): Promise<void> {
  if (
    options.environment !== 'development' ||
    options.confirmation !== DEVELOPMENT_REBUILD_CONFIRMATION
  ) {
    throw new Error('Development database rebuild requires the explicit confirmation token.');
  }

  await database.exec('PRAGMA foreign_keys = OFF');
  try {
    await database.transaction(async (transaction) => {
      for (const table of tablesInDropOrder) {
        await transaction.exec(`DROP TABLE IF EXISTS ${table}`);
      }
    });
  } finally {
    await database.exec('PRAGMA foreign_keys = ON');
  }

  await runMigrations(database, {
    appVersion: options.appVersion,
    appliedAt: options.rebuiltAt,
    hashProvider: options.hashProvider,
    migrations: options.migrations,
  });
}

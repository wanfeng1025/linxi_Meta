import type { Migration } from './types';

/**
 * Legacy rows used a polarity field where the later model needs an explicit
 * inner/outer trigram scope.  Polarity is not evidence for scope, so this
 * migration deliberately preserves ambiguous rows for a human review instead
 * of attempting a lossy update.
 */
export const migration006: Migration = {
  version: 6,
  name: 'quarantine-legacy-professional-rules',
  kind: 'data',
  statements: [
    `CREATE TABLE legacy_professional_rule_quarantine (
      legacy_table TEXT NOT NULL,
      legacy_row_id TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      row_sha256 TEXT,
      migration_status TEXT NOT NULL CHECK (migration_status IN ('MANUAL_REVIEW_REQUIRED', 'RESOLVED', 'UNRESOLVED')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (legacy_table, legacy_row_id)
    )`,
    `CREATE TABLE legacy_migration_reviews (
      legacy_table TEXT NOT NULL,
      legacy_row_id TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      row_sha256 TEXT,
      proposed_scope TEXT CHECK (proposed_scope IN ('inner', 'outer')),
      reviewer_a_scope TEXT CHECK (reviewer_a_scope IN ('inner', 'outer')),
      reviewer_b_scope TEXT CHECK (reviewer_b_scope IN ('inner', 'outer')),
      resolution TEXT,
      source_evidence TEXT,
      status TEXT NOT NULL CHECK (status IN ('MANUAL_REVIEW_REQUIRED', 'RESOLVED', 'UNRESOLVED')),
      resolved_at TEXT,
      PRIMARY KEY (legacy_table, legacy_row_id),
      FOREIGN KEY (legacy_table, legacy_row_id)
        REFERENCES legacy_professional_rule_quarantine(legacy_table, legacy_row_id) ON DELETE RESTRICT,
      CHECK ((status = 'RESOLVED') = (resolved_at IS NOT NULL))
    )`,
    `INSERT OR IGNORE INTO legacy_professional_rule_quarantine
      (legacy_table, legacy_row_id, raw_json, row_sha256, migration_status, created_at)
     SELECT
       'najia_assignments',
       najia_assignment_id || '@' || content_version,
       json_object(
         'najia_assignment_id', najia_assignment_id,
         'content_version', content_version,
         'source_id', source_id,
         'source_version', source_version,
         'ruleset_id', ruleset_id,
         'ruleset_version', ruleset_version,
         'trigram_id', trigram_id,
         'polarity', polarity,
         'line_position', line_position,
         'heavenly_stem_id', heavenly_stem_id,
         'earthly_branch_id', earthly_branch_id
       ),
       NULL,
       'MANUAL_REVIEW_REQUIRED',
       CURRENT_TIMESTAMP
     FROM najia_assignments
     WHERE scope IS NULL`,
    `INSERT OR IGNORE INTO legacy_migration_reviews
      (legacy_table, legacy_row_id, raw_json, row_sha256, status)
     SELECT legacy_table, legacy_row_id, raw_json, row_sha256, migration_status
     FROM legacy_professional_rule_quarantine`,
    `CREATE INDEX idx_legacy_rule_quarantine_status
      ON legacy_professional_rule_quarantine(migration_status)`,
  ],
};

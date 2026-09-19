import type { Migration } from './types';

/**
 * Static casts do not have an independent changed hexagram. Rebuild the three
 * history tables so the persisted relation is nullable, while preserving all
 * raw coin rows and snapshot payloads. Legacy static rows are normalized to
 * NULL during the copy; moving rows retain their validated changed reference.
 */
export const migration008: Migration = {
  version: 8,
  name: 'allow-static-history-without-changed-hexagram',
  kind: 'structure',
  statements: [
    'DROP INDEX IF EXISTS idx_divination_sessions_cast_at',
    'DROP INDEX IF EXISTS idx_analysis_snapshots_session',
    'DROP TRIGGER IF EXISTS prevent_divination_session_update',
    'DROP TRIGGER IF EXISTS prevent_cast_line_update',
    'DROP TRIGGER IF EXISTS prevent_analysis_snapshot_update',
    'ALTER TABLE analysis_snapshots RENAME TO analysis_snapshots_legacy_v7',
    'ALTER TABLE cast_lines RENAME TO cast_lines_legacy_v7',
    'ALTER TABLE divination_sessions RENAME TO divination_sessions_legacy_v7',
    `CREATE TABLE divination_sessions (
      session_id TEXT PRIMARY KEY,
      question TEXT,
      category_id TEXT,
      cast_at TEXT NOT NULL,
      timezone TEXT NOT NULL,
      input_schema_version TEXT NOT NULL CHECK (input_schema_version <> 'latest'),
      divination_ruleset_version TEXT NOT NULL CHECK (divination_ruleset_version <> 'latest'),
      interpretation_ruleset_version TEXT NOT NULL CHECK (interpretation_ruleset_version <> 'latest'),
      random_algorithm_version TEXT NOT NULL CHECK (random_algorithm_version <> 'latest'),
      content_version TEXT NOT NULL CHECK (content_version <> 'latest'),
      primary_hexagram_id TEXT NOT NULL,
      changed_hexagram_id TEXT,
      created_at TEXT NOT NULL,
      app_version TEXT,
      database_schema_version TEXT,
      cast_algorithm_version TEXT,
      calendar_algorithm_version TEXT,
      template_version TEXT,
      ai_prompt_version TEXT,
      calendar_snapshot_json TEXT,
      FOREIGN KEY (category_id, content_version) REFERENCES question_categories(category_id, content_version) ON DELETE RESTRICT,
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT,
      FOREIGN KEY (primary_hexagram_id, content_version) REFERENCES hexagrams(hexagram_id, content_version) ON DELETE RESTRICT,
      FOREIGN KEY (changed_hexagram_id, content_version) REFERENCES hexagrams(hexagram_id, content_version) ON DELETE RESTRICT
    )`,
    `INSERT INTO divination_sessions
      (session_id, question, category_id, cast_at, timezone, input_schema_version,
       divination_ruleset_version, interpretation_ruleset_version,
       random_algorithm_version, content_version, primary_hexagram_id,
       changed_hexagram_id, created_at, app_version, database_schema_version,
       cast_algorithm_version, calendar_algorithm_version, template_version,
       ai_prompt_version, calendar_snapshot_json)
     SELECT
       session_id, question, category_id, cast_at, timezone, input_schema_version,
       divination_ruleset_version, interpretation_ruleset_version,
       random_algorithm_version, content_version, primary_hexagram_id,
       CASE WHEN EXISTS (
         SELECT 1 FROM cast_lines_legacy_v7 lines
         WHERE lines.session_id = legacy.session_id AND lines.is_moving = 1
       ) THEN changed_hexagram_id ELSE NULL END,
       created_at, app_version, database_schema_version, cast_algorithm_version,
       calendar_algorithm_version, template_version, ai_prompt_version,
       calendar_snapshot_json
     FROM divination_sessions_legacy_v7 legacy`,
    `CREATE TABLE cast_lines (
      session_id TEXT NOT NULL,
      line_position INTEGER NOT NULL CHECK (line_position BETWEEN 1 AND 6),
      coin_1 INTEGER NOT NULL CHECK (coin_1 IN (2, 3)),
      coin_2 INTEGER NOT NULL CHECK (coin_2 IN (2, 3)),
      coin_3 INTEGER NOT NULL CHECK (coin_3 IN (2, 3)),
      line_value INTEGER NOT NULL CHECK (line_value BETWEEN 6 AND 9),
      primary_bit INTEGER NOT NULL CHECK (primary_bit IN (0, 1)),
      changed_bit INTEGER NOT NULL CHECK (changed_bit IN (0, 1)),
      is_moving INTEGER NOT NULL CHECK (is_moving IN (0, 1)),
      PRIMARY KEY (session_id, line_position),
      FOREIGN KEY (session_id) REFERENCES divination_sessions(session_id) ON DELETE CASCADE,
      CHECK (line_value = coin_1 + coin_2 + coin_3),
      CHECK (
        (line_value = 6 AND primary_bit = 0 AND changed_bit = 1 AND is_moving = 1) OR
        (line_value = 7 AND primary_bit = 1 AND changed_bit = 1 AND is_moving = 0) OR
        (line_value = 8 AND primary_bit = 0 AND changed_bit = 0 AND is_moving = 0) OR
        (line_value = 9 AND primary_bit = 1 AND changed_bit = 0 AND is_moving = 1)
      )
    )`,
    `INSERT INTO cast_lines
      (session_id, line_position, coin_1, coin_2, coin_3, line_value,
       primary_bit, changed_bit, is_moving)
     SELECT session_id, line_position, coin_1, coin_2, coin_3, line_value,
       primary_bit, changed_bit, is_moving
     FROM cast_lines_legacy_v7`,
    `CREATE TABLE analysis_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      schema_version TEXT NOT NULL CHECK (schema_version <> 'latest'),
      ruleset_version TEXT NOT NULL CHECK (ruleset_version <> 'latest'),
      content_version TEXT NOT NULL CHECK (content_version <> 'latest'),
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      template_version TEXT,
      calendar_algorithm_version TEXT,
      ai_prompt_version TEXT,
      reanalysis_of_snapshot_id TEXT,
      UNIQUE (session_id, schema_version, ruleset_version, content_version, payload_hash),
      FOREIGN KEY (session_id) REFERENCES divination_sessions(session_id) ON DELETE CASCADE,
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT
    )`,
    `INSERT INTO analysis_snapshots
      (snapshot_id, session_id, schema_version, ruleset_version, content_version,
       payload_json, payload_hash, created_at, template_version,
       calendar_algorithm_version, ai_prompt_version, reanalysis_of_snapshot_id)
     SELECT snapshot_id, session_id, schema_version, ruleset_version, content_version,
       payload_json, payload_hash, created_at, template_version,
       calendar_algorithm_version, ai_prompt_version, reanalysis_of_snapshot_id
     FROM analysis_snapshots_legacy_v7`,
    'DROP TABLE analysis_snapshots_legacy_v7',
    'DROP TABLE cast_lines_legacy_v7',
    'DROP TABLE divination_sessions_legacy_v7',
    'CREATE INDEX idx_divination_sessions_cast_at ON divination_sessions(cast_at DESC)',
    'CREATE INDEX idx_analysis_snapshots_session ON analysis_snapshots(session_id, created_at DESC)',
    `CREATE TRIGGER prevent_divination_session_update
     BEFORE UPDATE ON divination_sessions
     BEGIN SELECT RAISE(ABORT, 'divination sessions are append-only'); END`,
    `CREATE TRIGGER prevent_cast_line_update
     BEFORE UPDATE ON cast_lines
     BEGIN SELECT RAISE(ABORT, 'cast lines are append-only'); END`,
    `CREATE TRIGGER prevent_analysis_snapshot_update
     BEFORE UPDATE ON analysis_snapshots
     BEGIN SELECT RAISE(ABORT, 'analysis snapshots are append-only'); END`,
  ],
};

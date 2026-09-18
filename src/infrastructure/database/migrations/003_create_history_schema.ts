import type { Migration } from './types';

export const migration003: Migration = {
  version: 3,
  name: 'create-history-schema',
  kind: 'structure',
  statements: [
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
      changed_hexagram_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (category_id, content_version) REFERENCES question_categories(category_id, content_version) ON DELETE RESTRICT,
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT,
      FOREIGN KEY (primary_hexagram_id, content_version) REFERENCES hexagrams(hexagram_id, content_version) ON DELETE RESTRICT,
      FOREIGN KEY (changed_hexagram_id, content_version) REFERENCES hexagrams(hexagram_id, content_version) ON DELETE RESTRICT
    )`,
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
    `CREATE TABLE analysis_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      schema_version TEXT NOT NULL CHECK (schema_version <> 'latest'),
      ruleset_version TEXT NOT NULL CHECK (ruleset_version <> 'latest'),
      content_version TEXT NOT NULL CHECK (content_version <> 'latest'),
      payload_json TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (session_id, schema_version, ruleset_version, content_version, payload_hash),
      FOREIGN KEY (session_id) REFERENCES divination_sessions(session_id) ON DELETE CASCADE,
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ],
};

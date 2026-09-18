import type { Migration } from './types';

export const migration004: Migration = {
  version: 4,
  name: 'create-indexes-and-immutability-guards',
  kind: 'structure',
  statements: [
    'CREATE INDEX idx_hexagrams_version_sequence ON hexagrams(content_version, king_wen_sequence)',
    'CREATE INDEX idx_hexagram_lines_lookup ON hexagram_lines(content_version, hexagram_id, line_position)',
    'CREATE INDEX idx_palace_hexagrams_ruleset ON palace_hexagrams(ruleset_id, ruleset_version)',
    'CREATE INDEX idx_najia_ruleset ON najia_assignments(ruleset_id, ruleset_version)',
    'CREATE INDEX idx_rule_definitions_ruleset ON rule_definitions(ruleset_id, ruleset_version, rule_type)',
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
    `CREATE TRIGGER prevent_content_version_update
     BEFORE UPDATE ON content_versions
     BEGIN SELECT RAISE(ABORT, 'content versions are immutable'); END`,
    `CREATE TRIGGER prevent_trigram_update
     BEFORE UPDATE ON trigrams
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
    `CREATE TRIGGER prevent_hexagram_update
     BEFORE UPDATE ON hexagrams
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
    `CREATE TRIGGER prevent_hexagram_line_update
     BEFORE UPDATE ON hexagram_lines
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
    `CREATE TRIGGER prevent_special_line_text_update
     BEFORE UPDATE ON special_line_texts
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
  ],
};

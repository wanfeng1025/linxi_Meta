import type { Migration } from './types';

/**
 * Candidate-only staging. These records are deliberately separate from the verified
 * content tables so a candidate rule package can never be selected by production lookup.
 */
export const migration007: Migration = {
  version: 7,
  name: 'create-professional-candidate-staging',
  kind: 'structure',
  statements: [
    `CREATE TABLE professional_candidate_packages (
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status = 'production_candidate'),
      source_manifest_hash TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      package_json TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      PRIMARY KEY (ruleset_id, ruleset_version, content_version),
      UNIQUE (payload_hash)
    )`,
    `CREATE TABLE professional_candidate_sources (
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_version TEXT NOT NULL,
      source_locator TEXT NOT NULL,
      verification_status TEXT NOT NULL CHECK (verification_status = 'production_candidate'),
      PRIMARY KEY (ruleset_id, ruleset_version, content_version, source_id, source_version),
      FOREIGN KEY (ruleset_id, ruleset_version, content_version)
        REFERENCES professional_candidate_packages(ruleset_id, ruleset_version, content_version)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE professional_candidate_review_signoffs (
      signoff_id TEXT PRIMARY KEY,
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      review_scope TEXT NOT NULL,
      review_result TEXT NOT NULL CHECK (review_result IN ('accepted', 'rejected', 'needs_changes')),
      evidence_locator TEXT NOT NULL,
      signed_at TEXT NOT NULL,
      UNIQUE (ruleset_id, ruleset_version, content_version, reviewer_id, review_scope),
      FOREIGN KEY (ruleset_id, ruleset_version, content_version)
        REFERENCES professional_candidate_packages(ruleset_id, ruleset_version, content_version)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE professional_candidate_diffs (
      diff_id TEXT PRIMARY KEY,
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      baseline_payload_hash TEXT,
      candidate_payload_hash TEXT NOT NULL,
      diff_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ruleset_id, ruleset_version, content_version)
        REFERENCES professional_candidate_packages(ruleset_id, ruleset_version, content_version)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE professional_calendar_policies (
      calendar_policy_id TEXT NOT NULL,
      calendar_algorithm_version TEXT NOT NULL,
      timezone_data_version TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status = 'production_candidate'),
      policy_json TEXT NOT NULL,
      source_manifest_hash TEXT NOT NULL,
      PRIMARY KEY (calendar_policy_id, calendar_algorithm_version, timezone_data_version)
    )`,
    `CREATE TABLE professional_calendar_boundaries (
      calendar_policy_id TEXT NOT NULL,
      calendar_algorithm_version TEXT NOT NULL,
      timezone_data_version TEXT NOT NULL,
      boundary_id TEXT NOT NULL,
      boundary_instant TEXT NOT NULL,
      boundary_kind TEXT NOT NULL CHECK (boundary_kind IN ('solar-term', 'timezone-transition', 'day-ganzhi-anchor')),
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status = 'production_candidate'),
      PRIMARY KEY (calendar_policy_id, calendar_algorithm_version, timezone_data_version, boundary_id),
      FOREIGN KEY (calendar_policy_id, calendar_algorithm_version, timezone_data_version)
        REFERENCES professional_calendar_policies(calendar_policy_id, calendar_algorithm_version, timezone_data_version)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE professional_candidate_gold_cases (
      case_id TEXT PRIMARY KEY,
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status = 'candidate_for_human_review'),
      fixture_json TEXT NOT NULL,
      expected_json TEXT NOT NULL,
      source_manifest_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (ruleset_id, ruleset_version, content_version)
        REFERENCES professional_candidate_packages(ruleset_id, ruleset_version, content_version)
        ON DELETE RESTRICT
    )`,
    `CREATE TABLE professional_chart_snapshots (
      snapshot_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      ruleset_id TEXT NOT NULL,
      ruleset_version TEXT NOT NULL,
      content_version TEXT NOT NULL,
      calendar_policy_id TEXT NOT NULL,
      calendar_algorithm_version TEXT NOT NULL,
      timezone TEXT NOT NULL,
      calculated_at TEXT NOT NULL,
      chart_json TEXT NOT NULL,
      chart_hash TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('candidate', 'verified')),
      created_at TEXT NOT NULL,
      UNIQUE (session_id, snapshot_id)
    )`,
    `CREATE INDEX idx_professional_candidate_signoffs
      ON professional_candidate_review_signoffs(ruleset_id, ruleset_version, content_version, review_scope)`,
    `CREATE INDEX idx_professional_candidate_gold_cases
      ON professional_candidate_gold_cases(ruleset_id, ruleset_version, content_version, status)`,
    `CREATE INDEX idx_professional_chart_snapshots_session
      ON professional_chart_snapshots(session_id, calculated_at)`,
  ],
};

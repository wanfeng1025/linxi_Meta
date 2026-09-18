import type { Migration } from './types';

export const migration005: Migration = {
  version: 5,
  name: 'expand-auditable-content-model',
  kind: 'structure',
  statements: [
    `ALTER TABLE data_sources ADD COLUMN author_or_editor TEXT`,
    `ALTER TABLE data_sources ADD COLUMN dynasty_or_year TEXT`,
    `ALTER TABLE data_sources ADD COLUMN publisher_or_platform TEXT`,
    `ALTER TABLE data_sources ADD COLUMN url TEXT`,
    `ALTER TABLE data_sources ADD COLUMN public_domain_status TEXT`,
    `ALTER TABLE data_sources ADD COLUMN transcription_status TEXT`,
    `ALTER TABLE data_sources ADD COLUMN proofreading_status TEXT`,
    `ALTER TABLE data_sources ADD COLUMN accessed_at TEXT`,
    `ALTER TABLE data_sources ADD COLUMN reliability_grade TEXT`,
    `ALTER TABLE data_sources ADD COLUMN canonical_source_type TEXT`,

    `ALTER TABLE rule_versions ADD COLUMN release_status TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN parent_version TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN effective_from TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN changelog TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN breaking_changes_json TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN source_manifest_hash TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN rules_hash TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN created_at TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN reviewed_by TEXT`,
    `ALTER TABLE rule_versions ADD COLUMN released_at TEXT`,

    `ALTER TABLE trigrams ADD COLUMN name_traditional TEXT`,
    `ALTER TABLE trigrams ADD COLUMN element_id TEXT`,
    `ALTER TABLE trigrams ADD COLUMN yin_yang_class TEXT`,
    `ALTER TABLE trigrams ADD COLUMN family_role_id TEXT`,
    `ALTER TABLE trigrams ADD COLUMN later_heaven_direction_id TEXT`,
    `ALTER TABLE hexagrams ADD COLUMN name_traditional TEXT`,
    `ALTER TABLE hexagrams ADD COLUMN unicode_symbol TEXT`,
    `ALTER TABLE hexagrams ADD COLUMN sequence_note TEXT`,
    `ALTER TABLE hexagram_lines ADD COLUMN polarity TEXT`,
    `ALTER TABLE hexagram_lines ADD COLUMN line_name TEXT`,
    `ALTER TABLE special_line_texts ADD COLUMN ruleset_id TEXT`,
    `ALTER TABLE special_line_texts ADD COLUMN ruleset_version TEXT`,
    `ALTER TABLE special_line_texts ADD COLUMN trigger_type TEXT`,
    `ALTER TABLE special_line_texts ADD COLUMN trigger_line_value INTEGER`,

    `ALTER TABLE palace_hexagrams ADD COLUMN stage TEXT`,
    `ALTER TABLE palace_hexagrams ADD COLUMN palace_element_id TEXT`,
    `ALTER TABLE palace_hexagrams ADD COLUMN transformation_mask TEXT`,
    `ALTER TABLE najia_assignments ADD COLUMN scope TEXT`,
    `ALTER TABLE najia_assignments ADD COLUMN local_line INTEGER`,
    `ALTER TABLE najia_assignments ADD COLUMN absolute_line_hint INTEGER`,
    `ALTER TABLE najia_assignments ADD COLUMN branch_element_id TEXT`,
    `ALTER TABLE six_relative_rules ADD COLUMN formula_code TEXT`,
    `ALTER TABLE branch_relations ADD COLUMN relation_kind TEXT`,
    `ALTER TABLE branch_relations ADD COLUMN result_element_id TEXT`,
    `ALTER TABLE branch_relations ADD COLUMN priority INTEGER`,
    `ALTER TABLE branch_relations ADD COLUMN enabled_by_default INTEGER`,
    `ALTER TABLE branch_relations ADD COLUMN evidence_requirement TEXT`,
    `ALTER TABLE branch_relations ADD COLUMN relation_notes TEXT`,

    `ALTER TABLE question_categories ADD COLUMN parent_category_id TEXT`,
    `ALTER TABLE question_categories ADD COLUMN useful_god_strategy TEXT`,
    `ALTER TABLE question_categories ADD COLUMN world_response_policy TEXT`,
    `ALTER TABLE question_categories ADD COLUMN disclaimer_key TEXT`,
    `ALTER TABLE question_categories ADD COLUMN sensitivity_level TEXT`,
    `ALTER TABLE question_categories ADD COLUMN ruleset_id TEXT`,
    `ALTER TABLE question_categories ADD COLUMN ruleset_version TEXT`,
    `ALTER TABLE question_categories ADD COLUMN template_group TEXT`,
    `ALTER TABLE question_categories ADD COLUMN enabled INTEGER`,
    `ALTER TABLE interpretation_templates ADD COLUMN template_version TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN locale TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN output_level TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN primary_symbol TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN trend TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN ruleset_id TEXT`,
    `ALTER TABLE interpretation_templates ADD COLUMN ruleset_version TEXT`,

    `CREATE TABLE content_record_audit (
      record_type TEXT NOT NULL,
      record_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      content_layer TEXT NOT NULL CHECK (content_layer IN ('classical', 'professional', 'product')),
      source_id TEXT NOT NULL,
      source_version TEXT NOT NULL,
      source_locator TEXT NOT NULL,
      original_script TEXT NOT NULL CHECK (original_script IN ('simplified', 'traditional', 'mixed', 'not-applicable')),
      normalization_notes TEXT NOT NULL,
      editorial_changes TEXT NOT NULL,
      verified_by TEXT,
      verified_at TEXT,
      record_checksum TEXT,
      PRIMARY KEY (record_type, record_id, content_version),
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT,
      FOREIGN KEY (source_id, source_version) REFERENCES data_sources(source_id, source_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE content_texts (
      text_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      owner_type TEXT NOT NULL CHECK (owner_type IN ('trigram', 'hexagram', 'hexagram-line', 'special-line')),
      owner_id TEXT NOT NULL,
      text_type TEXT NOT NULL,
      text_class TEXT NOT NULL CHECK (text_class IN ('canonical', 'classical-commentary', 'modern-plain', 'product-original')),
      locale TEXT NOT NULL,
      text_value TEXT NOT NULL CHECK (length(text_value) > 0),
      PRIMARY KEY (text_id, content_version),
      UNIQUE (content_version, owner_type, owner_id, text_type, locale),
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE content_terms (
      owner_type TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      term_type TEXT NOT NULL,
      position INTEGER NOT NULL CHECK (position >= 0),
      term_value TEXT NOT NULL CHECK (length(term_value) > 0),
      PRIMARY KEY (owner_type, owner_id, content_version, term_type, position),
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE earthly_branches (
      branch_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_version TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'verified')),
      branch_order INTEGER NOT NULL CHECK (branch_order BETWEEN 1 AND 12),
      name_simplified TEXT NOT NULL,
      name_traditional TEXT NOT NULL,
      element_id TEXT NOT NULL,
      yin_yang TEXT NOT NULL CHECK (yin_yang IN ('yin', 'yang')),
      PRIMARY KEY (branch_id, content_version),
      UNIQUE (content_version, branch_order),
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT,
      FOREIGN KEY (source_id, source_version) REFERENCES data_sources(source_id, source_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE six_spirits (
      spirit_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_version TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('draft', 'verified')),
      spirit_order INTEGER NOT NULL CHECK (spirit_order BETWEEN 1 AND 6),
      name_simplified TEXT NOT NULL,
      name_traditional TEXT NOT NULL,
      PRIMARY KEY (spirit_id, content_version),
      UNIQUE (content_version, spirit_order),
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT,
      FOREIGN KEY (source_id, source_version) REFERENCES data_sources(source_id, source_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE branch_relation_members (
      relation_id TEXT NOT NULL,
      content_version TEXT NOT NULL,
      member_position INTEGER NOT NULL CHECK (member_position BETWEEN 1 AND 3),
      branch_id TEXT NOT NULL,
      PRIMARY KEY (relation_id, content_version, member_position),
      UNIQUE (relation_id, content_version, branch_id),
      FOREIGN KEY (relation_id, content_version) REFERENCES branch_relations(relation_id, content_version) ON DELETE RESTRICT,
      FOREIGN KEY (branch_id, content_version) REFERENCES earthly_branches(branch_id, content_version) ON DELETE RESTRICT
    )`,
    `CREATE TABLE content_import_reports (
      content_version TEXT PRIMARY KEY,
      source_file TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      validation_report_json TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      FOREIGN KEY (content_version) REFERENCES content_versions(content_version) ON DELETE RESTRICT
    )`,

    `ALTER TABLE divination_sessions ADD COLUMN app_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN database_schema_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN cast_algorithm_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN calendar_algorithm_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN template_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN ai_prompt_version TEXT`,
    `ALTER TABLE divination_sessions ADD COLUMN calendar_snapshot_json TEXT`,
    `ALTER TABLE analysis_snapshots ADD COLUMN template_version TEXT`,
    `ALTER TABLE analysis_snapshots ADD COLUMN calendar_algorithm_version TEXT`,
    `ALTER TABLE analysis_snapshots ADD COLUMN ai_prompt_version TEXT`,
    `ALTER TABLE analysis_snapshots ADD COLUMN reanalysis_of_snapshot_id TEXT`,

    `CREATE INDEX idx_content_text_owner ON content_texts(content_version, owner_type, owner_id, text_type)`,
    `CREATE INDEX idx_content_audit_source ON content_record_audit(source_id, source_version, content_version)`,
    `CREATE INDEX idx_branch_relation_members_branch ON branch_relation_members(content_version, branch_id)`,
    `CREATE INDEX idx_analysis_snapshot_versions ON analysis_snapshots(session_id, ruleset_version, content_version, template_version)`,
    `CREATE TRIGGER validate_content_text_owner
     BEFORE INSERT ON content_texts
     WHEN
       (NEW.owner_type = 'trigram' AND NOT EXISTS (
         SELECT 1 FROM trigrams WHERE trigram_id = NEW.owner_id AND content_version = NEW.content_version
       )) OR
       (NEW.owner_type = 'hexagram' AND NOT EXISTS (
         SELECT 1 FROM hexagrams WHERE hexagram_id = NEW.owner_id AND content_version = NEW.content_version
       )) OR
       (NEW.owner_type = 'hexagram-line' AND NOT EXISTS (
         SELECT 1 FROM hexagram_lines WHERE line_id = NEW.owner_id AND content_version = NEW.content_version
       )) OR
       (NEW.owner_type = 'special-line' AND NOT EXISTS (
         SELECT 1 FROM special_line_texts WHERE special_line_id = NEW.owner_id AND content_version = NEW.content_version
       ))
     BEGIN SELECT RAISE(ABORT, 'content text owner does not exist'); END`,
    `CREATE TRIGGER prevent_content_text_update
     BEFORE UPDATE ON content_texts
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
    `CREATE TRIGGER prevent_content_audit_update
     BEFORE UPDATE ON content_record_audit
     BEGIN SELECT RAISE(ABORT, 'content audit metadata is immutable'); END`,
    `CREATE TRIGGER prevent_earthly_branch_update
     BEFORE UPDATE ON earthly_branches
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
    `CREATE TRIGGER prevent_six_spirit_update
     BEFORE UPDATE ON six_spirits
     BEGIN SELECT RAISE(ABORT, 'versioned content is immutable'); END`,
  ],
};

import type {
  BranchRelationDto,
  NajiaAssignmentDto,
  PalaceHexagramDto,
  RuleDefinitionDto,
  RuleRepository,
} from '@/application/repositories';
import type { LinePosition } from '@/domain/casting';

import type { SqlDatabase } from '../types';

interface RuleRow {
  readonly rule_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly rule_type: string;
  readonly rule_key: string;
  readonly priority: number;
  readonly input_fields: string;
  readonly output_fields: string;
  readonly conflict_strategy: string;
  readonly description: string;
  readonly source_locator: string;
}

interface PalaceRow {
  readonly palace_hexagram_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly palace_trigram_id: string;
  readonly palace_element_id: string | null;
  readonly hexagram_id: string;
  readonly palace_position: number;
  readonly stage: string | null;
  readonly transformation_mask: string | null;
  readonly shi_position: number;
  readonly ying_position: number;
}

interface NajiaRow {
  readonly najia_assignment_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly trigram_id: string;
  readonly scope: string | null;
  readonly local_line: number | null;
  readonly absolute_line_hint: number | null;
  readonly heavenly_stem_id: string;
  readonly earthly_branch_id: string;
  readonly branch_element_id: string | null;
}

interface BranchRelationRow {
  readonly relation_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly relation_kind: string | null;
  readonly relation_type: string;
  readonly result_element_id: string | null;
  readonly directional: number;
  readonly priority: number | null;
  readonly enabled_by_default: number | null;
  readonly evidence_requirement: string | null;
  readonly relation_notes: string | null;
}

interface BranchMemberRow {
  readonly branch_id: string;
}

function linePosition(value: number): LinePosition {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error(`Stored line position ${value} is invalid.`);
  }
  return value as LinePosition;
}

function parseStringArray(value: string, field: string): readonly string[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
    throw new Error(`Stored ${field} is not a string array.`);
  }
  return parsed;
}

export class SQLiteRuleRepository implements RuleRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async listDefinitions(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly RuleDefinitionDto[]> {
    const rows = await this.database.getAll<RuleRow>(
      `SELECT rule_id, ruleset_id, ruleset_version, content_version, rule_type, rule_key,
              priority, input_fields, output_fields, conflict_strategy, description, source_locator
       FROM rule_definitions
       WHERE ruleset_id = ? AND ruleset_version = ?
       ORDER BY priority DESC, rule_id`,
      [rulesetId, rulesetVersion],
    );
    return rows.map((row) => ({
      id: row.rule_id,
      rulesetId: row.ruleset_id,
      rulesetVersion: row.ruleset_version,
      contentVersion: row.content_version,
      ruleType: row.rule_type,
      ruleKey: row.rule_key,
      priority: row.priority,
      inputFields: parseStringArray(row.input_fields, 'input_fields'),
      outputFields: parseStringArray(row.output_fields, 'output_fields'),
      conflictStrategy: row.conflict_strategy,
      description: row.description,
      sourceLocator: row.source_locator,
    }));
  }

  public async listPalaceHexagrams(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly PalaceHexagramDto[]> {
    const rows = await this.database.getAll<PalaceRow>(
      `SELECT palace_hexagram_id, ruleset_id, ruleset_version, content_version,
              palace_trigram_id, palace_element_id, hexagram_id, palace_position, stage,
              transformation_mask, shi_position, ying_position
       FROM palace_hexagrams
       WHERE ruleset_id = ? AND ruleset_version = ?
       ORDER BY palace_trigram_id, palace_position`,
      [rulesetId, rulesetVersion],
    );
    return rows.map((row) => {
      if (
        row.palace_element_id === null ||
        row.stage === null ||
        row.transformation_mask === null
      ) {
        throw new Error('Legacy palace data requires review before v2 rule queries.');
      }
      return {
        id: row.palace_hexagram_id,
        rulesetId: row.ruleset_id,
        rulesetVersion: row.ruleset_version,
        contentVersion: row.content_version,
        palaceTrigramId: row.palace_trigram_id,
        palaceElementId: row.palace_element_id,
        hexagramId: row.hexagram_id,
        palaceSequence: row.palace_position - 1,
        stage: row.stage,
        transformationMask: row.transformation_mask,
        shiPosition: linePosition(row.shi_position),
        yingPosition: linePosition(row.ying_position),
      };
    });
  }

  public async listNajiaAssignments(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly NajiaAssignmentDto[]> {
    const rows = await this.database.getAll<NajiaRow>(
      `SELECT najia_assignment_id, ruleset_id, ruleset_version, content_version, trigram_id,
              scope, local_line, absolute_line_hint, heavenly_stem_id, earthly_branch_id,
              branch_element_id
       FROM najia_assignments
       WHERE ruleset_id = ? AND ruleset_version = ?
       ORDER BY trigram_id, scope, local_line`,
      [rulesetId, rulesetVersion],
    );
    return rows.map((row) => {
      if (
        (row.scope !== 'inner' && row.scope !== 'outer') ||
        row.local_line === null ||
        row.local_line < 1 ||
        row.local_line > 3 ||
        row.absolute_line_hint === null ||
        row.branch_element_id === null
      ) {
        throw new Error('Legacy Najia data requires review before v2 rule queries.');
      }
      return {
        id: row.najia_assignment_id,
        rulesetId: row.ruleset_id,
        rulesetVersion: row.ruleset_version,
        contentVersion: row.content_version,
        trigramId: row.trigram_id,
        scope: row.scope,
        localLine: row.local_line as 1 | 2 | 3,
        absoluteLineHint: linePosition(row.absolute_line_hint),
        heavenlyStemId: row.heavenly_stem_id,
        earthlyBranchId: row.earthly_branch_id,
        branchElementId: row.branch_element_id,
      };
    });
  }

  public async listBranchRelations(
    rulesetId: string,
    rulesetVersion: string,
  ): Promise<readonly BranchRelationDto[]> {
    const rows = await this.database.getAll<BranchRelationRow>(
      `SELECT relation_id, ruleset_id, ruleset_version, content_version, relation_kind,
              relation_type, result_element_id, directional, priority, enabled_by_default,
              evidence_requirement, relation_notes
       FROM branch_relations
       WHERE ruleset_id = ? AND ruleset_version = ?
       ORDER BY priority DESC, relation_id`,
      [rulesetId, rulesetVersion],
    );
    return Promise.all(
      rows.map(async (row) => {
        if (
          row.relation_kind === null ||
          row.priority === null ||
          row.enabled_by_default === null ||
          row.evidence_requirement === null
        ) {
          throw new Error('Legacy branch relation data requires review before v2 rule queries.');
        }
        const members = await this.database.getAll<BranchMemberRow>(
          `SELECT branch_id FROM branch_relation_members
           WHERE relation_id = ? AND content_version = ? ORDER BY member_position`,
          [row.relation_id, row.content_version],
        );
        return {
          id: row.relation_id,
          rulesetId: row.ruleset_id,
          rulesetVersion: row.ruleset_version,
          contentVersion: row.content_version,
          relationType: row.relation_kind ?? row.relation_type,
          branchIds: members.map((member) => member.branch_id),
          resultElementId: row.result_element_id,
          directional: row.directional === 1,
          priority: row.priority,
          enabledByDefault: row.enabled_by_default === 1,
          evidenceRequirement: row.evidence_requirement,
          notes: row.relation_notes ?? '',
        };
      }),
    );
  }
}

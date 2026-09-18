import {
  validateContentDataset,
  type ContentDataset,
  type ContentValidationReport,
} from '../../../../scripts/content-data-schema';
import { canonicalJson } from '@/shared/data/canonical-json';

import type { HashProvider, SqlDatabase, SqlExecutor, SqlValue } from '../types';

interface ExistingContentVersionRow {
  readonly payload_hash: string;
  readonly record_count: number;
}

interface ExistingSourceRow {
  readonly metadata_hash: string;
}

export class ContentImportError extends Error {
  public constructor(
    public readonly code:
      | 'CONTENT_VALIDATION_FAILED'
      | 'CONTENT_VERSION_HASH_MISMATCH'
      | 'CONTENT_DATABASE_MISMATCH'
      | 'SOURCE_VERSION_HASH_MISMATCH',
    message: string,
    public readonly validationReport: ContentValidationReport | null = null,
  ) {
    super(message);
    this.name = 'ContentImportError';
  }
}

export interface ImportContentOptions {
  readonly environment: 'production' | 'draft' | 'fixture';
  readonly importedAt: string;
  readonly sourceFile: string;
}

export interface ContentImportReport {
  readonly status: 'imported' | 'already-imported';
  readonly contentVersion: string;
  readonly payloadHash: string;
  readonly recordCount: number;
  readonly validation: ContentValidationReport;
}

type AuditedRecord =
  | ContentDataset['trigrams'][number]
  | ContentDataset['hexagrams'][number]
  | ContentDataset['hexagramLines'][number]
  | ContentDataset['specialLineTexts'][number]
  | ContentDataset['contentTexts'][number]
  | ContentDataset['palaceHexagrams'][number]
  | ContentDataset['earthlyBranches'][number]
  | ContentDataset['najiaAssignments'][number]
  | ContentDataset['sixRelativeRules'][number]
  | ContentDataset['sixSpirits'][number]
  | ContentDataset['sixSpiritRules'][number]
  | ContentDataset['branchRelations'][number]
  | ContentDataset['questionCategories'][number]
  | ContentDataset['interpretationTemplates'][number]
  | ContentDataset['ruleDefinitions'][number];

function baseValues(record: AuditedRecord): readonly SqlValue[] {
  return [record.contentVersion, record.sourceId, record.sourceVersion, record.status];
}

function legacySourceType(sourceType: ContentDataset['dataSources'][number]['sourceType']): string {
  switch (sourceType) {
    case 'modern-study':
    case 'authorized-dataset':
    case 'internal-derivation':
    case 'pending':
    case 'classical-text':
      return sourceType;
    case 'primary-text':
    case 'ancient-commentary':
    case 'web-transcription':
      return 'classical-text';
    case 'product-original':
      return 'internal-derivation';
  }
}

function legacyRelationType(
  relationType: ContentDataset['branchRelations'][number]['relationType'],
): string {
  switch (relationType) {
    case 'six-harmony':
    case 'three-harmony':
    case 'half-harmony':
    case 'directional-harmony':
      return 'combine';
    case 'six-clash':
      return 'clash';
    case 'harm':
    case 'punishment':
    case 'break':
    case 'generate':
    case 'control':
      return relationType;
  }
}

interface ContentRecordCountRow {
  readonly total_count: number;
}

async function countImportedContent(
  executor: SqlExecutor,
  contentVersion: string,
): Promise<number> {
  const tables = [
    'trigrams',
    'hexagrams',
    'hexagram_lines',
    'special_line_texts',
    'content_texts',
    'palace_hexagrams',
    'earthly_branches',
    'najia_assignments',
    'six_relative_rules',
    'six_spirits',
    'six_spirit_rules',
    'branch_relations',
    'question_categories',
    'interpretation_templates',
    'rule_definitions',
  ] as const;
  const row = await executor.getFirst<ContentRecordCountRow>(
    `SELECT SUM(record_count) AS total_count FROM (
      ${tables
        .map((table) => `SELECT COUNT(*) AS record_count FROM ${table} WHERE content_version = ?`)
        .join(' UNION ALL ')}
    )`,
    tables.map(() => contentVersion),
  );
  return row?.total_count ?? 0;
}

function findText(
  dataset: ContentDataset,
  ownerType: ContentDataset['contentTexts'][number]['ownerType'],
  ownerId: string,
  textTypes: readonly ContentDataset['contentTexts'][number]['textType'][],
  textClasses: readonly ContentDataset['contentTexts'][number]['textClass'][],
): string | null {
  return (
    dataset.contentTexts.find(
      (text) =>
        text.ownerType === ownerType &&
        text.ownerId === ownerId &&
        textTypes.includes(text.textType) &&
        textClasses.includes(text.textClass),
    )?.text ?? null
  );
}

async function insertSources(
  transaction: SqlExecutor,
  dataset: ContentDataset,
  sourceHashes: ReadonlyMap<string, string>,
): Promise<void> {
  for (const source of dataset.dataSources) {
    const sourceKey = `${source.sourceId}@${source.sourceVersion}`;
    const metadataHash = sourceHashes.get(sourceKey);
    if (metadataHash === undefined) throw new Error(`Missing source hash for ${sourceKey}.`);
    const existing = await transaction.getFirst<ExistingSourceRow>(
      `SELECT metadata_hash FROM data_sources WHERE source_id = ? AND source_version = ?`,
      [source.sourceId, source.sourceVersion],
    );
    if (existing !== null) {
      if (existing.metadata_hash !== metadataHash) {
        throw new ContentImportError(
          'SOURCE_VERSION_HASH_MISMATCH',
          `Source ${sourceKey} changed without a source version change.`,
        );
      }
      continue;
    }
    await transaction.run(
      `INSERT INTO data_sources
        (source_id, source_version, title, edition, locator, source_type, license_status,
         status, verified_by, verified_at, notes, metadata_hash, author_or_editor,
         dynasty_or_year, publisher_or_platform, url, public_domain_status,
         transcription_status, proofreading_status, accessed_at, reliability_grade,
         canonical_source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        source.sourceId,
        source.sourceVersion,
        source.title,
        source.edition,
        source.locator,
        legacySourceType(source.sourceType),
        source.licenseStatus,
        source.status,
        source.verifiedBy,
        source.verifiedAt,
        source.notes,
        metadataHash,
        source.authorOrEditor,
        source.dynastyOrYear,
        source.publisherOrPlatform,
        source.url,
        source.publicDomainStatus,
        source.transcriptionStatus,
        source.proofreadingStatus,
        source.accessedAt,
        source.reliabilityGrade,
        source.sourceType,
      ],
    );
  }
}

async function insertRuleVersions(
  transaction: SqlExecutor,
  dataset: ContentDataset,
): Promise<void> {
  for (const version of dataset.ruleVersions) {
    await transaction.run(
      `INSERT INTO rule_versions
        (ruleset_id, ruleset_version, content_version, system_name, status, scope,
         verified_by, verified_at, notes, release_status, parent_version, effective_from,
         changelog, breaking_changes_json, source_manifest_hash, rules_hash, created_at,
         reviewed_by, released_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        version.rulesetId,
        version.rulesetVersion,
        dataset.version.contentVersion,
        version.systemName,
        version.status,
        version.scope,
        version.verifiedBy,
        version.verifiedAt,
        version.notes,
        version.releaseStatus,
        version.parentVersion,
        version.effectiveFrom,
        version.changelog,
        JSON.stringify(version.breakingChanges),
        version.sourceManifestHash,
        version.rulesHash,
        version.createdAt,
        version.reviewedBy,
        version.releasedAt,
      ],
    );
    for (const source of version.sourceRefs) {
      await transaction.run(
        `INSERT INTO rule_version_sources
          (ruleset_id, ruleset_version, source_id, source_version)
         VALUES (?, ?, ?, ?)`,
        [version.rulesetId, version.rulesetVersion, source.sourceId, source.sourceVersion],
      );
    }
  }
}

async function insertTerms(
  transaction: SqlExecutor,
  contentVersion: string,
  ownerType: string,
  ownerId: string,
  termType: string,
  values: readonly string[],
): Promise<void> {
  for (const [position, value] of values.entries()) {
    await transaction.run(
      `INSERT INTO content_terms
        (owner_type, owner_id, content_version, term_type, position, term_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ownerType, ownerId, contentVersion, termType, position, value],
    );
  }
}

async function insertCoreContent(transaction: SqlExecutor, dataset: ContentDataset): Promise<void> {
  for (const record of dataset.trigrams) {
    await transaction.run(
      `INSERT INTO trigrams
        (trigram_id, content_version, source_id, source_version, status, name, symbol, code,
         line_1, line_2, line_3, classical_text, modern_text, name_traditional, element_id,
         yin_yang_class, family_role_id, later_heaven_direction_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.nameSimplified,
        record.unicodeSymbol,
        record.code,
        ...record.lineBits,
        findText(
          dataset,
          'trigram',
          record.id,
          ['trigram-classical'],
          ['canonical', 'classical-commentary'],
        ),
        findText(
          dataset,
          'trigram',
          record.id,
          ['plain-explanation'],
          ['modern-plain', 'product-original'],
        ),
        record.nameTraditional,
        record.elementId,
        record.yinYangClass,
        record.familyRoleId,
        record.laterHeavenDirectionId,
      ],
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'trigram',
      record.id,
      'natural-image',
      record.naturalImages,
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'trigram',
      record.id,
      'virtue',
      record.virtues,
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'trigram',
      record.id,
      'alias',
      record.aliases,
    );
  }
  for (const record of dataset.hexagrams) {
    await transaction.run(
      `INSERT INTO hexagrams
        (hexagram_id, content_version, source_id, source_version, status, king_wen_sequence,
         name, upper_trigram_id, lower_trigram_id, code, classical_text, modern_text,
         name_traditional, unicode_symbol, sequence_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.kingWenSequence,
        record.nameSimplified,
        record.upperTrigramId,
        record.lowerTrigramId,
        record.code,
        findText(dataset, 'hexagram', record.id, ['judgment'], ['canonical']),
        findText(
          dataset,
          'hexagram',
          record.id,
          ['plain-explanation'],
          ['modern-plain', 'product-original'],
        ),
        record.nameTraditional,
        record.unicodeSymbol,
        record.sequenceNote,
      ],
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'hexagram',
      record.id,
      'alias',
      record.aliases,
    );
  }
  for (const record of dataset.hexagramLines) {
    await transaction.run(
      `INSERT INTO hexagram_lines
        (line_id, content_version, source_id, source_version, status, hexagram_id,
         line_position, classical_text, modern_text, polarity, line_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.hexagramId,
        record.linePosition,
        findText(dataset, 'hexagram-line', record.id, ['line-text'], ['canonical']),
        findText(
          dataset,
          'hexagram-line',
          record.id,
          ['plain-explanation'],
          ['modern-plain', 'product-original'],
        ),
        record.polarity,
        record.lineName,
      ],
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'hexagram-line',
      record.id,
      'semantic-tag',
      record.semanticTags,
    );
  }
  for (const record of dataset.specialLineTexts) {
    await transaction.run(
      `INSERT INTO special_line_texts
        (special_line_id, content_version, source_id, source_version, status, hexagram_id,
         kind, classical_text, modern_text, ruleset_id, ruleset_version, trigger_type,
         trigger_line_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.hexagramId,
        record.kind,
        findText(dataset, 'special-line', record.id, ['line-text'], ['canonical']),
        findText(
          dataset,
          'special-line',
          record.id,
          ['plain-explanation'],
          ['modern-plain', 'product-original'],
        ),
        record.rulesetId,
        record.rulesetVersion,
        record.trigger.type,
        record.trigger.lineValue,
      ],
    );
  }
  for (const record of dataset.contentTexts) {
    await transaction.run(
      `INSERT INTO content_texts
        (text_id, content_version, owner_type, owner_id, text_type, text_class, locale, text_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.contentVersion,
        record.ownerType,
        record.ownerId,
        record.textType,
        record.textClass,
        record.locale,
        record.text,
      ],
    );
  }
}

async function insertProfessionalContent(
  transaction: SqlExecutor,
  dataset: ContentDataset,
): Promise<void> {
  for (const record of dataset.earthlyBranches) {
    await transaction.run(
      `INSERT INTO earthly_branches
        (branch_id, content_version, source_id, source_version, status, branch_order,
         name_simplified, name_traditional, element_id, yin_yang)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.order,
        record.nameSimplified,
        record.nameTraditional,
        record.elementId,
        record.yinYang,
      ],
    );
  }
  for (const record of dataset.sixSpirits) {
    await transaction.run(
      `INSERT INTO six_spirits
        (spirit_id, content_version, source_id, source_version, status, spirit_order,
         name_simplified, name_traditional)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.order,
        record.nameSimplified,
        record.nameTraditional,
      ],
    );
  }
  for (const record of dataset.palaceHexagrams) {
    await transaction.run(
      `INSERT INTO palace_hexagrams
        (palace_hexagram_id, content_version, source_id, source_version, status,
         ruleset_id, ruleset_version, palace_trigram_id, hexagram_id, palace_position,
         shi_position, ying_position, stage, palace_element_id, transformation_mask)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        record.palaceTrigramId,
        record.hexagramId,
        record.palaceSequence + 1,
        record.shiPosition,
        record.yingPosition,
        record.stage,
        record.palaceElementId,
        record.transformationMask,
      ],
    );
  }
  for (const record of dataset.najiaAssignments) {
    await transaction.run(
      `INSERT INTO najia_assignments
        (najia_assignment_id, content_version, source_id, source_version, status,
         ruleset_id, ruleset_version, trigram_id, polarity, line_position,
         heavenly_stem_id, earthly_branch_id, scope, local_line, absolute_line_hint,
         branch_element_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        record.trigramId,
        record.scope === 'inner' ? 'yin' : 'yang',
        record.localLine,
        record.heavenlyStemId,
        record.earthlyBranchId,
        record.scope,
        record.localLine,
        record.absoluteLineHint,
        record.branchElementId,
      ],
    );
  }
  for (const record of dataset.sixRelativeRules) {
    await transaction.run(
      `INSERT INTO six_relative_rules
        (rule_id, content_version, source_id, source_version, status, ruleset_id,
         ruleset_version, subject_element, object_element, relative, formula_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        record.subjectElementId,
        record.objectElementId,
        record.relative,
        record.formulaCode,
      ],
    );
  }
  for (const record of dataset.sixSpiritRules) {
    await transaction.run(
      `INSERT INTO six_spirit_rules
        (rule_id, content_version, source_id, source_version, status, ruleset_id,
         ruleset_version, day_stem_id, start_spirit_id, sequence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        record.dayStemId,
        record.startSpiritId,
        1,
      ],
    );
  }
  for (const record of dataset.branchRelations) {
    const firstBranch = record.branchIds[0];
    if (firstBranch === undefined) throw new Error(`Relation ${record.id} has no branches.`);
    const secondBranch = record.branchIds[1] ?? firstBranch;
    await transaction.run(
      `INSERT INTO branch_relations
        (relation_id, content_version, source_id, source_version, status, ruleset_id,
         ruleset_version, branch_a_id, branch_b_id, relation_type, directional,
         relation_kind, result_element_id, priority, enabled_by_default,
         evidence_requirement, relation_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        firstBranch,
        secondBranch,
        legacyRelationType(record.relationType),
        record.directional ? 1 : 0,
        record.relationType,
        record.resultElementId,
        record.priority,
        record.enabledByDefault ? 1 : 0,
        record.evidenceRequirement,
        record.notes,
      ],
    );
    for (const [index, branchId] of record.branchIds.entries()) {
      await transaction.run(
        `INSERT INTO branch_relation_members
          (relation_id, content_version, member_position, branch_id)
         VALUES (?, ?, ?, ?)`,
        [record.id, record.contentVersion, index + 1, branchId],
      );
    }
  }
}

async function insertPresentationContent(
  transaction: SqlExecutor,
  dataset: ContentDataset,
): Promise<void> {
  for (const record of dataset.questionCategories) {
    await transaction.run(
      `INSERT INTO question_categories
        (category_id, content_version, source_id, source_version, status, label, description,
         parent_category_id, useful_god_strategy, world_response_policy, disclaimer_key,
         sensitivity_level, ruleset_id, ruleset_version, template_group, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.label,
        record.description,
        record.parentCategoryId,
        record.usefulGodStrategy,
        record.worldResponsePolicy,
        record.disclaimerKey,
        record.sensitivityLevel,
        record.rulesetId,
        record.rulesetVersion,
        record.templateGroup,
        record.enabled ? 1 : 0,
      ],
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'question-category',
      record.id,
      'required-context',
      record.requiredContextFields,
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'question-category',
      record.id,
      'secondary-focus',
      record.secondaryFocus,
    );
    await insertTerms(
      transaction,
      record.contentVersion,
      'question-category',
      record.id,
      'allowed-subcategory',
      record.allowedSubcategoryIds,
    );
  }
  for (const record of dataset.interpretationTemplates) {
    await transaction.run(
      `INSERT INTO interpretation_templates
        (template_id, content_version, source_id, source_version, status, category_id,
         template_key, template_text, safety_tags, template_version, locale, output_level,
         primary_symbol, trend, ruleset_id, ruleset_version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.categoryId,
        record.templateKey,
        record.templateText,
        JSON.stringify(record.safetyTags),
        record.templateVersion,
        record.locale,
        record.outputLevel,
        record.primarySymbol,
        record.trend,
        record.rulesetId,
        record.rulesetVersion,
      ],
    );
    for (const variable of record.variables) {
      await transaction.run(
        `INSERT INTO template_variables
          (template_id, content_version, variable_name, fact_path)
         VALUES (?, ?, ?, ?)`,
        [record.id, record.contentVersion, variable.name, variable.factPath],
      );
    }
  }
  for (const record of dataset.ruleDefinitions) {
    await transaction.run(
      `INSERT INTO rule_definitions
        (rule_id, content_version, source_id, source_version, status, ruleset_id,
         ruleset_version, rule_type, rule_key, priority, input_fields, output_fields,
         conflict_strategy, description, source_locator)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        ...baseValues(record),
        record.rulesetId,
        record.rulesetVersion,
        record.ruleType,
        record.ruleKey,
        record.priority,
        JSON.stringify(record.inputFields),
        JSON.stringify(record.outputFields),
        record.conflictStrategy,
        record.description,
        record.sourceLocator,
      ],
    );
  }
}

async function insertAuditRecords(
  transaction: SqlExecutor,
  dataset: ContentDataset,
): Promise<void> {
  const collections: readonly (readonly [string, readonly AuditedRecord[]])[] = [
    ['trigram', dataset.trigrams],
    ['hexagram', dataset.hexagrams],
    ['hexagram-line', dataset.hexagramLines],
    ['special-line', dataset.specialLineTexts],
    ['content-text', dataset.contentTexts],
    ['palace-hexagram', dataset.palaceHexagrams],
    ['earthly-branch', dataset.earthlyBranches],
    ['najia-assignment', dataset.najiaAssignments],
    ['six-relative-rule', dataset.sixRelativeRules],
    ['six-spirit', dataset.sixSpirits],
    ['six-spirit-rule', dataset.sixSpiritRules],
    ['branch-relation', dataset.branchRelations],
    ['question-category', dataset.questionCategories],
    ['interpretation-template', dataset.interpretationTemplates],
    ['rule-definition', dataset.ruleDefinitions],
  ];
  for (const [recordType, records] of collections) {
    for (const record of records) {
      await transaction.run(
        `INSERT INTO content_record_audit
          (record_type, record_id, content_version, content_layer, source_id, source_version,
           source_locator, original_script, normalization_notes, editorial_changes,
           verified_by, verified_at, record_checksum)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordType,
          record.id,
          record.contentVersion,
          record.contentLayer,
          record.sourceId,
          record.sourceVersion,
          record.sourceLocator,
          record.originalScript,
          record.normalizationNotes,
          record.editorialChanges,
          record.verifiedBy,
          record.verifiedAt,
          record.checksum,
        ],
      );
    }
  }
}

export class ContentImporter {
  public constructor(
    private readonly database: SqlDatabase,
    private readonly hashProvider: HashProvider,
  ) {}

  public async import(input: unknown, options: ImportContentOptions): Promise<ContentImportReport> {
    const validation = validateContentDataset(input, { environment: options.environment });
    if (!validation.report.valid || validation.dataset === null) {
      throw new ContentImportError(
        'CONTENT_VALIDATION_FAILED',
        'Content import stopped because schema or business validation failed.',
        validation.report,
      );
    }
    const dataset = validation.dataset;
    const payloadHash = await this.hashProvider.sha256(canonicalJson(dataset));
    const sourceHashes = new Map<string, string>();
    for (const source of dataset.dataSources) {
      sourceHashes.set(
        `${source.sourceId}@${source.sourceVersion}`,
        await this.hashProvider.sha256(canonicalJson(source)),
      );
    }
    const recordCount = validation.report.counts.totalContentRecords;

    const status = await this.database.transaction(async (transaction) => {
      const existing = await transaction.getFirst<ExistingContentVersionRow>(
        `SELECT payload_hash, record_count FROM content_versions WHERE content_version = ?`,
        [dataset.version.contentVersion],
      );
      if (existing !== null) {
        if (existing.payload_hash !== payloadHash || existing.record_count !== recordCount) {
          throw new ContentImportError(
            'CONTENT_VERSION_HASH_MISMATCH',
            `Content version ${dataset.version.contentVersion} changed without a version change.`,
          );
        }
        await insertSources(transaction, dataset, sourceHashes);
        const importedCount = await countImportedContent(
          transaction,
          dataset.version.contentVersion,
        );
        if (importedCount !== recordCount) {
          throw new ContentImportError(
            'CONTENT_DATABASE_MISMATCH',
            `Content version ${dataset.version.contentVersion} has ${importedCount} rows; expected ${recordCount}.`,
          );
        }
        return 'already-imported' as const;
      }

      await transaction.run(
        `INSERT INTO content_versions
          (content_version, schema_version, status, completeness_mode, source_file,
           payload_hash, record_count, created_at, imported_at, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dataset.version.contentVersion,
          dataset.version.schemaVersion,
          dataset.version.status,
          dataset.version.completenessMode,
          options.sourceFile,
          payloadHash,
          recordCount,
          dataset.version.createdAt,
          options.importedAt,
          dataset.version.notes,
        ],
      );
      await insertSources(transaction, dataset, sourceHashes);
      await insertRuleVersions(transaction, dataset);
      await insertCoreContent(transaction, dataset);
      await insertProfessionalContent(transaction, dataset);
      await insertPresentationContent(transaction, dataset);
      await insertAuditRecords(transaction, dataset);
      await transaction.run(
        `INSERT INTO content_import_reports
          (content_version, source_file, payload_hash, validation_report_json, imported_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          dataset.version.contentVersion,
          options.sourceFile,
          payloadHash,
          canonicalJson(validation.report),
          options.importedAt,
        ],
      );
      const importedCount = await countImportedContent(transaction, dataset.version.contentVersion);
      if (importedCount !== recordCount) {
        throw new ContentImportError(
          'CONTENT_DATABASE_MISMATCH',
          `Imported ${importedCount} rows; expected ${recordCount}.`,
        );
      }
      return 'imported' as const;
    });

    return {
      status,
      contentVersion: dataset.version.contentVersion,
      payloadHash,
      recordCount,
      validation: validation.report,
    };
  }
}

import { z } from 'zod';

const stableIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const versionSchema = z
  .string()
  .min(1)
  .refine((value) => value !== 'latest', 'Immutable versions cannot use "latest".');
const timestampSchema = z.string().datetime({ offset: true });
const checksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
const contentStatusSchema = z.enum(['draft', 'verified']);
const sourceReferenceSchema = z
  .object({ sourceId: stableIdSchema, sourceVersion: versionSchema })
  .strict();

const auditReferenceFields = {
  sourceId: stableIdSchema,
  sourceVersion: versionSchema,
  contentVersion: versionSchema,
  status: contentStatusSchema,
  sourceLocator: z.string().min(1),
  originalScript: z.enum(['simplified', 'traditional', 'mixed', 'not-applicable']),
  normalizationNotes: z.string(),
  editorialChanges: z.string(),
  verifiedBy: z.string().min(1).nullable(),
  verifiedAt: timestampSchema.nullable(),
  checksum: checksumSchema.nullable(),
} as const;

const ruleReferenceFields = {
  rulesetId: stableIdSchema,
  rulesetVersion: versionSchema,
} as const;

function requireVerifiedAudit(
  record: {
    readonly status: 'draft' | 'verified';
    readonly verifiedBy: string | null;
    readonly verifiedAt: string | null;
    readonly checksum: string | null;
  },
  context: z.RefinementCtx,
): void {
  if (record.status !== 'verified') return;
  if (record.verifiedBy === null || record.verifiedAt === null || record.checksum === null) {
    context.addIssue({
      code: 'custom',
      message: 'Verified records require verifiedBy, verifiedAt, and checksum.',
      path: ['status'],
    });
  }
}

export const dataSourceRecordSchema = z
  .object({
    sourceId: stableIdSchema,
    sourceVersion: versionSchema,
    title: z.string().min(1),
    authorOrEditor: z.string().min(1).nullable(),
    dynastyOrYear: z.string().min(1).nullable(),
    edition: z.string().min(1).nullable(),
    publisherOrPlatform: z.string().min(1).nullable(),
    locator: z.string().min(1).nullable(),
    sourceType: z.enum([
      'primary-text',
      'classical-text',
      'ancient-commentary',
      'modern-study',
      'web-transcription',
      'authorized-dataset',
      'internal-derivation',
      'product-original',
      'pending',
    ]),
    url: z.string().url().nullable(),
    licenseStatus: z.enum(['cleared', 'public-domain', 'restricted', 'pending']),
    publicDomainStatus: z.enum(['confirmed', 'not-public-domain', 'unclear', 'not-applicable']),
    transcriptionStatus: z.enum(['not-applicable', 'raw', 'normalized', 'proofread']),
    proofreadingStatus: z.enum(['not-applicable', 'pending', 'single-reviewed', 'double-reviewed']),
    accessedAt: timestampSchema.nullable(),
    reliabilityGrade: z.enum(['A', 'B', 'C', 'P']),
    status: contentStatusSchema,
    verifiedBy: z.string().min(1).nullable(),
    verifiedAt: timestampSchema.nullable(),
    notes: z.string(),
  })
  .strict()
  .superRefine((source, context) => {
    if (source.status !== 'verified') return;
    if (source.verifiedBy === null || source.verifiedAt === null) {
      context.addIssue({
        code: 'custom',
        message: 'Verified sources require verifiedBy and verifiedAt.',
        path: ['verifiedBy'],
      });
    }
    if (
      source.sourceType === 'pending' ||
      source.licenseStatus === 'pending' ||
      source.reliabilityGrade === 'P'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Verified sources cannot retain pending provenance metadata.',
        path: ['status'],
      });
    }
  });

export const contentVersionRecordSchema = z
  .object({
    contentVersion: versionSchema,
    schemaVersion: versionSchema,
    status: contentStatusSchema,
    completenessMode: z.enum(['partial', 'complete']),
    createdAt: timestampSchema,
    notes: z.string(),
  })
  .strict();

export const ruleVersionRecordSchema = z
  .object({
    ...ruleReferenceFields,
    systemName: z.string().min(1),
    status: z.enum(['draft', 'verified', 'retired']),
    releaseStatus: z.enum(['draft', 'reviewed', 'released', 'deprecated']),
    parentVersion: versionSchema.nullable(),
    effectiveFrom: timestampSchema.nullable(),
    sourceRefs: z.array(sourceReferenceSchema).readonly(),
    scope: z.string().min(1),
    changelog: z.string(),
    breakingChanges: z.array(z.string().min(1)).readonly(),
    sourceManifestHash: checksumSchema.nullable(),
    rulesHash: checksumSchema.nullable(),
    createdAt: timestampSchema,
    verifiedBy: z.string().min(1).nullable(),
    verifiedAt: timestampSchema.nullable(),
    reviewedBy: z.string().min(1).nullable(),
    releasedAt: timestampSchema.nullable(),
    notes: z.string(),
  })
  .strict()
  .superRefine((version, context) => {
    if (version.status !== 'verified') return;
    if (
      version.releaseStatus !== 'released' ||
      version.sourceRefs.length === 0 ||
      version.verifiedBy === null ||
      version.verifiedAt === null ||
      version.reviewedBy === null ||
      version.releasedAt === null ||
      version.sourceManifestHash === null ||
      version.rulesHash === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Verified rule versions require a released, reviewed, hashed source manifest.',
        path: ['status'],
      });
    }
  });

const yinYangBitSchema = z.union([z.literal(0), z.literal(1)]);
const trigramBitsSchema = z.tuple([yinYangBitSchema, yinYangBitSchema, yinYangBitSchema]);
const hexagramBitsSchema = z.tuple([
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
]);

export const trigramRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('classical'),
    ...auditReferenceFields,
    nameSimplified: z.string().min(1),
    nameTraditional: z.string().min(1).nullable(),
    unicodeSymbol: z.string().min(1),
    code: z.string().regex(/^[01]{3}$/),
    lineBits: trigramBitsSchema,
    elementId: stableIdSchema.nullable(),
    yinYangClass: z.enum(['yin', 'yang']).nullable(),
    familyRoleId: stableIdSchema.nullable(),
    laterHeavenDirectionId: stableIdSchema.nullable(),
    naturalImages: z.array(z.string().min(1)).readonly(),
    virtues: z.array(z.string().min(1)).readonly(),
    aliases: z.array(z.string().min(1)).readonly(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if (record.code !== record.lineBits.join('')) {
      context.addIssue({ code: 'custom', message: 'code must equal lineBits.', path: ['code'] });
    }
  });

export const hexagramRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('classical'),
    ...auditReferenceFields,
    kingWenSequence: z.number().int().min(1).max(64),
    nameSimplified: z.string().min(1),
    nameTraditional: z.string().min(1).nullable(),
    unicodeSymbol: z.string().min(1),
    aliases: z.array(z.string().min(1)).readonly(),
    upperTrigramId: stableIdSchema,
    lowerTrigramId: stableIdSchema,
    code: z.string().regex(/^[01]{6}$/),
    lineBits: hexagramBitsSchema,
    sequenceNote: z.string(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if (record.code !== record.lineBits.join('')) {
      context.addIssue({ code: 'custom', message: 'code must equal lineBits.', path: ['code'] });
    }
  });

export const hexagramLineRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('classical'),
    ...auditReferenceFields,
    hexagramId: stableIdSchema,
    linePosition: z.number().int().min(1).max(6),
    polarity: z.enum(['yin', 'yang']),
    lineName: z.string().min(1),
    semanticTags: z.array(stableIdSchema).readonly(),
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const specialLineTextRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('classical'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    hexagramId: stableIdSchema,
    kind: z.enum(['use-nine', 'use-six']),
    trigger: z
      .object({
        type: z.literal('all-six-lines-equal'),
        lineValue: z.union([z.literal(6), z.literal(9)]),
      })
      .strict(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    const expected = record.kind === 'use-nine' ? 9 : 6;
    if (record.trigger.lineValue !== expected) {
      context.addIssue({
        code: 'custom',
        message: `${record.kind} requires lineValue ${expected}.`,
        path: ['trigger', 'lineValue'],
      });
    }
  });

export const contentTextRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.enum(['classical', 'product']),
    ...auditReferenceFields,
    ownerType: z.enum(['trigram', 'hexagram', 'hexagram-line', 'special-line']),
    ownerId: stableIdSchema,
    textType: z.enum([
      'trigram-classical',
      'judgment',
      'tuan',
      'image',
      'wenyan',
      'line-text',
      'small-image',
      'annotation',
      'plain-explanation',
    ]),
    textClass: z.enum(['canonical', 'classical-commentary', 'modern-plain', 'product-original']),
    locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/),
    text: z.string().min(1),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if (
      (record.textClass === 'canonical' || record.textClass === 'classical-commentary') &&
      record.contentLayer !== 'classical'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Classical text classes must use the classical content layer.',
        path: ['contentLayer'],
      });
    }
    if (
      (record.textClass === 'modern-plain' || record.textClass === 'product-original') &&
      record.contentLayer !== 'product'
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Modern/product text must use the product content layer.',
        path: ['contentLayer'],
      });
    }
  });

export const palaceHexagramRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    palaceTrigramId: stableIdSchema,
    palaceElementId: stableIdSchema,
    hexagramId: stableIdSchema,
    palaceSequence: z.number().int().min(0).max(7),
    stage: z.enum([
      'base',
      'first-change',
      'second-change',
      'third-change',
      'fourth-change',
      'fifth-change',
      'wandering-soul',
      'returning-soul',
    ]),
    transformationMask: z.string().regex(/^[01]{6}$/),
    shiPosition: z.number().int().min(1).max(6),
    yingPosition: z.number().int().min(1).max(6),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if (record.shiPosition === record.yingPosition) {
      context.addIssue({
        code: 'custom',
        message: 'shiPosition and yingPosition must differ.',
        path: ['yingPosition'],
      });
    }
  });

export const earthlyBranchRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    order: z.number().int().min(1).max(12),
    nameSimplified: z.string().min(1),
    nameTraditional: z.string().min(1),
    elementId: stableIdSchema,
    yinYang: z.enum(['yin', 'yang']),
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const najiaAssignmentRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    trigramId: stableIdSchema,
    scope: z.enum(['inner', 'outer']),
    localLine: z.number().int().min(1).max(3),
    absoluteLineHint: z.number().int().min(1).max(6),
    heavenlyStemId: stableIdSchema,
    earthlyBranchId: stableIdSchema,
    branchElementId: stableIdSchema,
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    const expected = record.scope === 'inner' ? record.localLine : record.localLine + 3;
    if (record.absoluteLineHint !== expected) {
      context.addIssue({
        code: 'custom',
        message: 'absoluteLineHint must match scope and localLine.',
        path: ['absoluteLineHint'],
      });
    }
  });

export const sixRelativeRuleRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    subjectElementId: stableIdSchema,
    objectElementId: stableIdSchema,
    relative: z.enum(['parent', 'sibling', 'offspring', 'wealth', 'official']),
    formulaCode: stableIdSchema,
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const sixSpiritRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    order: z.number().int().min(1).max(6),
    nameSimplified: z.string().min(1),
    nameTraditional: z.string().min(1),
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const sixSpiritRuleRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    dayStemId: stableIdSchema,
    startSpiritId: stableIdSchema,
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const branchRelationRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    branchIds: z.array(stableIdSchema).min(1).max(3).readonly(),
    relationType: z.enum([
      'six-harmony',
      'six-clash',
      'three-harmony',
      'half-harmony',
      'directional-harmony',
      'punishment',
      'harm',
      'break',
      'generate',
      'control',
    ]),
    resultElementId: stableIdSchema.nullable(),
    directional: z.boolean(),
    priority: z.number().int(),
    enabledByDefault: z.boolean(),
    evidenceRequirement: z.string().min(1),
    notes: z.string(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if (new Set(record.branchIds).size !== record.branchIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'branchIds cannot repeat within one relation.',
        path: ['branchIds'],
      });
    }
  });

export const questionCategoryRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('product'),
    ...auditReferenceFields,
    parentCategoryId: stableIdSchema.nullable(),
    label: z.string().min(1),
    description: z.string().min(1).nullable(),
    requiredContextFields: z.array(stableIdSchema).readonly(),
    usefulGodStrategy: stableIdSchema.nullable(),
    secondaryFocus: z.array(stableIdSchema).readonly(),
    worldResponsePolicy: stableIdSchema.nullable(),
    allowedSubcategoryIds: z.array(stableIdSchema).readonly(),
    disclaimerKey: stableIdSchema.nullable(),
    sensitivityLevel: z.enum(['normal', 'sensitive', 'high-risk']),
    rulesetId: stableIdSchema.nullable(),
    rulesetVersion: versionSchema.nullable(),
    templateGroup: stableIdSchema,
    enabled: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if ((record.rulesetId === null) !== (record.rulesetVersion === null)) {
      context.addIssue({
        code: 'custom',
        message: 'rulesetId and rulesetVersion must both be null or both be present.',
        path: ['rulesetId'],
      });
    }
  });

const templateVariableSchema = z
  .object({
    name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
    factPath: z.string().regex(/^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*$/),
  })
  .strict();

export const interpretationTemplateRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('product'),
    ...auditReferenceFields,
    categoryId: stableIdSchema.nullable(),
    templateKey: stableIdSchema,
    templateVersion: versionSchema,
    locale: z.string().regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]+)*$/),
    outputLevel: z.enum(['summary', 'standard', 'detailed']),
    primarySymbol: z
      .enum([
        'auspicious',
        'inauspicious',
        'remorse',
        'regret',
        'danger',
        'blameless',
        'undetermined',
      ])
      .nullable(),
    trend: z.enum(['rising', 'falling', 'stable', 'turning', 'undetermined']).nullable(),
    rulesetId: stableIdSchema.nullable(),
    rulesetVersion: versionSchema.nullable(),
    templateText: z.string().min(1),
    variables: z.array(templateVariableSchema).readonly(),
    safetyTags: z.array(stableIdSchema).readonly(),
  })
  .strict()
  .superRefine((record, context) => {
    requireVerifiedAudit(record, context);
    if ((record.rulesetId === null) !== (record.rulesetVersion === null)) {
      context.addIssue({
        code: 'custom',
        message: 'rulesetId and rulesetVersion must both be null or both be present.',
        path: ['rulesetId'],
      });
    }
  });

export const ruleDefinitionRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('professional'),
    ...auditReferenceFields,
    ...ruleReferenceFields,
    ruleType: stableIdSchema,
    ruleKey: stableIdSchema,
    priority: z.number().int(),
    inputFields: z.array(z.string().min(1)).readonly(),
    outputFields: z.array(z.string().min(1)).readonly(),
    conflictStrategy: z.string().min(1),
    description: z.string().min(1),
  })
  .strict()
  .superRefine(requireVerifiedAudit);

export const contentDatasetSchema = z
  .object({
    $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
    schemaId: z.string().url(),
    version: contentVersionRecordSchema,
    dataSources: z.array(dataSourceRecordSchema).readonly(),
    ruleVersions: z.array(ruleVersionRecordSchema).readonly(),
    trigrams: z.array(trigramRecordSchema).readonly(),
    hexagrams: z.array(hexagramRecordSchema).readonly(),
    hexagramLines: z.array(hexagramLineRecordSchema).readonly(),
    specialLineTexts: z.array(specialLineTextRecordSchema).readonly(),
    contentTexts: z.array(contentTextRecordSchema).readonly(),
    palaceHexagrams: z.array(palaceHexagramRecordSchema).readonly(),
    earthlyBranches: z.array(earthlyBranchRecordSchema).readonly(),
    najiaAssignments: z.array(najiaAssignmentRecordSchema).readonly(),
    sixRelativeRules: z.array(sixRelativeRuleRecordSchema).readonly(),
    sixSpirits: z.array(sixSpiritRecordSchema).readonly(),
    sixSpiritRules: z.array(sixSpiritRuleRecordSchema).readonly(),
    branchRelations: z.array(branchRelationRecordSchema).readonly(),
    questionCategories: z.array(questionCategoryRecordSchema).readonly(),
    interpretationTemplates: z.array(interpretationTemplateRecordSchema).readonly(),
    ruleDefinitions: z.array(ruleDefinitionRecordSchema).readonly(),
  })
  .strict();

export interface ContentValidationIssue {
  readonly phase: 'schema' | 'business';
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface ContentValidationCounts {
  readonly dataSources: number;
  readonly ruleVersions: number;
  readonly trigrams: number;
  readonly hexagrams: number;
  readonly hexagramLines: number;
  readonly specialLineTexts: number;
  readonly contentTexts: number;
  readonly palaceHexagrams: number;
  readonly earthlyBranches: number;
  readonly najiaAssignments: number;
  readonly sixRelativeRules: number;
  readonly sixSpirits: number;
  readonly sixSpiritRules: number;
  readonly branchRelations: number;
  readonly questionCategories: number;
  readonly interpretationTemplates: number;
  readonly ruleDefinitions: number;
  readonly totalContentRecords: number;
  readonly draftRecords: number;
}

export interface ContentValidationReport {
  readonly valid: boolean;
  readonly contentVersion: string | null;
  readonly completenessMode: 'partial' | 'complete' | null;
  readonly counts: ContentValidationCounts;
  readonly missingSourceRefs: readonly string[];
  readonly issues: readonly ContentValidationIssue[];
}

export interface ContentValidationResult {
  readonly dataset: ContentDataset | null;
  readonly report: ContentValidationReport;
}

export interface ValidateContentDatasetOptions {
  readonly environment: 'production' | 'draft' | 'fixture';
}

const zeroCounts: ContentValidationCounts = {
  dataSources: 0,
  ruleVersions: 0,
  trigrams: 0,
  hexagrams: 0,
  hexagramLines: 0,
  specialLineTexts: 0,
  contentTexts: 0,
  palaceHexagrams: 0,
  earthlyBranches: 0,
  najiaAssignments: 0,
  sixRelativeRules: 0,
  sixSpirits: 0,
  sixSpiritRules: 0,
  branchRelations: 0,
  questionCategories: 0,
  interpretationTemplates: 0,
  ruleDefinitions: 0,
  totalContentRecords: 0,
  draftRecords: 0,
};

type VersionedContentRecord =
  | TrigramRecord
  | HexagramRecord
  | HexagramLineRecord
  | SpecialLineTextRecord
  | ContentTextRecord
  | PalaceHexagramRecord
  | EarthlyBranchRecord
  | NajiaAssignmentRecord
  | SixRelativeRuleRecord
  | SixSpiritRecord
  | SixSpiritRuleRecord
  | BranchRelationRecord
  | QuestionCategoryRecord
  | InterpretationTemplateRecord
  | RuleDefinitionRecord;

function namedContentCollections(
  dataset: ContentDataset,
): readonly (readonly [string, readonly VersionedContentRecord[]])[] {
  return [
    ['trigrams', dataset.trigrams],
    ['hexagrams', dataset.hexagrams],
    ['hexagramLines', dataset.hexagramLines],
    ['specialLineTexts', dataset.specialLineTexts],
    ['contentTexts', dataset.contentTexts],
    ['palaceHexagrams', dataset.palaceHexagrams],
    ['earthlyBranches', dataset.earthlyBranches],
    ['najiaAssignments', dataset.najiaAssignments],
    ['sixRelativeRules', dataset.sixRelativeRules],
    ['sixSpirits', dataset.sixSpirits],
    ['sixSpiritRules', dataset.sixSpiritRules],
    ['branchRelations', dataset.branchRelations],
    ['questionCategories', dataset.questionCategories],
    ['interpretationTemplates', dataset.interpretationTemplates],
    ['ruleDefinitions', dataset.ruleDefinitions],
  ];
}

function contentCollections(
  dataset: ContentDataset,
): readonly (readonly VersionedContentRecord[])[] {
  return namedContentCollections(dataset).map(([, records]) => records);
}

function countDataset(dataset: ContentDataset): ContentValidationCounts {
  const contentRecords = contentCollections(dataset).flat();
  return {
    dataSources: dataset.dataSources.length,
    ruleVersions: dataset.ruleVersions.length,
    trigrams: dataset.trigrams.length,
    hexagrams: dataset.hexagrams.length,
    hexagramLines: dataset.hexagramLines.length,
    specialLineTexts: dataset.specialLineTexts.length,
    contentTexts: dataset.contentTexts.length,
    palaceHexagrams: dataset.palaceHexagrams.length,
    earthlyBranches: dataset.earthlyBranches.length,
    najiaAssignments: dataset.najiaAssignments.length,
    sixRelativeRules: dataset.sixRelativeRules.length,
    sixSpirits: dataset.sixSpirits.length,
    sixSpiritRules: dataset.sixSpiritRules.length,
    branchRelations: dataset.branchRelations.length,
    questionCategories: dataset.questionCategories.length,
    interpretationTemplates: dataset.interpretationTemplates.length,
    ruleDefinitions: dataset.ruleDefinitions.length,
    totalContentRecords: contentRecords.length,
    draftRecords:
      contentRecords.filter((record) => record.status === 'draft').length +
      dataset.dataSources.filter((source) => source.status === 'draft').length +
      dataset.ruleVersions.filter((version) => version.status === 'draft').length,
  };
}

function key(...parts: readonly (string | number)[]): string {
  return parts.map((part) => `${String(part).length}:${String(part)}`).join('|');
}

function pushIssue(
  issues: ContentValidationIssue[],
  code: string,
  path: string,
  message: string,
): void {
  issues.push({ phase: 'business', code, path, message });
}

function pushDuplicateIssues<T>(
  records: readonly T[],
  makeKey: (record: T) => string,
  path: string,
  code: string,
  issues: ContentValidationIssue[],
): void {
  const seen = new Set<string>();
  records.forEach((record, index) => {
    const recordKey = makeKey(record);
    if (seen.has(recordKey)) {
      pushIssue(issues, code, `${path}.${index}`, `Duplicate key ${recordKey}.`);
    }
    seen.add(recordKey);
  });
}

const stageRules = {
  base: { sequence: 0, shi: 6, ying: 3 },
  'first-change': { sequence: 1, shi: 1, ying: 4 },
  'second-change': { sequence: 2, shi: 2, ying: 5 },
  'third-change': { sequence: 3, shi: 3, ying: 6 },
  'fourth-change': { sequence: 4, shi: 4, ying: 1 },
  'fifth-change': { sequence: 5, shi: 5, ying: 2 },
  'wandering-soul': { sequence: 6, shi: 4, ying: 1 },
  'returning-soul': { sequence: 7, shi: 3, ying: 6 },
} as const;

function validateCompleteDataset(dataset: ContentDataset, issues: ContentValidationIssue[]): void {
  if (dataset.trigrams.length !== 8) {
    pushIssue(issues, 'TRIGRAM_COUNT', 'trigrams', 'A complete dataset requires 8 trigrams.');
  }
  const trigramCodes = new Set(dataset.trigrams.map((record) => record.code));
  for (const number of Array.from({ length: 8 }, (_, index) =>
    index.toString(2).padStart(3, '0'),
  )) {
    if (!trigramCodes.has(number)) {
      pushIssue(issues, 'TRIGRAM_CODE_COVERAGE', 'trigrams', `Missing trigram code ${number}.`);
    }
  }
  if (dataset.hexagrams.length !== 64) {
    pushIssue(issues, 'HEXAGRAM_COUNT', 'hexagrams', 'A complete dataset requires 64 hexagrams.');
  }
  const sequence = new Set(dataset.hexagrams.map((record) => record.kingWenSequence));
  if (Array.from({ length: 64 }, (_, index) => index + 1).some((number) => !sequence.has(number))) {
    pushIssue(
      issues,
      'KING_WEN_SEQUENCE_COVERAGE',
      'hexagrams',
      'King Wen sequence must cover 1 through 64 exactly once.',
    );
  }
  if (dataset.hexagramLines.length !== 384) {
    pushIssue(
      issues,
      'HEXAGRAM_LINE_COUNT',
      'hexagramLines',
      'A complete dataset requires exactly 384 ordinary line records.',
    );
  }
  for (const hexagram of dataset.hexagrams) {
    const positions = dataset.hexagramLines
      .filter((line) => line.hexagramId === hexagram.id)
      .map((line) => line.linePosition);
    if (
      positions.length !== 6 ||
      [1, 2, 3, 4, 5, 6].some((position) => !positions.includes(position))
    ) {
      pushIssue(
        issues,
        'LINE_POSITION_COVERAGE',
        hexagram.id,
        `Hexagram ${hexagram.id} must have line positions 1 through 6 exactly once.`,
      );
    }
    if (
      !dataset.contentTexts.some(
        (text) =>
          text.ownerType === 'hexagram' &&
          text.ownerId === hexagram.id &&
          text.textType === 'judgment' &&
          text.textClass === 'canonical',
      )
    ) {
      pushIssue(
        issues,
        'MISSING_HEXAGRAM_JUDGMENT_TEXT',
        hexagram.id,
        `Hexagram ${hexagram.id} requires a canonical judgment text.`,
      );
    }
  }
  for (const line of dataset.hexagramLines) {
    if (
      !dataset.contentTexts.some(
        (text) =>
          text.ownerType === 'hexagram-line' &&
          text.ownerId === line.id &&
          text.textType === 'line-text' &&
          text.textClass === 'canonical',
      )
    ) {
      pushIssue(
        issues,
        'MISSING_LINE_TEXT',
        line.id,
        `Line ${line.id} requires a canonical line text.`,
      );
    }
  }
  const allYang = dataset.hexagrams.find((record) => record.code === '111111');
  const allYin = dataset.hexagrams.find((record) => record.code === '000000');
  if (
    allYang === undefined ||
    !dataset.specialLineTexts.some(
      (record) => record.kind === 'use-nine' && record.hexagramId === allYang.id,
    )
  ) {
    pushIssue(
      issues,
      'MISSING_USE_NINE',
      'specialLineTexts',
      'The all-yang hexagram requires use-nine.',
    );
  }
  if (
    allYin === undefined ||
    !dataset.specialLineTexts.some(
      (record) => record.kind === 'use-six' && record.hexagramId === allYin.id,
    )
  ) {
    pushIssue(
      issues,
      'MISSING_USE_SIX',
      'specialLineTexts',
      'The all-yin hexagram requires use-six.',
    );
  }
  if (dataset.specialLineTexts.length !== 2) {
    pushIssue(
      issues,
      'SPECIAL_LINE_COUNT',
      'specialLineTexts',
      'A complete dataset requires two special texts.',
    );
  }
  for (const special of dataset.specialLineTexts) {
    if (
      !dataset.contentTexts.some(
        (text) =>
          text.ownerType === 'special-line' &&
          text.ownerId === special.id &&
          text.textType === 'line-text' &&
          text.textClass === 'canonical',
      )
    ) {
      pushIssue(
        issues,
        'MISSING_SPECIAL_LINE_TEXT',
        special.id,
        `Special record ${special.id} requires canonical text.`,
      );
    }
  }

  const grouped = new Map<string, PalaceHexagramRecord[]>();
  for (const record of dataset.palaceHexagrams) {
    const group = key(record.rulesetId, record.rulesetVersion);
    grouped.set(group, [...(grouped.get(group) ?? []), record]);
  }
  if (grouped.size === 0) {
    pushIssue(
      issues,
      'PALACE_RULESET_MISSING',
      'palaceHexagrams',
      'Complete data requires a palace ruleset.',
    );
  }
  for (const [group, records] of grouped) {
    if (records.length !== 64) {
      pushIssue(issues, 'PALACE_COUNT', group, 'Each complete palace ruleset requires 64 records.');
    }
    for (const trigram of dataset.trigrams) {
      const palace = records.filter((record) => record.palaceTrigramId === trigram.id);
      if (palace.length !== 8 || new Set(palace.map((record) => record.stage)).size !== 8) {
        pushIssue(
          issues,
          'PALACE_STAGE_COVERAGE',
          trigram.id,
          'Each palace requires all eight stages.',
        );
      }
    }
  }

  const najiaGroups = new Map<string, NajiaAssignmentRecord[]>();
  for (const record of dataset.najiaAssignments) {
    const group = key(record.rulesetId, record.rulesetVersion);
    najiaGroups.set(group, [...(najiaGroups.get(group) ?? []), record]);
  }
  if (najiaGroups.size === 0) {
    pushIssue(
      issues,
      'NAJIA_RULESET_MISSING',
      'najiaAssignments',
      'Complete data requires a Najia ruleset.',
    );
  }
  for (const [group, records] of najiaGroups) {
    if (records.length !== 48) {
      pushIssue(
        issues,
        'NAJIA_COUNT',
        group,
        'Each complete Najia ruleset requires 48 assignments.',
      );
    }
  }

  const relativeGroups = new Map<string, SixRelativeRuleRecord[]>();
  for (const record of dataset.sixRelativeRules) {
    const group = key(record.rulesetId, record.rulesetVersion);
    relativeGroups.set(group, [...(relativeGroups.get(group) ?? []), record]);
  }
  for (const [group, records] of relativeGroups) {
    const subjects = new Set(records.map((record) => record.subjectElementId));
    const objects = new Set(records.map((record) => record.objectElementId));
    if (records.length !== 25 || subjects.size !== 5 || objects.size !== 5) {
      pushIssue(
        issues,
        'SIX_RELATIVE_COVERAGE',
        group,
        'Six-relative matrix must cover 5 by 5 elements.',
      );
    }
  }
  if (relativeGroups.size === 0) {
    pushIssue(
      issues,
      'SIX_RELATIVE_RULESET_MISSING',
      'sixRelativeRules',
      'Complete data requires six-relative rules.',
    );
  }

  if (dataset.earthlyBranches.length !== 12) {
    pushIssue(
      issues,
      'EARTHLY_BRANCH_COUNT',
      'earthlyBranches',
      'Complete data requires 12 earthly branches.',
    );
  }
  if (dataset.sixSpirits.length !== 6) {
    pushIssue(
      issues,
      'SIX_SPIRIT_COUNT',
      'sixSpirits',
      'Complete data requires six spirit catalog records.',
    );
  }
  const spiritGroups = new Map<string, SixSpiritRuleRecord[]>();
  for (const record of dataset.sixSpiritRules) {
    const group = key(record.rulesetId, record.rulesetVersion);
    spiritGroups.set(group, [...(spiritGroups.get(group) ?? []), record]);
  }
  for (const [group, records] of spiritGroups) {
    if (records.length !== 10 || new Set(records.map((record) => record.dayStemId)).size !== 10) {
      pushIssue(
        issues,
        'SIX_SPIRIT_STEM_COVERAGE',
        group,
        'Six-spirit rules must cover ten day stems.',
      );
    }
  }
  if (spiritGroups.size === 0) {
    pushIssue(
      issues,
      'SIX_SPIRIT_RULESET_MISSING',
      'sixSpiritRules',
      'Complete data requires six-spirit rules.',
    );
  }
}

function validateBusinessRules(
  dataset: ContentDataset,
  options: ValidateContentDatasetOptions,
): { readonly issues: ContentValidationIssue[]; readonly missingSourceRefs: string[] } {
  const issues: ContentValidationIssue[] = [];
  const missingSourceRefs = new Set<string>();
  const sources = new Map(
    dataset.dataSources.map((source) => [key(source.sourceId, source.sourceVersion), source]),
  );
  const trigrams = new Map(dataset.trigrams.map((record) => [record.id, record]));
  const hexagrams = new Map(dataset.hexagrams.map((record) => [record.id, record]));
  const lines = new Map(dataset.hexagramLines.map((record) => [record.id, record]));
  const specialLines = new Set(dataset.specialLineTexts.map((record) => record.id));
  const branches = new Map(dataset.earthlyBranches.map((record) => [record.id, record]));
  const spirits = new Set(dataset.sixSpirits.map((record) => record.id));
  const categories = new Set(dataset.questionCategories.map((record) => record.id));
  const ruleVersions = new Set(
    dataset.ruleVersions.map((version) => key(version.rulesetId, version.rulesetVersion)),
  );
  const contentRecords = contentCollections(dataset).flat();

  pushDuplicateIssues(
    dataset.dataSources,
    (record) => key(record.sourceId, record.sourceVersion),
    'dataSources',
    'DUPLICATE_SOURCE',
    issues,
  );
  pushDuplicateIssues(
    dataset.ruleVersions,
    (record) => key(record.rulesetId, record.rulesetVersion),
    'ruleVersions',
    'DUPLICATE_RULE_VERSION',
    issues,
  );
  for (const [collectionName, records] of namedContentCollections(dataset)) {
    pushDuplicateIssues(records, (record) => record.id, collectionName, 'DUPLICATE_ID', issues);
  }

  for (const record of contentRecords) {
    if (record.contentVersion !== dataset.version.contentVersion) {
      pushIssue(
        issues,
        'CONTENT_VERSION_MISMATCH',
        record.id,
        `Record ${record.id} does not match the dataset version.`,
      );
    }
    const source = sources.get(key(record.sourceId, record.sourceVersion));
    if (source === undefined) {
      missingSourceRefs.add(`${record.sourceId}@${record.sourceVersion}`);
      pushIssue(
        issues,
        'MISSING_SOURCE',
        record.id,
        `Missing source ${record.sourceId}@${record.sourceVersion}.`,
      );
    } else if (record.status === 'verified' && source.status !== 'verified') {
      pushIssue(
        issues,
        'UNVERIFIED_SOURCE',
        record.id,
        `Verified record ${record.id} references an unverified source.`,
      );
    }
  }
  for (const version of dataset.ruleVersions) {
    for (const sourceRef of version.sourceRefs) {
      if (!sources.has(key(sourceRef.sourceId, sourceRef.sourceVersion))) {
        missingSourceRefs.add(`${sourceRef.sourceId}@${sourceRef.sourceVersion}`);
        pushIssue(
          issues,
          'MISSING_RULE_SOURCE',
          `${version.rulesetId}@${version.rulesetVersion}`,
          `Missing rule source ${sourceRef.sourceId}@${sourceRef.sourceVersion}.`,
        );
      }
    }
  }

  if (options.environment === 'production') {
    if (dataset.version.status !== 'verified') {
      pushIssue(
        issues,
        'PRODUCTION_VERSION_NOT_VERIFIED',
        'version.status',
        'Production datasets must be verified.',
      );
    }
    for (const record of contentRecords) {
      if (record.status !== 'verified') {
        pushIssue(
          issues,
          'DRAFT_IN_PRODUCTION',
          record.id,
          `Draft record ${record.id} cannot enter production.`,
        );
      }
    }
    for (const source of dataset.dataSources) {
      if (
        source.status !== 'verified' ||
        !['cleared', 'public-domain'].includes(source.licenseStatus)
      ) {
        pushIssue(
          issues,
          'UNPUBLISHABLE_SOURCE',
          `${source.sourceId}@${source.sourceVersion}`,
          'Production sources must be verified and publishable.',
        );
      }
    }
  }

  pushDuplicateIssues(
    dataset.trigrams,
    (record) => record.code,
    'trigrams',
    'DUPLICATE_TRIGRAM_CODE',
    issues,
  );
  pushDuplicateIssues(
    dataset.trigrams,
    (record) => record.unicodeSymbol,
    'trigrams',
    'DUPLICATE_TRIGRAM_SYMBOL',
    issues,
  );
  pushDuplicateIssues(
    dataset.hexagrams,
    (record) => key(record.upperTrigramId, record.lowerTrigramId),
    'hexagrams',
    'DUPLICATE_HEXAGRAM_COMBINATION',
    issues,
  );
  pushDuplicateIssues(
    dataset.hexagrams,
    (record) => String(record.kingWenSequence),
    'hexagrams',
    'DUPLICATE_KING_WEN_SEQUENCE',
    issues,
  );
  pushDuplicateIssues(
    dataset.hexagrams,
    (record) => record.unicodeSymbol,
    'hexagrams',
    'DUPLICATE_HEXAGRAM_SYMBOL',
    issues,
  );
  pushDuplicateIssues(
    dataset.hexagramLines,
    (record) => key(record.hexagramId, record.linePosition),
    'hexagramLines',
    'DUPLICATE_LINE_POSITION',
    issues,
  );
  pushDuplicateIssues(
    dataset.specialLineTexts,
    (record) => record.kind,
    'specialLineTexts',
    'DUPLICATE_SPECIAL_LINE_KIND',
    issues,
  );
  pushDuplicateIssues(
    dataset.contentTexts,
    (record) => key(record.ownerType, record.ownerId, record.textType, record.locale),
    'contentTexts',
    'DUPLICATE_CONTENT_TEXT',
    issues,
  );
  pushDuplicateIssues(
    dataset.earthlyBranches,
    (record) => String(record.order),
    'earthlyBranches',
    'DUPLICATE_BRANCH_ORDER',
    issues,
  );
  pushDuplicateIssues(
    dataset.sixSpirits,
    (record) => String(record.order),
    'sixSpirits',
    'DUPLICATE_SPIRIT_ORDER',
    issues,
  );

  for (const record of dataset.hexagrams) {
    const upper = trigrams.get(record.upperTrigramId);
    const lower = trigrams.get(record.lowerTrigramId);
    if (upper === undefined || lower === undefined) {
      pushIssue(
        issues,
        'INVALID_HEXAGRAM_TRIGRAM_REF',
        record.id,
        'Hexagram references an unknown trigram.',
      );
    } else if (record.code !== `${lower.code}${upper.code}`) {
      pushIssue(
        issues,
        'HEXAGRAM_CODE_MISMATCH',
        record.id,
        'Hexagram code must be lower then upper trigram code.',
      );
    }
  }
  for (const record of dataset.hexagramLines) {
    const hexagram = hexagrams.get(record.hexagramId);
    if (hexagram === undefined) {
      pushIssue(
        issues,
        'INVALID_LINE_HEXAGRAM_REF',
        record.id,
        'Line references an unknown hexagram.',
      );
      continue;
    }
    const expected = hexagram.lineBits[record.linePosition - 1] === 1 ? 'yang' : 'yin';
    if (record.polarity !== expected) {
      pushIssue(
        issues,
        'LINE_POLARITY_MISMATCH',
        record.id,
        'Line polarity does not match the hexagram bit.',
      );
    }
  }
  for (const record of dataset.specialLineTexts) {
    if (!hexagrams.has(record.hexagramId)) {
      pushIssue(
        issues,
        'INVALID_SPECIAL_LINE_REF',
        record.id,
        'Special line references an unknown hexagram.',
      );
    }
  }

  for (const record of dataset.contentTexts) {
    const validOwner =
      (record.ownerType === 'trigram' && trigrams.has(record.ownerId)) ||
      (record.ownerType === 'hexagram' && hexagrams.has(record.ownerId)) ||
      (record.ownerType === 'hexagram-line' && lines.has(record.ownerId)) ||
      (record.ownerType === 'special-line' && specialLines.has(record.ownerId));
    if (!validOwner) {
      pushIssue(
        issues,
        'INVALID_CONTENT_TEXT_OWNER',
        record.id,
        'Content text references an unknown or mismatched owner.',
      );
    }
    const source = sources.get(key(record.sourceId, record.sourceVersion));
    if (
      options.environment === 'production' &&
      (record.textClass === 'modern-plain' || record.textClass === 'product-original') &&
      source !== undefined &&
      !['product-original', 'authorized-dataset'].includes(source.sourceType)
    ) {
      pushIssue(
        issues,
        'MODERN_TEXT_SOURCE_NOT_AUTHORIZED',
        record.id,
        'Production modern text must be original or explicitly authorized.',
      );
    }
  }

  const recordsWithRuleVersion = [
    ...dataset.specialLineTexts,
    ...dataset.palaceHexagrams,
    ...dataset.najiaAssignments,
    ...dataset.sixRelativeRules,
    ...dataset.sixSpiritRules,
    ...dataset.branchRelations,
    ...dataset.ruleDefinitions,
  ];
  for (const record of recordsWithRuleVersion) {
    if (!ruleVersions.has(key(record.rulesetId, record.rulesetVersion))) {
      pushIssue(
        issues,
        'INVALID_RULE_VERSION_REF',
        record.id,
        'Record references an unknown rule version.',
      );
    }
  }
  for (const record of dataset.palaceHexagrams) {
    const palaceTrigram = trigrams.get(record.palaceTrigramId);
    if (palaceTrigram === undefined || !hexagrams.has(record.hexagramId)) {
      pushIssue(
        issues,
        'INVALID_PALACE_REF',
        record.id,
        'Palace record has an unknown trigram or hexagram.',
      );
    } else if (
      palaceTrigram.elementId === null ||
      record.palaceElementId !== palaceTrigram.elementId
    ) {
      pushIssue(
        issues,
        'PALACE_ELEMENT_MISMATCH',
        record.id,
        'Palace element must match the palace trigram catalog.',
      );
    }
    const expected = stageRules[record.stage];
    if (
      record.palaceSequence !== expected.sequence ||
      record.shiPosition !== expected.shi ||
      record.yingPosition !== expected.ying
    ) {
      pushIssue(
        issues,
        'PALACE_STAGE_POSITION_MISMATCH',
        record.id,
        'Palace stage, sequence, shi and ying positions disagree.',
      );
    }
  }
  pushDuplicateIssues(
    dataset.palaceHexagrams,
    (record) => key(record.rulesetId, record.rulesetVersion, record.hexagramId),
    'palaceHexagrams',
    'DUPLICATE_PALACE_HEXAGRAM',
    issues,
  );
  pushDuplicateIssues(
    dataset.palaceHexagrams,
    (record) => key(record.rulesetId, record.rulesetVersion, record.palaceTrigramId, record.stage),
    'palaceHexagrams',
    'DUPLICATE_PALACE_STAGE',
    issues,
  );

  for (const record of dataset.najiaAssignments) {
    const branch = branches.get(record.earthlyBranchId);
    if (!trigrams.has(record.trigramId)) {
      pushIssue(
        issues,
        'INVALID_NAJIA_TRIGRAM_REF',
        record.id,
        'Najia assignment references an unknown trigram.',
      );
    }
    if (branch === undefined) {
      pushIssue(
        issues,
        'INVALID_NAJIA_BRANCH_REF',
        record.id,
        'Najia assignment references an unknown branch.',
      );
    } else if (branch.elementId !== record.branchElementId) {
      pushIssue(
        issues,
        'NAJIA_BRANCH_ELEMENT_MISMATCH',
        record.id,
        'Najia branch element must match the branch catalog.',
      );
    }
  }
  pushDuplicateIssues(
    dataset.najiaAssignments,
    (record) =>
      key(
        record.rulesetId,
        record.rulesetVersion,
        record.trigramId,
        record.scope,
        record.localLine,
      ),
    'najiaAssignments',
    'DUPLICATE_NAJIA_KEY',
    issues,
  );
  pushDuplicateIssues(
    dataset.sixRelativeRules,
    (record) =>
      key(record.rulesetId, record.rulesetVersion, record.subjectElementId, record.objectElementId),
    'sixRelativeRules',
    'DUPLICATE_SIX_RELATIVE_KEY',
    issues,
  );
  pushDuplicateIssues(
    dataset.sixSpiritRules,
    (record) => key(record.rulesetId, record.rulesetVersion, record.dayStemId),
    'sixSpiritRules',
    'DUPLICATE_SIX_SPIRIT_STEM',
    issues,
  );
  for (const record of dataset.sixSpiritRules) {
    if (!spirits.has(record.startSpiritId)) {
      pushIssue(
        issues,
        'INVALID_SIX_SPIRIT_REF',
        record.id,
        'Six-spirit rule references an unknown spirit.',
      );
    }
  }
  for (const record of dataset.branchRelations) {
    for (const branchId of record.branchIds) {
      if (!branches.has(branchId)) {
        pushIssue(issues, 'INVALID_BRANCH_RELATION_REF', record.id, `Unknown branch ${branchId}.`);
      }
    }
  }
  pushDuplicateIssues(
    dataset.branchRelations,
    (record) =>
      key(
        record.rulesetId,
        record.rulesetVersion,
        record.relationType,
        ...(record.directional ? record.branchIds : [...record.branchIds].sort()),
      ),
    'branchRelations',
    'DUPLICATE_BRANCH_RELATION',
    issues,
  );

  for (const record of dataset.questionCategories) {
    if (record.parentCategoryId !== null && !categories.has(record.parentCategoryId)) {
      pushIssue(
        issues,
        'INVALID_PARENT_CATEGORY_REF',
        record.id,
        'Category references an unknown parent.',
      );
    }
    for (const child of record.allowedSubcategoryIds) {
      if (!categories.has(child)) {
        pushIssue(
          issues,
          'INVALID_ALLOWED_SUBCATEGORY_REF',
          record.id,
          `Unknown subcategory ${child}.`,
        );
      }
    }
    if (
      record.rulesetId !== null &&
      record.rulesetVersion !== null &&
      !ruleVersions.has(key(record.rulesetId, record.rulesetVersion))
    ) {
      pushIssue(
        issues,
        'INVALID_CATEGORY_RULESET_REF',
        record.id,
        'Category references an unknown rule version.',
      );
    }
  }
  for (const record of dataset.interpretationTemplates) {
    if (record.categoryId !== null && !categories.has(record.categoryId)) {
      pushIssue(
        issues,
        'INVALID_TEMPLATE_CATEGORY_REF',
        record.id,
        'Template references an unknown category.',
      );
    }
    if (
      record.rulesetId !== null &&
      record.rulesetVersion !== null &&
      !ruleVersions.has(key(record.rulesetId, record.rulesetVersion))
    ) {
      pushIssue(
        issues,
        'INVALID_TEMPLATE_RULESET_REF',
        record.id,
        'Template references an unknown rule version.',
      );
    }
    const defined = new Set(record.variables.map((variable) => variable.name));
    const used = Array.from(
      record.templateText.matchAll(/\{\{\s*([a-z][a-zA-Z0-9]*)\s*\}\}/g),
      (match) => match[1],
    );
    for (const variable of used) {
      if (variable !== undefined && !defined.has(variable)) {
        pushIssue(
          issues,
          'UNDEFINED_TEMPLATE_VARIABLE',
          record.id,
          `Template variable ${variable} is not defined.`,
        );
      }
    }
  }

  if (options.environment === 'production') {
    const placeholderPattern = /待补充|示例解释|placeholder|\b(?:todo|tbd)\b/i;
    const userFacingTexts: readonly (readonly [string, string])[] = [
      ...dataset.trigrams.map(
        (record) => [record.id, `${record.nameSimplified}\n${record.nameTraditional}`] as const,
      ),
      ...dataset.hexagrams.map(
        (record) => [record.id, `${record.nameSimplified}\n${record.nameTraditional}`] as const,
      ),
      ...dataset.hexagramLines.map((record) => [record.id, record.lineName] as const),
      ...dataset.contentTexts.map((record) => [record.id, record.text] as const),
      ...dataset.questionCategories.map(
        (record) => [record.id, `${record.label}\n${record.description ?? ''}`] as const,
      ),
      ...dataset.interpretationTemplates.map((record) => [record.id, record.templateText] as const),
    ];
    for (const [recordId, text] of userFacingTexts) {
      if (placeholderPattern.test(text)) {
        pushIssue(
          issues,
          'PRODUCTION_PLACEHOLDER_TEXT',
          recordId,
          `Production record ${recordId} contains placeholder text.`,
        );
      }
    }
  }

  if (dataset.version.completenessMode === 'complete') {
    validateCompleteDataset(dataset, issues);
  }
  return { issues, missingSourceRefs: [...missingSourceRefs].sort() };
}

export function validateContentDataset(
  input: unknown,
  options: ValidateContentDatasetOptions,
): ContentValidationResult {
  const parsed = contentDatasetSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map<ContentValidationIssue>((issue) => ({
      phase: 'schema',
      code: issue.code,
      path: issue.path.join('.'),
      message: issue.message,
    }));
    return {
      dataset: null,
      report: {
        valid: false,
        contentVersion: null,
        completenessMode: null,
        counts: zeroCounts,
        missingSourceRefs: [],
        issues,
      },
    };
  }
  const business = validateBusinessRules(parsed.data, options);
  return {
    dataset: parsed.data,
    report: {
      valid: business.issues.length === 0,
      contentVersion: parsed.data.version.contentVersion,
      completenessMode: parsed.data.version.completenessMode,
      counts: countDataset(parsed.data),
      missingSourceRefs: business.missingSourceRefs,
      issues: business.issues,
    },
  };
}

export type ContentDataset = z.infer<typeof contentDatasetSchema>;
export type DataSourceRecord = z.infer<typeof dataSourceRecordSchema>;
export type ContentVersionRecord = z.infer<typeof contentVersionRecordSchema>;
export type RuleVersionRecord = z.infer<typeof ruleVersionRecordSchema>;
export type TrigramRecord = z.infer<typeof trigramRecordSchema>;
export type HexagramRecord = z.infer<typeof hexagramRecordSchema>;
export type HexagramLineRecord = z.infer<typeof hexagramLineRecordSchema>;
export type SpecialLineTextRecord = z.infer<typeof specialLineTextRecordSchema>;
export type ContentTextRecord = z.infer<typeof contentTextRecordSchema>;
export type PalaceHexagramRecord = z.infer<typeof palaceHexagramRecordSchema>;
export type EarthlyBranchRecord = z.infer<typeof earthlyBranchRecordSchema>;
export type NajiaAssignmentRecord = z.infer<typeof najiaAssignmentRecordSchema>;
export type SixRelativeRuleRecord = z.infer<typeof sixRelativeRuleRecordSchema>;
export type SixSpiritRecord = z.infer<typeof sixSpiritRecordSchema>;
export type SixSpiritRuleRecord = z.infer<typeof sixSpiritRuleRecordSchema>;
export type BranchRelationRecord = z.infer<typeof branchRelationRecordSchema>;
export type QuestionCategoryRecord = z.infer<typeof questionCategoryRecordSchema>;
export type InterpretationTemplateRecord = z.infer<typeof interpretationTemplateRecordSchema>;
export type RuleDefinitionRecord = z.infer<typeof ruleDefinitionRecordSchema>;

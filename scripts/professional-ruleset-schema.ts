import { z } from 'zod';

const id = z.string().min(1);
const immutableVersion = z
  .string()
  .min(1)
  .refine((value) => value !== 'latest', {
    message: 'Versions must be immutable and cannot be latest.',
  });
const linePosition = z.number().int().min(1).max(6);
const elementId = id;
const branchId = id;
const relative = z.enum(['parent', 'sibling', 'offspring', 'wealth', 'official']);

const sourceRef = z
  .object({
    sourceId: id,
    sourceVersion: immutableVersion,
    sourceLocator: id,
    verificationStatus: z.enum(['production_candidate', 'production_verified', 'pending']),
  })
  .strict();

const versioned = {
  ruleId: id,
  rulesetId: id,
  rulesetVersion: immutableVersion,
  contentVersion: immutableVersion,
  sourceId: id,
  sourceVersion: immutableVersion,
  sourceLocator: id,
} as const;

const metadata = z
  .object({
    rulesetId: id,
    rulesetVersion: immutableVersion,
    contentVersion: immutableVersion,
    calendarAlgorithmVersion: immutableVersion,
    timezoneDataVersion: immutableVersion,
    compatibilityGroup: id,
    verificationStatus: z.enum(['production_candidate', 'production_verified', 'test-only']),
    sourceManifestHash: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .nullable(),
    rulesHash: z
      .string()
      .regex(/^[a-fA-F0-9]{64}$/)
      .nullable(),
    verifiedBy: z.array(id).readonly(),
    verifiedAt: z.iso.datetime({ offset: true }).nullable(),
    sources: z.array(sourceRef).readonly(),
    dayBoundaryPolicy: z.enum(['civil-midnight', 'zi-hour', 'true-solar-zi-hour']),
    trueSolarTimeEnabled: z.boolean(),
  })
  .strict();

const palaceRule = z
  .object({
    ...versioned,
    hexagramId: id,
    palaceTrigramId: id,
    palaceElementId: elementId,
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
    worldPosition: linePosition,
    responsePosition: linePosition,
  })
  .strict();

const najiaRule = z
  .object({
    ...versioned,
    trigramId: id,
    scope: z.enum(['inner', 'outer']),
    localLine: z.number().int().min(1).max(3),
    heavenlyStemId: id,
    earthlyBranchId: branchId,
  })
  .strict();

const earthlyBranchRule = z
  .object({
    ...versioned,
    branchId,
    order: z.number().int().min(1).max(12),
    elementId,
  })
  .strict();

const sixRelativeRule = z
  .object({
    ...versioned,
    palaceElementId: elementId,
    lineElementId: elementId,
    relative,
    formulaCode: id,
  })
  .strict();

const sixSpirit = z
  .object({ ...versioned, spiritId: id, order: z.number().int().min(1).max(6) })
  .strict();

const sixSpiritStartRule = z.object({ ...versioned, dayStemId: id, startSpiritId: id }).strict();

const voidRule = z
  .object({
    ...versioned,
    cycleStartIndex: z.union([
      z.literal(0),
      z.literal(10),
      z.literal(20),
      z.literal(30),
      z.literal(40),
      z.literal(50),
    ]),
    voidBranches: z.tuple([branchId, branchId]).readonly(),
  })
  .strict();

const branchRelationRule = z
  .object({
    ...versioned,
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
    branchIds: z.array(branchId).min(2).max(3).readonly(),
    directional: z.boolean(),
    resultElementId: elementId.nullable(),
    priority: z.number().int(),
    enabled: z.boolean(),
    interpretationMode: z.enum(['active', 'fact-only', 'disabled']),
  })
  .strict();

const usefulGodMatch = z
  .object({
    questionCategories: z.array(id).readonly(),
    questionSubcategories: z.array(id).readonly(),
    selfOrProxy: z.array(z.enum(['self', 'proxy'])).readonly(),
    subjectRoles: z.array(id).readonly(),
    targetRoles: z.array(id).readonly(),
    targetRelationships: z.array(id).readonly(),
    desiredOutcomes: z.array(id).readonly(),
    requiredContextTags: z.array(id).readonly(),
    traditionalGenderRule: z.enum(['required', 'forbidden', 'irrelevant']),
  })
  .strict();

const usefulGodRule = z
  .object({
    ...versioned,
    match: usefulGodMatch,
    relative,
    candidateRole: z.enum(['primary', 'secondary', 'contextual']),
    priority: z.number().int(),
    evidenceTemplate: id,
  })
  .strict();

const supportingRoleRule = z
  .object({
    ...versioned,
    usefulGodRelative: relative,
    supportingRelative: relative,
    avoidingRelative: relative,
    enemyRelative: relative,
  })
  .strict();

const hiddenSpiritRule = z
  .object({
    ...versioned,
    hexagramId: id,
    linePosition,
    hiddenRelative: relative,
    hiddenStemId: id,
    hiddenBranchId: branchId,
    flyingLinePosition: linePosition,
  })
  .strict();

export const professionalRulesetInputSchema = z
  .object({
    metadata,
    palaceRules: z.array(palaceRule).readonly(),
    najiaRules: z.array(najiaRule).readonly(),
    earthlyBranches: z.array(earthlyBranchRule).readonly(),
    sixRelativeRules: z.array(sixRelativeRule).readonly(),
    sixSpirits: z.array(sixSpirit).readonly(),
    sixSpiritStartRules: z.array(sixSpiritStartRule).readonly(),
    voidRules: z.array(voidRule).readonly(),
    branchRelationRules: z.array(branchRelationRule).readonly(),
    usefulGodRules: z.array(usefulGodRule).readonly(),
    supportingRoleRules: z.array(supportingRoleRule).readonly(),
    hiddenSpiritRules: z.array(hiddenSpiritRule).readonly(),
  })
  .strict();

const candidateStatus = z.literal('production_candidate');

export const professionalRulesetCandidateDocumentSchema = z
  .object({
    recordType: z.literal('professional-ruleset-candidate'),
    status: candidateStatus,
    generatedFrom: id,
    generatedFromSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    payloadSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    ruleset: professionalRulesetInputSchema.refine(
      (ruleset) => ruleset.metadata.verificationStatus === 'production_candidate',
      'Candidate document must contain a production_candidate ruleset.',
    ),
  })
  .strict();

export const professionalCalendarCandidateDocumentSchema = z
  .object({
    recordType: z.literal('professional-calendar-candidate'),
    status: candidateStatus,
    generatedFromSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    calendar: z.object({
      policyId: id,
      calendarAlgorithmVersion: immutableVersion,
      solarTermDataVersion: immutableVersion,
      timezoneDataVersion: immutableVersion,
      sourceIds: z.array(id).min(1),
      dayGanzhiAnchor: z.object({
        localDate: z.iso.date(),
        cycleIndex: z.number().int().min(0).max(59),
      }),
      coverageEndInclusiveInstant: z.iso.datetime({ offset: true }),
      solarTerms: z
        .array(
          z.object({
            id,
            instant: z.iso.datetime({ offset: true }),
            monthBranchId: id,
            changesMonthBranch: z.boolean(),
          }),
        )
        .min(1),
      timezones: z
        .array(
          z.object({
            timezone: id,
            initialOffsetSeconds: z.number().int(),
            initialIsDst: z.boolean(),
            transitions: z.array(
              z.object({
                instant: z.iso.datetime({ offset: true }),
                offsetSecondsAfter: z.number().int(),
                isDstAfter: z.boolean(),
              }),
            ),
          }),
        )
        .min(1),
    }),
  })
  .strict();

export const professionalSourceManifestCandidateDocumentSchema = z
  .object({
    recordType: z.literal('professional-source-manifest-candidate'),
    status: candidateStatus,
    generatedFromSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    sources: z
      .array(
        z.object({
          sourceId: id,
          title: id,
          sourceVersion: immutableVersion,
          verificationStatus: candidateStatus,
        }),
      )
      .min(1),
  })
  .strict();

export const professionalGoldCasesCandidateDocumentSchema = z
  .object({
    recordType: z.literal('professional-gold-cases-candidate'),
    status: z.literal('candidate_for_human_review'),
    generatedFromSha256: z.string().regex(/^[a-fA-F0-9]{64}$/),
    cases: z
      .array(
        z.object({
          caseId: id,
          status: z.literal('candidate_for_human_review'),
          reviewerSignoffsRequired: z.literal(2),
          reviewerSignoffsPresent: z.literal(0),
        }),
      )
      .min(1),
  })
  .strict();

export type ParsedProfessionalRulesetInput = z.infer<typeof professionalRulesetInputSchema>;

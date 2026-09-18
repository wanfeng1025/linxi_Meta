import { z } from 'zod';

export const candidateStatusSchema = z.enum(['production_candidate', 'editorial_original']);
export const draftSourceSchema = z
  .object({
    sourceId: z.string().min(1),
    sourceVersion: z.string().min(1),
    sourceLocator: z.string().min(1),
    revision: z.string().nullable(),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/i),
    verificationStatus: candidateStatusSchema,
  })
  .strict();

export const classicalTextUnitSchema = z
  .object({
    id: z.string().min(1),
    hexagramId: z.string().min(1),
    linePosition: z.number().int().min(1).max(6).nullable(),
    textKind: z.enum([
      'hexagram_judgment',
      'tuan_commentary',
      'great_image',
      'line_statement',
      'line_image',
      'special_use_statement',
      'special_use_image',
    ]),
    text: z.string().min(1),
    source: draftSourceSchema,
  })
  .strict();

export const classicalCandidatePackSchema = z
  .object({
    schemaVersion: z.literal('classical-text-units-v2'),
    source: draftSourceSchema,
    units: z.array(classicalTextUnitSchema),
  })
  .strict();

export const hexagramPageManifestSchema = z
  .object({
    schemaVersion: z.literal('hexagram-page-manifest-v1'),
    source: draftSourceSchema,
    entries: z
      .array(
        z
          .object({
            hexagramId: z.string().min(1),
            kingWenSequence: z.number().int().min(1).max(64),
            name: z.string().min(1),
            unicodeSymbol: z.string().min(1),
            upperTrigramId: z.string().min(1),
            lowerTrigramId: z.string().min(1),
          })
          .strict(),
      )
      .length(64),
  })
  .strict();

export const professionalCandidatePackSchema = z
  .object({
    schemaVersion: z.literal('professional-candidate-v1'),
    source: draftSourceSchema,
    ruleset: z
      .object({ id: z.literal('jingfang-yehe-baseline'), version: z.string().min(1) })
      .strict(),
    trigrams: z
      .array(z.object({ id: z.string(), fields: z.record(z.string(), z.unknown()) }).strict())
      .length(8),
    palaceMemberships: z
      .array(
        z
          .object({
            hexagramId: z.string(),
            palaceTrigramId: z.string(),
            stage: z.string(),
            shiPosition: z.number(),
            yingPosition: z.number(),
          })
          .strict(),
      )
      .length(64),
    najiaAssignments: z
      .array(
        z
          .object({
            trigramId: z.string(),
            scope: z.enum(['inner', 'outer']),
            localLine: z.number().int().min(1).max(3),
            heavenlyStem: z.string(),
            earthlyBranch: z.string(),
          })
          .strict(),
      )
      .length(48),
    sixRelativeRules: z
      .array(
        z
          .object({ palaceElement: z.string(), lineElement: z.string(), relative: z.string() })
          .strict(),
      )
      .length(25),
    sixSpiritAssignments: z
      .array(
        z
          .object({
            dayStem: z.string(),
            linePosition: z.number().int().min(1).max(6),
            spirit: z.string(),
          })
          .strict(),
      )
      .length(60),
    branchRelations: z
      .array(
        z
          .object({
            relationType: z.string(),
            branchIds: z.array(z.string()).min(1),
            resultElement: z.string().nullable(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const productCandidatePackSchema = z
  .object({
    schemaVersion: z.literal('product-editorial-candidate-v1'),
    source: draftSourceSchema,
    categories: z
      .array(
        z
          .object({
            id: z.string(),
            name: z.string(),
            primaryCandidate: z.string(),
            secondaryCandidates: z.array(z.string()),
            clarificationHint: z.string(),
          })
          .strict(),
      )
      .length(18),
    templates: z
      .array(
        z.object({ id: z.string(), text: z.string(), variables: z.array(z.string()) }).strict(),
      )
      .min(1),
    disclaimers: z.array(z.object({ id: z.string(), text: z.string() }).strict()).length(6),
  })
  .strict();

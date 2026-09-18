import { createHash } from 'node:crypto';

import { z } from 'zod';

import { canonicalJson } from '../src/shared/data/canonical-json';
import { dataSourceRecordSchema } from './content-data-schema';

const stableIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const versionSchema = z
  .string()
  .min(1)
  .refine((value) => value !== 'latest', 'Immutable versions cannot use "latest".');
const checksumSchema = z.string().regex(/^[a-f0-9]{64}$/);

const lineLabelToPosition = {
  初: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  上: 6,
} as const;

function positionForLineLabel(label: string): number | undefined {
  const marker =
    label.startsWith('初') || label.startsWith('上') ? label.slice(0, 1) : label.slice(1, 2);
  return lineLabelToPosition[marker as keyof typeof lineLabelToPosition];
}

export const authorizedInterpretationRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('modern-interpretation'),
    interpretationKind: z.enum(['judgment-explanation', 'line-explanation']),
    hexagramId: stableIdSchema,
    kingWenSequence: z.number().int().min(1).max(64),
    hexagramName: z.string().min(1),
    linePosition: z.number().int().min(1).max(6).nullable(),
    lineLabel: z.string().min(1).nullable(),
    canonicalQuoteId: stableIdSchema,
    locale: z.literal('zh-Hans'),
    interpretation: z.string().min(1),
    sourceId: stableIdSchema,
    sourceVersion: versionSchema,
    contentVersion: versionSchema,
    status: z.literal('verified'),
    sourceLocator: z.string().min(1),
    editorialNotes: z.string().min(1),
    checksum: checksumSchema,
  })
  .strict()
  .superRefine((record, context) => {
    const sequence = String(record.kingWenSequence).padStart(2, '0');
    const expectedPrefix = `classical-quote-hexagram-kw-${sequence}`;

    if (record.interpretationKind === 'judgment-explanation') {
      if (record.linePosition !== null || record.lineLabel !== null) {
        context.addIssue({
          code: 'custom',
          message: 'Judgment explanations cannot have a line position or label.',
          path: ['interpretationKind'],
        });
      }
      if (record.canonicalQuoteId !== `${expectedPrefix}-judgment`) {
        context.addIssue({
          code: 'custom',
          message: 'Judgment explanations must reference the matching judgment quote.',
          path: ['canonicalQuoteId'],
        });
      }
      return;
    }

    if (record.linePosition === null || record.lineLabel === null) {
      context.addIssue({
        code: 'custom',
        message: 'Line explanations require a line position and label.',
        path: ['linePosition'],
      });
      return;
    }
    if (positionForLineLabel(record.lineLabel) !== record.linePosition) {
      context.addIssue({
        code: 'custom',
        message: 'The line position must agree with the line label.',
        path: ['linePosition'],
      });
    }
    if (record.canonicalQuoteId !== `${expectedPrefix}-line-${record.linePosition}`) {
      context.addIssue({
        code: 'custom',
        message: 'Line explanations must reference the matching line quote.',
        path: ['canonicalQuoteId'],
      });
    }
  });

export const authorizedInterpretationDatasetSchema = z
  .object({
    $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
    schemaId: z.literal('https://liuyao.app/schemas/authorized-interpretation-dataset.schema.json'),
    schemaVersion: z.literal('authorized-interpretation-dataset-v1'),
    contentVersion: versionSchema,
    source: dataSourceRecordSchema,
    sourceFile: z
      .object({
        path: z.string().regex(/^data\/source\/interpretations\/[a-z0-9-]+\.txt$/),
        sha256: checksumSchema,
        byteCount: z.number().int().positive(),
      })
      .strict(),
    publication: z
      .object({
        status: z.literal('published'),
        displayPurpose: z.literal('educational-reference'),
        usableForWebResult: z.literal(true),
        usableForProfessionalRules: z.literal(false),
        usableForAiPrompting: z.literal(false),
        nonPredictionNotice: z.string().min(1),
      })
      .strict(),
    records: z.array(authorizedInterpretationRecordSchema).readonly(),
  })
  .strict()
  .superRefine((dataset, context) => {
    if (dataset.source.sourceVersion !== dataset.contentVersion) {
      context.addIssue({
        code: 'custom',
        message: 'The source version must equal the dataset contentVersion.',
        path: ['source', 'sourceVersion'],
      });
    }
    if (
      dataset.source.status !== 'verified' ||
      dataset.source.sourceType === 'pending' ||
      dataset.source.licenseStatus === 'pending' ||
      dataset.source.verifiedBy === null ||
      dataset.source.verifiedAt === null
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Published interpretation sources require verified provenance and cleared rights.',
        path: ['source'],
      });
    }
    for (const [index, record] of dataset.records.entries()) {
      if (
        record.sourceId !== dataset.source.sourceId ||
        record.sourceVersion !== dataset.contentVersion ||
        record.contentVersion !== dataset.contentVersion
      ) {
        context.addIssue({
          code: 'custom',
          message:
            'Every interpretation must reference this verified source and immutable version.',
          path: ['records', index],
        });
      }
    }
  });

export type AuthorizedInterpretationDataset = z.infer<typeof authorizedInterpretationDatasetSchema>;
export type AuthorizedInterpretationRecord = z.infer<typeof authorizedInterpretationRecordSchema>;

export function authorizedInterpretationChecksum(
  record: Omit<AuthorizedInterpretationRecord, 'checksum'>,
): string {
  return createHash('sha256').update(canonicalJson(record)).digest('hex');
}

export interface AuthorizedInterpretationValidationReport {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly judgmentCount: number;
  readonly lineExplanationCount: number;
}

export function validateAuthorizedInterpretationDataset(
  input: unknown,
): AuthorizedInterpretationValidationReport {
  const parsed = authorizedInterpretationDatasetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      judgmentCount: 0,
      lineExplanationCount: 0,
    };
  }

  const issues: string[] = [];
  const judgments = parsed.data.records.filter(
    (record) => record.interpretationKind === 'judgment-explanation',
  );
  const lines = parsed.data.records.filter(
    (record) => record.interpretationKind === 'line-explanation',
  );
  const seen = new Set<string>();

  for (const record of parsed.data.records) {
    const key = `${record.hexagramId}:${record.interpretationKind}:${record.linePosition ?? 'none'}`;
    if (seen.has(key)) issues.push(`duplicate interpretation key ${key}`);
    seen.add(key);

    const { checksum: storedChecksum, ...checksumInput } = record;
    if (authorizedInterpretationChecksum(checksumInput) !== storedChecksum) {
      issues.push(`checksum mismatch for ${record.id}`);
    }
  }

  if (judgments.length !== 64) {
    issues.push(`expected 64 judgment explanations, found ${judgments.length}`);
  }
  if (lines.length !== 384) {
    issues.push(`expected 384 line explanations, found ${lines.length}`);
  }
  for (let sequence = 1; sequence <= 64; sequence += 1) {
    const records = parsed.data.records.filter((record) => record.kingWenSequence === sequence);
    const judgment = records.filter(
      (record) => record.interpretationKind === 'judgment-explanation',
    );
    const positions = records
      .filter((record) => record.interpretationKind === 'line-explanation')
      .map((record) => record.linePosition);
    if (judgment.length !== 1) {
      issues.push(`King Wen sequence ${sequence} has ${judgment.length} judgment explanations`);
    }
    if (
      positions.length !== 6 ||
      [1, 2, 3, 4, 5, 6].some((position) => !positions.includes(position))
    ) {
      issues.push(`King Wen sequence ${sequence} does not cover line positions 1 through 6`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    judgmentCount: judgments.length,
    lineExplanationCount: lines.length,
  };
}

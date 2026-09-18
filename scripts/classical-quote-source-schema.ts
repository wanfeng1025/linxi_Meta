import { createHash } from 'node:crypto';

import { z } from 'zod';

import { canonicalJson } from '../src/shared/data/canonical-json';
import { dataSourceRecordSchema } from './content-data-schema';

const stableIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const versionSchema = z
  .string()
  .min(1)
  .refine((value) => value !== 'latest', 'Immutable versions cannot use "latest".');
const timestampSchema = z.string().datetime({ offset: true });
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

export const classicalQuoteRecordSchema = z
  .object({
    id: stableIdSchema,
    contentLayer: z.literal('classical'),
    quoteKind: z.enum(['judgment', 'line-text']),
    hexagramId: stableIdSchema,
    kingWenSequence: z.number().int().min(1).max(64),
    hexagramName: z.string().min(1),
    linePosition: z.number().int().min(1).max(6).nullable(),
    lineLabel: z.string().min(1).nullable(),
    textClass: z.literal('canonical'),
    locale: z.literal('zh-Hans'),
    text: z.string().min(1),
    sourceId: stableIdSchema,
    sourceVersion: versionSchema,
    contentVersion: versionSchema,
    status: z.literal('verified'),
    sourceLocator: z.string().min(1),
    originalScript: z.literal('simplified'),
    normalizationNotes: z.string().min(1),
    editorialChanges: z.string().min(1),
    verifiedBy: z.string().min(1),
    verifiedAt: timestampSchema,
    checksum: checksumSchema,
  })
  .strict()
  .superRefine((record, context) => {
    if (record.quoteKind === 'judgment') {
      if (record.linePosition !== null || record.lineLabel !== null) {
        context.addIssue({
          code: 'custom',
          message: 'Judgment quotes cannot have a line position or label.',
          path: ['quoteKind'],
        });
      }
      return;
    }

    if (record.linePosition === null || record.lineLabel === null) {
      context.addIssue({
        code: 'custom',
        message: 'Line-text quotes require a line position and label.',
        path: ['linePosition'],
      });
      return;
    }
    const expectedPosition = positionForLineLabel(record.lineLabel);
    if (expectedPosition !== record.linePosition) {
      context.addIssue({
        code: 'custom',
        message: 'The line position must agree with the line label.',
        path: ['linePosition'],
      });
    }
  });

export const authorizedClassicalQuoteDatasetSchema = z
  .object({
    $schema: z.literal('https://json-schema.org/draft/2020-12/schema'),
    schemaId: z.literal(
      'https://liuyao.app/schemas/authorized-classical-quote-dataset.schema.json',
    ),
    schemaVersion: z.literal('authorized-classical-quote-dataset-v1'),
    contentVersion: versionSchema,
    source: dataSourceRecordSchema,
    sourceFile: z
      .object({
        path: z.string().regex(/^data\/source\/classical\/[a-z0-9-]+\.txt$/),
        sha256: checksumSchema,
        byteCount: z.number().int().positive(),
      })
      .strict(),
    records: z.array(classicalQuoteRecordSchema).readonly(),
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
    for (const [index, record] of dataset.records.entries()) {
      if (
        record.sourceId !== dataset.source.sourceId ||
        record.sourceVersion !== dataset.source.sourceVersion ||
        record.contentVersion !== dataset.contentVersion
      ) {
        context.addIssue({
          code: 'custom',
          message: 'Every quote must reference this dataset source and immutable content version.',
          path: ['records', index],
        });
      }
    }
  });

export type AuthorizedClassicalQuoteDataset = z.infer<typeof authorizedClassicalQuoteDatasetSchema>;
export type ClassicalQuoteRecord = z.infer<typeof classicalQuoteRecordSchema>;

export function quoteChecksum(record: Omit<ClassicalQuoteRecord, 'checksum'>): string {
  return createHash('sha256').update(canonicalJson(record)).digest('hex');
}

export interface ClassicalQuoteValidationReport {
  readonly valid: boolean;
  readonly issues: readonly string[];
  readonly judgmentCount: number;
  readonly lineTextCount: number;
}

export function validateAuthorizedClassicalQuoteDataset(
  input: unknown,
): ClassicalQuoteValidationReport {
  const parsed = authorizedClassicalQuoteDatasetSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      judgmentCount: 0,
      lineTextCount: 0,
    };
  }

  const issues: string[] = [];
  const judgments = parsed.data.records.filter((record) => record.quoteKind === 'judgment');
  const lineTexts = parsed.data.records.filter((record) => record.quoteKind === 'line-text');
  const seen = new Set<string>();

  for (const record of parsed.data.records) {
    const key = `${record.hexagramId}:${record.quoteKind}:${record.linePosition ?? 'none'}`;
    if (seen.has(key)) issues.push(`duplicate quote key ${key}`);
    seen.add(key);

    const { checksum: storedChecksum, ...checksumInput } = record;
    if (quoteChecksum(checksumInput) !== storedChecksum) {
      issues.push(`checksum mismatch for ${record.id}`);
    }
  }

  if (judgments.length !== 64)
    issues.push(`expected 64 judgment quotes, found ${judgments.length}`);
  if (lineTexts.length !== 384)
    issues.push(`expected 384 line-text quotes, found ${lineTexts.length}`);

  for (let sequence = 1; sequence <= 64; sequence += 1) {
    const records = parsed.data.records.filter((record) => record.kingWenSequence === sequence);
    const judgment = records.filter((record) => record.quoteKind === 'judgment');
    const positions = records
      .filter((record) => record.quoteKind === 'line-text')
      .map((record) => record.linePosition);
    if (judgment.length !== 1)
      issues.push(`King Wen sequence ${sequence} has ${judgment.length} judgment quotes`);
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
    lineTextCount: lineTexts.length,
  };
}

import { z } from 'zod';

import {
  HexagramDomainError,
  assertCompleteHexagramCatalog,
  createHexagramCatalog,
} from '../src/domain/hexagram';

export const yinYangBitSchema = z.union([z.literal(0), z.literal(1)]);

export const trigramBitsSchema = z.tuple([yinYangBitSchema, yinYangBitSchema, yinYangBitSchema]);

export const hexagramBitsSchema = z.tuple([
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
  yinYangBitSchema,
]);

export const trigramContentSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    name: z.string().min(1),
    symbol: z.string().min(1),
    code: z.string().regex(/^[01]{3}$/),
    lineBits: trigramBitsSchema,
    element: z.string().min(1).nullable(),
    direction: z.string().min(1).nullable(),
    dataVersion: z.string().min(1),
  })
  .strict()
  .superRefine((content, context) => {
    if (content.code !== content.lineBits.join('')) {
      context.addIssue({
        code: 'custom',
        message: 'Trigram code must equal its bottom-to-top lineBits.',
        path: ['code'],
      });
    }
  });

export const hexagramContentSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    kingWenSequence: z.number().int().min(1).max(64),
    name: z.string().min(1),
    symbol: z.string().min(1),
    upperTrigramId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    lowerTrigramId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    code: z.string().regex(/^[01]{6}$/),
    lineBits: hexagramBitsSchema,
    dataVersion: z.string().min(1),
  })
  .strict()
  .superRefine((content, context) => {
    if (content.code !== content.lineBits.join('')) {
      context.addIssue({
        code: 'custom',
        message: 'Hexagram code must equal its bottom-to-top lineBits.',
        path: ['code'],
      });
    }
  });

export const sourceMetadataSchema = z
  .object({
    sourceId: z.string().min(1),
    sourceTitle: z.string().min(1),
    edition: z.string().min(1).nullable(),
    sourceType: z.enum([
      'classical-text',
      'modern-study',
      'authorized-dataset',
      'internal-derivation',
      'pending',
    ]),
    licenseStatus: z.enum(['cleared', 'public-domain', 'restricted', 'pending']),
    verifiedBy: z.string().min(1).nullable(),
    verifiedAt: z.string().datetime({ offset: true }).nullable(),
    notes: z.string(),
    contentVersion: z.string().min(1),
  })
  .strict();

export const traditionalContentRecordSchema = z
  .object({
    recordId: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    recordType: z.enum(['trigram', 'hexagram', 'line-text', 'professional-rule', 'example']),
    status: z.enum(['pending', 'verified']),
    source: sourceMetadataSchema,
    content: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((record, context) => {
    const contentSchema =
      record.recordType === 'trigram'
        ? trigramContentSchema
        : record.recordType === 'hexagram'
          ? hexagramContentSchema
          : null;
    if (contentSchema !== null) {
      const result = contentSchema.safeParse(record.content);
      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: 'custom',
            message: issue.message,
            path: ['content', ...issue.path],
          });
        }
      } else {
        if (result.data.id !== record.recordId) {
          context.addIssue({
            code: 'custom',
            message: 'Trigram/hexagram content ID must equal recordId.',
            path: ['content', 'id'],
          });
        }
        if (result.data.dataVersion !== record.source.contentVersion) {
          context.addIssue({
            code: 'custom',
            message: 'Content dataVersion must equal source.contentVersion.',
            path: ['content', 'dataVersion'],
          });
        }
      }
    }

    if (record.status !== 'verified') {
      return;
    }

    if (record.source.verifiedBy === null || record.source.verifiedAt === null) {
      context.addIssue({
        code: 'custom',
        message: 'Verified records require verifiedBy and verifiedAt.',
        path: ['source'],
      });
    }

    if (record.source.sourceType === 'pending' || record.source.licenseStatus === 'pending') {
      context.addIssue({
        code: 'custom',
        message: 'Verified records cannot use pending source or license metadata.',
        path: ['source'],
      });
    }
  });

export const verifiedCatalogSchema = z
  .array(traditionalContentRecordSchema)
  .superRefine((records, context) => {
    const recordVersions = new Set<string>();
    const trigramContents: TrigramContent[] = [];
    const hexagramContents: HexagramContent[] = [];

    records.forEach((record, index) => {
      if (record.status !== 'verified') {
        context.addIssue({
          code: 'custom',
          message: 'Production catalog accepts verified records only.',
          path: [index, 'status'],
        });
      }
      if (record.recordType === 'example') {
        context.addIssue({
          code: 'custom',
          message: 'Example records cannot enter the production catalog.',
          path: [index, 'recordType'],
        });
      }

      const recordVersionKey = `${record.recordId.length}:${record.recordId}|${record.source.contentVersion}`;
      if (recordVersions.has(recordVersionKey)) {
        context.addIssue({
          code: 'custom',
          message: 'recordId and contentVersion must be unique in the production catalog.',
          path: [index, 'recordId'],
        });
      }
      recordVersions.add(recordVersionKey);

      if (record.recordType === 'trigram') {
        const result = trigramContentSchema.safeParse(record.content);
        if (result.success) {
          trigramContents.push(result.data);
        }
      }
      if (record.recordType === 'hexagram') {
        const result = hexagramContentSchema.safeParse(record.content);
        if (result.success) {
          hexagramContents.push(result.data);
        }
      }
    });

    const mappingVersions = new Set([
      ...trigramContents.map((content) => content.dataVersion),
      ...hexagramContents.map((content) => content.dataVersion),
    ]);
    for (const dataVersion of mappingVersions) {
      try {
        assertCompleteHexagramCatalog(
          createHexagramCatalog({
            dataVersion,
            trigrams: trigramContents.filter((content) => content.dataVersion === dataVersion),
            hexagrams: hexagramContents.filter((content) => content.dataVersion === dataVersion),
          }),
        );
      } catch (error) {
        const detail =
          error instanceof HexagramDomainError
            ? `${error.code}: ${error.message}`
            : 'Unknown hexagram catalog validation error.';
        context.addIssue({
          code: 'custom',
          message: `Mapping dataVersion ${dataVersion} is incomplete or inconsistent: ${detail}`,
          path: [],
        });
      }
    }
  });

/**
 * Release-only gate for builds that promise complete hexagram resolution.
 *
 * `verifiedCatalogSchema` intentionally accepts an empty catalog so schema and
 * application work can continue before cultural data is approved. A release
 * that exposes hexagram names and King Wen mappings must use this stricter
 * schema, which also inherits the complete 8-trigram/64-hexagram checks above.
 */
export const releaseReadyCatalogSchema = verifiedCatalogSchema.superRefine((records, context) => {
  const hasMappingRecord = records.some(
    (record) => record.recordType === 'trigram' || record.recordType === 'hexagram',
  );

  if (!hasMappingRecord) {
    context.addIssue({
      code: 'custom',
      message:
        'A hexagram-enabled release requires one complete verified mapping version with eight trigrams and 64 hexagrams.',
      path: [],
    });
  }
});

export type SourceMetadata = z.infer<typeof sourceMetadataSchema>;
export type TraditionalContentRecord = z.infer<typeof traditionalContentRecordSchema>;
export type TrigramContent = z.infer<typeof trigramContentSchema>;
export type HexagramContent = z.infer<typeof hexagramContentSchema>;

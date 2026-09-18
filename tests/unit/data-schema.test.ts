import { describe, expect, it } from 'vitest';

import {
  hexagramContentSchema,
  releaseReadyCatalogSchema,
  traditionalContentRecordSchema,
  trigramContentSchema,
  verifiedCatalogSchema,
} from '../../scripts/data-schema';

const pendingExample = {
  recordId: 'structure-only-example',
  recordType: 'example',
  status: 'pending',
  source: {
    sourceId: 'pending-example',
    sourceTitle: '待确认（结构示例）',
    edition: null,
    sourceType: 'pending',
    licenseStatus: 'pending',
    verifiedBy: null,
    verifiedAt: null,
    notes: '仅用于 Schema 测试。',
    contentVersion: '0.0.0-example',
  },
  content: { placeholder: true },
} as const;

describe('traditional content schema', () => {
  it('accepts an explicitly pending structure example', () => {
    expect(traditionalContentRecordSchema.safeParse(pendingExample).success).toBe(true);
  });

  it('rejects an unverified record from the production catalog', () => {
    expect(verifiedCatalogSchema.safeParse([pendingExample]).success).toBe(false);
  });

  it('keeps an empty development catalog valid but rejects it for a hexagram-enabled release', () => {
    expect(verifiedCatalogSchema.safeParse([]).success).toBe(true);
    expect(releaseReadyCatalogSchema.safeParse([]).success).toBe(false);
  });

  it('does not treat unrelated verified content as a release-ready hexagram mapping', () => {
    expect(
      releaseReadyCatalogSchema.safeParse([
        {
          recordId: 'test-professional-rule',
          recordType: 'professional-rule',
          status: 'verified',
          source: {
            sourceId: 'test-source',
            sourceTitle: 'Test-only source',
            edition: 'test-edition',
            sourceType: 'authorized-dataset',
            licenseStatus: 'cleared',
            verifiedBy: 'test-reviewer',
            verifiedAt: '2026-07-20T00:00:00+08:00',
            notes: 'Synthetic metadata used only to prove the release gate.',
            contentVersion: 'test-only-v1',
          },
          content: { ruleId: 'test-only' },
        },
      ]).success,
    ).toBe(false);
  });

  it('rejects example records even if they carry verified metadata', () => {
    expect(
      verifiedCatalogSchema.safeParse([
        {
          ...pendingExample,
          status: 'verified',
          source: {
            ...pendingExample.source,
            sourceType: 'authorized-dataset',
            licenseStatus: 'cleared',
            verifiedBy: 'test-reviewer',
            verifiedAt: '2026-07-20T00:00:00+08:00',
          },
        },
      ]).success,
    ).toBe(false);
  });

  it('rejects a verified record without verification metadata', () => {
    const result = traditionalContentRecordSchema.safeParse({
      ...pendingExample,
      status: 'verified',
    });

    expect(result.success).toBe(false);
  });

  it('validates bottom-to-top trigram and hexagram content structures', () => {
    expect(
      trigramContentSchema.safeParse({
        id: 'test-trigram-heaven',
        name: 'Heaven',
        symbol: '☰',
        code: '111',
        lineBits: [1, 1, 1],
        element: null,
        direction: null,
        dataVersion: 'test-only-v1',
      }).success,
    ).toBe(true);
    expect(
      hexagramContentSchema.safeParse({
        id: 'test-hexagram-qian',
        kingWenSequence: 1,
        name: 'Creative Heaven',
        symbol: '䷀',
        upperTrigramId: 'test-trigram-heaven',
        lowerTrigramId: 'test-trigram-heaven',
        code: '111111',
        lineBits: [1, 1, 1, 1, 1, 1],
        dataVersion: 'test-only-v1',
      }).success,
    ).toBe(true);
  });

  it('rejects content whose code, bits, record ID, or version disagree', () => {
    expect(
      trigramContentSchema.safeParse({
        id: 'test-trigram-heaven',
        name: 'Heaven',
        symbol: '☰',
        code: '110',
        lineBits: [1, 1, 1],
        element: null,
        direction: null,
        dataVersion: 'test-only-v1',
      }).success,
    ).toBe(false);

    expect(
      traditionalContentRecordSchema.safeParse({
        ...pendingExample,
        recordId: 'different-id',
        recordType: 'trigram',
        source: { ...pendingExample.source, contentVersion: 'test-only-v1' },
        content: {
          id: 'test-trigram-heaven',
          name: 'Heaven',
          symbol: '☰',
          code: '111',
          lineBits: [1, 1, 1],
          element: null,
          direction: null,
          dataVersion: 'different-version',
        },
      }).success,
    ).toBe(false);
  });

  it('rejects a partial verified trigram/hexagram mapping version', () => {
    const dataVersion = 'verified-but-incomplete-test-v1';
    expect(
      verifiedCatalogSchema.safeParse([
        {
          recordId: 'test-trigram-heaven',
          recordType: 'trigram',
          status: 'verified',
          source: {
            sourceId: 'test-source',
            sourceTitle: 'Test-only source',
            edition: 'test-edition',
            sourceType: 'authorized-dataset',
            licenseStatus: 'cleared',
            verifiedBy: 'test-reviewer',
            verifiedAt: '2026-07-20T00:00:00+08:00',
            notes: 'Synthetic metadata used only to prove the completeness gate.',
            contentVersion: dataVersion,
          },
          content: {
            id: 'test-trigram-heaven',
            name: 'Heaven',
            symbol: '☰',
            code: '111',
            lineBits: [1, 1, 1],
            element: null,
            direction: null,
            dataVersion,
          },
        },
      ]).success,
    ).toBe(false);
  });
});

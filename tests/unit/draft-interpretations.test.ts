import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  validateDraftInterpretationDataset,
  type DraftInterpretationDataset,
} from '../../scripts/draft-interpretation-schema';

const datasetPath = resolve(
  process.cwd(),
  'data/draft/interpretations/hexagram-line-explanations-user-submitted-v1.json',
);

function readDataset(): DraftInterpretationDataset {
  return JSON.parse(readFileSync(datasetPath, 'utf8')) as DraftInterpretationDataset;
}

describe('draft hexagram-line interpretation dataset', () => {
  it('keeps the complete interpretation corpus isolated behind publication gates', () => {
    const dataset = readDataset();
    const report = validateDraftInterpretationDataset(dataset);

    expect(report).toMatchObject({
      valid: true,
      judgmentCount: 64,
      lineExplanationCount: 384,
    });
    expect(dataset.source).toMatchObject({
      sourceType: 'pending',
      licenseStatus: 'pending',
      status: 'draft',
    });
    expect(dataset.releaseGate).toMatchObject({
      status: 'pending',
      publicationEligible: false,
      usableForCastingResult: false,
      usableForProfessionalRules: false,
      usableForAiPrompting: false,
    });
  });

  it('links every explanation to a stable, independently authorized quote identifier', () => {
    const dataset = readDataset();
    const qian = dataset.records.filter((record) => record.hexagramId === 'hexagram-kw-01');

    expect(qian).toHaveLength(7);
    expect(qian.map((record) => record.canonicalQuoteId)).toEqual([
      'classical-quote-hexagram-kw-01-judgment',
      'classical-quote-hexagram-kw-01-line-1',
      'classical-quote-hexagram-kw-01-line-2',
      'classical-quote-hexagram-kw-01-line-3',
      'classical-quote-hexagram-kw-01-line-4',
      'classical-quote-hexagram-kw-01-line-5',
      'classical-quote-hexagram-kw-01-line-6',
    ]);
  });
});

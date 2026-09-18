import { describe, expect, it } from 'vitest';

import {
  getAuthorizedInterpretationBundle,
  verifiedInterpretationContentVersion,
  verifiedInterpretationPublication,
  verifiedInterpretationSource,
} from '../../packages/content/src';

describe('authorized modern interpretation dataset', () => {
  it('provides a versioned judgment and six position-addressable learning references', () => {
    const qian = getAuthorizedInterpretationBundle('hexagram-kw-01');

    expect(verifiedInterpretationContentVersion).toBe('hexagram-line-explanations-authorized-v1');
    expect(verifiedInterpretationSource.licenseStatus).toBe('cleared');
    expect(verifiedInterpretationPublication).toMatchObject({
      displayPurpose: 'educational-reference',
    });
    expect(qian.judgment.interpretation).toContain('“元”是创始');
    expect(qian.lineInterpretations.map((interpretation) => interpretation.linePosition)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(qian.lineInterpretations[0]).toMatchObject({
      lineLabel: '初九',
      canonicalQuoteId: 'classical-quote-hexagram-kw-01-line-1',
    });
  });
});

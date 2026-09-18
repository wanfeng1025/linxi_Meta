import { describe, expect, it } from 'vitest';

import {
  getClassicalQuoteBundle,
  verifiedClassicalQuoteContentVersion,
  verifiedClassicalQuoteSource,
} from '../../packages/content/src';

describe('authorized classical quotation dataset', () => {
  it('provides a versioned judgment and six position-addressable line texts', () => {
    const qian = getClassicalQuoteBundle('hexagram-kw-01');

    expect(verifiedClassicalQuoteContentVersion).toBe('liuyao-overview-authorized-v1');
    expect(verifiedClassicalQuoteSource.licenseStatus).toBe('cleared');
    expect(qian.judgment.text).toBe('乾：元，亨，利，贞。');
    expect(qian.lineTexts.map((quote) => quote.linePosition)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(qian.lineTexts[0]).toMatchObject({
      lineLabel: '初九',
      text: '初九：潜龙勿用。',
    });
  });
});

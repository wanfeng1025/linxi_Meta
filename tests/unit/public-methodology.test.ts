import { describe, expect, it } from 'vitest';

import {
  publicMethodology,
  verifiedClassicalQuoteContentVersion,
  verifiedContentVersion,
  verifiedInterpretationContentVersion,
} from '../../packages/content/src';

describe('public methodology publication boundary', () => {
  it('documents verified structural and authorized quotation layers as published', () => {
    expect(verifiedContentVersion).toBe('hexagram-mapping-2026-07-20-v1');
    expect(verifiedClassicalQuoteContentVersion).toBe('liuyao-overview-authorized-v1');
    expect(verifiedInterpretationContentVersion).toBe('hexagram-line-explanations-authorized-v1');
    expect(publicMethodology.layers.filter((layer) => layer.status === 'published')).toEqual([
      expect.objectContaining({ id: 'casting-facts' }),
      expect.objectContaining({ id: 'classical-content' }),
      expect.objectContaining({ id: 'modern-interpretation-reference' }),
    ]);
  });

  it('keeps professional rules, interpretation, and AI unavailable', () => {
    expect(publicMethodology.layers.filter((layer) => layer.status === 'not-published')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'professional-rules' }),
        expect.objectContaining({ id: 'interpretation-ai' }),
      ]),
    );
    expect(publicMethodology.reviewRequirements).toHaveLength(3);
  });
});

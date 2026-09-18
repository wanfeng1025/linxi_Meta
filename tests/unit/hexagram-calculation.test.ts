import { describe, expect, it } from 'vitest';

import {
  CASTING_RULESET_VERSION,
  type LinePosition,
  type LineValue,
} from '../../src/domain/casting';
import {
  HEXAGRAM_ENCODING_VERSION,
  HexagramDomainError,
  calculateHexagram,
  createHexagramCatalog,
  deriveHexagramStructure,
} from '../../src/domain/hexagram';
import { PARTIAL_HEXAGRAM_CATALOG_INPUT } from '../fixtures/hexagram-catalog.fixture';

const catalog = createHexagramCatalog(PARTIAL_HEXAGRAM_CATALOG_INPUT);

function lines(
  values: readonly LineValue[],
): readonly { position: LinePosition; value: LineValue }[] {
  return values.map((value, index) => ({
    position: (index + 1) as LinePosition,
    value,
  }));
}

function expectHexagramError(operation: () => unknown, code: HexagramDomainError['code']): void {
  try {
    operation();
    throw new Error('Expected HexagramDomainError.');
  } catch (error) {
    expect(error).toBeInstanceOf(HexagramDomainError);
    expect((error as HexagramDomainError).code).toBe(code);
  }
}

describe('primary, moving, and changed hexagrams', () => {
  it('keeps a fully static hexagram unchanged and reports no moving lines', () => {
    const originalLines = lines([7, 7, 7, 7, 7, 7]);
    const result = calculateHexagram({
      originalLines,
      rulesetVersion: CASTING_RULESET_VERSION,
      catalog,
    });

    expect(result.primaryLineBits).toEqual([1, 1, 1, 1, 1, 1]);
    expect(result.changedLineBits).toEqual(result.primaryLineBits);
    expect(result.primaryHexagram.id).toBe('test-hexagram-qian');
    expect(result.changedHexagram.id).toBe('test-hexagram-qian');
    expect(result.movingLines).toEqual([]);
    expect(result.encodingVersion).toBe(HEXAGRAM_ENCODING_VERSION);
    expect(result.mappingDataVersion).toBe(catalog.dataVersion);
  });

  it('changes every old yin line from yin to yang in positions 1 through 6', () => {
    const result = calculateHexagram({
      originalLines: lines([6, 6, 6, 6, 6, 6]),
      rulesetVersion: CASTING_RULESET_VERSION,
      catalog,
    });

    expect(result.primaryLineBits).toEqual([0, 0, 0, 0, 0, 0]);
    expect(result.changedLineBits).toEqual([1, 1, 1, 1, 1, 1]);
    expect(result.primaryHexagram.id).toBe('test-hexagram-kun');
    expect(result.changedHexagram.id).toBe('test-hexagram-qian');
    expect(result.movingLines).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('changes every old yang line from yang to yin in positions 1 through 6', () => {
    const result = calculateHexagram({
      originalLines: lines([9, 9, 9, 9, 9, 9]),
      rulesetVersion: CASTING_RULESET_VERSION,
      catalog,
    });

    expect(result.primaryHexagram.id).toBe('test-hexagram-qian');
    expect(result.changedHexagram.id).toBe('test-hexagram-kun');
    expect(result.movingLines).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles alternating values without reversing positions or mutating input', () => {
    const originalLines = lines([6, 7, 8, 9, 6, 9]);
    const before = JSON.stringify(originalLines);
    const result = deriveHexagramStructure(originalLines, CASTING_RULESET_VERSION);

    expect(result.primaryLineBits).toEqual([0, 1, 0, 1, 0, 1]);
    expect(result.primaryLowerTrigram.code).toBe('010');
    expect(result.primaryUpperTrigram.code).toBe('101');
    expect(result.changedLineBits).toEqual([1, 1, 0, 0, 1, 0]);
    expect(result.movingLines).toEqual([1, 4, 5, 6]);
    expect(JSON.stringify(originalLines)).toBe(before);
  });

  it('rejects incomplete, duplicate, reversed, invalid, and unversioned inputs', () => {
    expectHexagramError(
      () => deriveHexagramStructure(lines([7, 7, 7, 7, 7]), CASTING_RULESET_VERSION),
      'INVALID_LINE_COUNT',
    );
    expectHexagramError(
      () =>
        deriveHexagramStructure(
          lines([7, 7, 7, 7, 7, 7]).map((line, index) =>
            index === 5 ? { ...line, position: 5 } : line,
          ),
          CASTING_RULESET_VERSION,
        ),
      'INVALID_LINE_POSITION',
    );
    expectHexagramError(
      () =>
        deriveHexagramStructure([...lines([7, 7, 7, 7, 7, 7])].reverse(), CASTING_RULESET_VERSION),
      'INVALID_LINE_ORDER',
    );
    expectHexagramError(
      () =>
        deriveHexagramStructure(
          lines([7, 7, 7, 7, 7, 7]).map((line, index) =>
            index === 5 ? { ...line, value: 10 } : line,
          ),
          CASTING_RULESET_VERSION,
        ),
      'INVALID_LINE_VALUE',
    );
    expectHexagramError(
      () => deriveHexagramStructure(lines([7, 7, 7, 7, 7, 7]), 'latest'),
      'INVALID_VERSION',
    );
  });
});

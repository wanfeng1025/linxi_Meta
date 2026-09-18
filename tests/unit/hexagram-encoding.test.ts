import { describe, expect, it } from 'vitest';

import {
  TRIGRAM_CODES,
  HexagramDomainError,
  bitToPolarity,
  combineTrigramBits,
  createTrigramPattern,
  decodeHexagramCode,
  decodeTrigramCode,
  encodeHexagramBits,
  encodeTrigramBits,
  polarityToBit,
  splitHexagramBits,
  toTopDownLineDisplay,
  trigramPatternToBits,
} from '../../src/domain/hexagram';

function expectHexagramError(operation: () => unknown, code: HexagramDomainError['code']): void {
  try {
    operation();
    throw new Error('Expected HexagramDomainError.');
  } catch (error) {
    expect(error).toBeInstanceOf(HexagramDomainError);
    expect((error as HexagramDomainError).code).toBe(code);
  }
}

describe('bottom-to-top yin/yang encoding', () => {
  it('encodes yin as 0 and yang as 1 in both directions', () => {
    expect(polarityToBit('yin')).toBe(0);
    expect(polarityToBit('yang')).toBe(1);
    expect(bitToPolarity(0)).toBe('yin');
    expect(bitToPolarity(1)).toBe('yang');
  });

  it('round-trips all eight unique trigram codes', () => {
    const seenIds = new Set<string>();
    const seenCodes = new Set<string>();

    for (const code of TRIGRAM_CODES) {
      const bits = decodeTrigramCode(code);
      const pattern = createTrigramPattern(bits);

      expect(encodeTrigramBits(bits)).toBe(code);
      expect(trigramPatternToBits(pattern)).toEqual(bits);
      seenIds.add(pattern.id);
      seenCodes.add(pattern.code);
    }

    expect(seenIds.size).toBe(8);
    expect(seenCodes.size).toBe(8);
  });

  it('splits lines 1..3 into the lower trigram and 4..6 into the upper trigram', () => {
    const lineBits = decodeHexagramCode('010110');
    const split = splitHexagramBits(lineBits);

    expect(split.lower).toEqual([0, 1, 0]);
    expect(split.upper).toEqual([1, 1, 0]);
    expect(combineTrigramBits(split.lower, split.upper)).toEqual(lineBits);
    expect(encodeHexagramBits(lineBits)).toBe('010110');
  });

  it('creates a top-down display copy without changing domain order', () => {
    const bottomUp = Object.freeze([1, 2, 3, 4, 5, 6]);
    const display = toTopDownLineDisplay(bottomUp);

    expect(display).toEqual([6, 5, 4, 3, 2, 1]);
    expect(bottomUp).toEqual([1, 2, 3, 4, 5, 6]);
    expect(display).not.toBe(bottomUp);
    expect(Object.isFrozen(display)).toBe(true);
  });

  it('rejects malformed bits, codes, and display lengths', () => {
    expectHexagramError(() => decodeTrigramCode('01'), 'INVALID_TRIGRAM_CODE');
    expectHexagramError(() => encodeTrigramBits([0, 1, 2]), 'INVALID_BIT');
    expectHexagramError(() => decodeHexagramCode('01012x'), 'INVALID_HEXAGRAM_CODE');
    expectHexagramError(() => toTopDownLineDisplay([1, 2, 3]), 'INVALID_LINE_COUNT');
  });
});

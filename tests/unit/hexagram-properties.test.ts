import { array, assert, constantFrom, integer, property, tuple } from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  CASTING_RULESET_VERSION,
  createCastLine,
  type CoinValue,
  type LinePosition,
  type LineValue,
} from '../../src/domain/casting';
import { deriveHexagramStructure } from '../../src/domain/hexagram';

const coinArbitrary = constantFrom<CoinValue>(2, 3);
const lineValueArbitrary = constantFrom<LineValue>(6, 7, 8, 9);

describe('hexagram property invariants', () => {
  it('derives every line from exactly three 2/3-valued coins', () => {
    assert(
      property(
        tuple(coinArbitrary, coinArbitrary, coinArbitrary),
        integer({ min: 1, max: 6 }),
        (coins, position) => {
          const line = createCastLine({
            position,
            sequence: position,
            coins,
            rulesetVersion: CASTING_RULESET_VERSION,
          });
          expect(line.coins).toEqual(coins);
          expect(line.value).toBe(coins[0] + coins[1] + coins[2]);
          expect([6, 7, 8, 9]).toContain(line.value);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('keeps bottom-to-top order and moving-line transformations deterministic', () => {
    assert(
      property(array(lineValueArbitrary, { minLength: 6, maxLength: 6 }), (values) => {
        const originalLines = values.map((value, index) => ({
          position: (index + 1) as LinePosition,
          value,
        }));
        const before = structuredClone(originalLines);
        const result = deriveHexagramStructure(originalLines, CASTING_RULESET_VERSION);
        const repeated = deriveHexagramStructure(originalLines, CASTING_RULESET_VERSION);

        expect(result.primaryLowerTrigram.lineBits).toEqual(result.primaryLineBits.slice(0, 3));
        expect(result.primaryUpperTrigram.lineBits).toEqual(result.primaryLineBits.slice(3, 6));
        expect(result.changedLowerTrigram.lineBits).toEqual(result.changedLineBits.slice(0, 3));
        expect(result.changedUpperTrigram.lineBits).toEqual(result.changedLineBits.slice(3, 6));
        expect(result).toEqual(repeated);
        expect(originalLines).toEqual(before);

        values.forEach((value, index) => {
          const originalBit = value === 6 || value === 8 ? 0 : 1;
          const changedBit = value === 6 ? 1 : value === 9 ? 0 : originalBit;
          expect(result.primaryLineBits[index]).toBe(originalBit);
          expect(result.changedLineBits[index]).toBe(changedBit);
        });
      }),
      { numRuns: 400 },
    );
  });
});

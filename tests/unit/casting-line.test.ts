import { describe, expect, it } from 'vitest';

import {
  CASTING_RULESET_VERSION,
  CastingDomainError,
  createCastLine,
  createCoinTuple,
  getLineFacts,
  restoreCastLine,
  type CoinValue,
  type LineValue,
} from '../../src/domain/casting';

const allCoinArrangements = [
  [2, 2, 2],
  [2, 2, 3],
  [2, 3, 2],
  [3, 2, 2],
  [2, 3, 3],
  [3, 2, 3],
  [3, 3, 2],
  [3, 3, 3],
] as const satisfies readonly (readonly [CoinValue, CoinValue, CoinValue])[];

const expectedFacts = {
  6: { polarity: 'yin', movement: 'moving', changedPolarity: 'yang' },
  7: { polarity: 'yang', movement: 'static', changedPolarity: 'yang' },
  8: { polarity: 'yin', movement: 'static', changedPolarity: 'yin' },
  9: { polarity: 'yang', movement: 'moving', changedPolarity: 'yin' },
} as const;

function expectDomainError(operation: () => unknown, code: CastingDomainError['code']): void {
  try {
    operation();
    throw new Error('Expected CastingDomainError.');
  } catch (error) {
    expect(error).toBeInstanceOf(CastingDomainError);
    expect((error as CastingDomainError).code).toBe(code);
  }
}

describe('three-coin line', () => {
  it('enumerates all eight arrangements and produces only 6, 7, 8, or 9', () => {
    const counts = new Map<LineValue, number>();

    allCoinArrangements.forEach((coins) => {
      const line = createCastLine({
        position: 1,
        coins,
        sequence: 1,
        rulesetVersion: CASTING_RULESET_VERSION,
      });

      expect(line.coins).toEqual(coins);
      expect(line.value).toBe(coins[0] + coins[1] + coins[2]);
      expect([6, 7, 8, 9]).toContain(line.value);
      expect(line).toMatchObject(expectedFacts[line.value]);
      counts.set(line.value, (counts.get(line.value) ?? 0) + 1);
    });

    expect(Object.fromEntries(counts)).toEqual({ 6: 1, 7: 3, 8: 3, 9: 1 });
  });

  it.each([6, 7, 8, 9] as const)('maps line value %s to frozen rule facts', (value) => {
    expect(getLineFacts(value, CASTING_RULESET_VERSION)).toEqual(expectedFacts[value]);
  });

  it('rejects invalid coin tuples, positions, sequences, values, and versions', () => {
    expectDomainError(() => createCoinTuple([2, 3]), 'INVALID_COIN_COUNT');
    expectDomainError(() => createCoinTuple([2, 3, 4]), 'INVALID_COIN_VALUE');
    expectDomainError(
      () =>
        createCastLine({
          position: 0,
          coins: [2, 2, 2],
          sequence: 1,
          rulesetVersion: CASTING_RULESET_VERSION,
        }),
      'INVALID_LINE_POSITION',
    );
    expectDomainError(
      () =>
        createCastLine({
          position: 1,
          coins: [2, 2, 2],
          sequence: 2,
          rulesetVersion: CASTING_RULESET_VERSION,
        }),
      'INVALID_LINE_SEQUENCE',
    );
    expectDomainError(() => getLineFacts(5, CASTING_RULESET_VERSION), 'INVALID_LINE_VALUE');
    expectDomainError(() => getLineFacts(6, 'latest'), 'INVALID_VERSION');
  });

  it('rejects persisted derived facts that conflict with original coins', () => {
    const line = createCastLine({
      position: 1,
      coins: [2, 2, 2],
      sequence: 1,
      rulesetVersion: CASTING_RULESET_VERSION,
    });

    expectDomainError(
      () => restoreCastLine({ ...line, changedPolarity: 'yin' }, 1, CASTING_RULESET_VERSION),
      'INVALID_LINE_FACTS',
    );
  });
});

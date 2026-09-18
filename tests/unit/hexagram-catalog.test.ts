import { describe, expect, it } from 'vitest';

import {
  HexagramDomainError,
  assertCompleteHexagramCatalog,
  createHexagramCatalog,
  createHexagramPairKey,
  resolveHexagramByBits,
  trigramDefinitionToBits,
} from '../../src/domain/hexagram';
import {
  PARTIAL_HEXAGRAM_CATALOG_INPUT,
  TEST_MAPPING_DATA_VERSION,
  TEST_FIXTURE_SOURCE_NOTES,
} from '../fixtures/hexagram-catalog.fixture';

const CROSS_HEXAGRAM = {
  id: 'test-hexagram-cross',
  kingWenSequence: 3,
  name: 'Test-only cross pattern',
  symbol: 'test-only-cross-symbol',
  upperTrigramId: 'test-trigram-earth',
  lowerTrigramId: 'test-trigram-heaven',
  code: '111000',
  lineBits: [1, 1, 1, 0, 0, 0],
  dataVersion: TEST_MAPPING_DATA_VERSION,
} as const;

function expectHexagramError(operation: () => unknown, code: HexagramDomainError['code']): void {
  try {
    operation();
    throw new Error('Expected HexagramDomainError.');
  } catch (error) {
    expect(error).toBeInstanceOf(HexagramDomainError);
    expect((error as HexagramDomainError).code).toBe(code);
  }
}

describe('explicit hexagram catalog', () => {
  it('parses the isolated source-backed test fixture without treating binary code as sequence', () => {
    const catalog = createHexagramCatalog(PARTIAL_HEXAGRAM_CATALOG_INPUT);
    const qian = resolveHexagramByBits(catalog, [1, 1, 1, 1, 1, 1]);

    expect(catalog.trigrams).toHaveLength(8);
    expect(catalog.hexagrams).toHaveLength(2);
    expect(qian.hexagram.id).toBe('test-hexagram-qian');
    expect(qian.hexagram.kingWenSequence).toBe(1);
    expect(qian.hexagram.symbol).toBe('䷀');
    expect(Number.parseInt(qian.hexagram.code, 2) + 1).toBe(64);
    expect(trigramDefinitionToBits(qian.lowerTrigram)).toEqual([1, 1, 1]);
    expect(trigramDefinitionToBits(qian.upperTrigram)).toEqual([1, 1, 1]);
    expect(TEST_FIXTURE_SOURCE_NOTES.status).toBe('pending-test-only');
  });

  it('builds collision-safe named keys from explicit upper and lower IDs', () => {
    expect(createHexagramPairKey('ab', 'c')).not.toBe(createHexagramPairKey('a', 'bc'));
  });

  it('rejects a duplicate upper/lower mapping even when its ID and sequence differ', () => {
    const qian = PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams[0];
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [
            ...PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams,
            { ...qian, id: 'duplicate-pair', kingWenSequence: 3 },
          ],
        }),
      'DUPLICATE_HEXAGRAM',
    );
  });

  it('rejects duplicate trigram IDs, codes, and symbols independently', () => {
    const [earth, mountain, ...remainingTrigrams] = PARTIAL_HEXAGRAM_CATALOG_INPUT.trigrams;
    if (earth === undefined || mountain === undefined) {
      throw new Error('The explicit test fixture must contain Earth and Mountain trigrams.');
    }

    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          trigrams: [earth, { ...mountain, id: earth.id }, ...remainingTrigrams],
        }),
      'DUPLICATE_TRIGRAM',
    );
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          trigrams: [
            earth,
            { ...mountain, code: earth.code, lineBits: earth.lineBits },
            ...remainingTrigrams,
          ],
        }),
      'DUPLICATE_TRIGRAM',
    );
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          trigrams: [earth, { ...mountain, symbol: earth.symbol }, ...remainingTrigrams],
        }),
      'DUPLICATE_TRIGRAM',
    );
  });

  it('rejects duplicate hexagram IDs and King Wen sequence numbers independently', () => {
    const qian = PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams[0];
    if (qian === undefined) {
      throw new Error('The explicit test fixture must contain the Qian hexagram.');
    }

    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [
            ...PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams,
            { ...CROSS_HEXAGRAM, id: qian.id },
          ],
        }),
      'DUPLICATE_HEXAGRAM',
    );
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [
            ...PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams,
            { ...CROSS_HEXAGRAM, kingWenSequence: qian.kingWenSequence },
          ],
        }),
      'DUPLICATE_HEXAGRAM',
    );
  });

  it('rejects invalid sequence, dangling references, mutable versions, and record version drift', () => {
    const qian = PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams[0];
    const earth = PARTIAL_HEXAGRAM_CATALOG_INPUT.trigrams[0];
    if (qian === undefined || earth === undefined) {
      throw new Error('The explicit test fixture must contain Qian and Earth records.');
    }

    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [{ ...qian, kingWenSequence: 0 }],
        }),
      'INVALID_CATALOG',
    );
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [{ ...qian, upperTrigramId: 'missing-trigram' }],
        }),
      'INVALID_CATALOG',
    );
    expectHexagramError(
      () => createHexagramCatalog({ ...PARTIAL_HEXAGRAM_CATALOG_INPUT, dataVersion: 'latest' }),
      'INVALID_VERSION',
    );
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          trigrams: [
            { ...earth, dataVersion: 'different-test-version' },
            ...PARTIAL_HEXAGRAM_CATALOG_INPUT.trigrams.slice(1),
          ],
        }),
      'INVALID_CATALOG',
    );
  });

  it('rejects line bits that disagree with the explicit lower and upper trigrams', () => {
    const qian = PARTIAL_HEXAGRAM_CATALOG_INPUT.hexagrams[0];
    expectHexagramError(
      () =>
        createHexagramCatalog({
          ...PARTIAL_HEXAGRAM_CATALOG_INPUT,
          hexagrams: [{ ...qian, code: '011111', lineBits: [0, 1, 1, 1, 1, 1] }],
        }),
      'INVALID_CATALOG',
    );
  });

  it('reports missing mappings and refuses to call a partial catalog complete', () => {
    const catalog = createHexagramCatalog(PARTIAL_HEXAGRAM_CATALOG_INPUT);

    expectHexagramError(
      () => resolveHexagramByBits(catalog, [1, 1, 1, 0, 0, 0]),
      'HEXAGRAM_NOT_FOUND',
    );
    expectHexagramError(() => assertCompleteHexagramCatalog(catalog), 'INCOMPLETE_CATALOG');
  });
});

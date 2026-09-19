import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  hexagramContentSchema,
  releaseReadyCatalogSchema,
  trigramContentSchema,
} from '../../scripts/data-schema';
import {
  CASTING_RULESET_VERSION,
  type LinePosition,
  type LineValue,
} from '../../src/domain/casting';
import {
  calculateHexagram,
  createHexagramCatalog,
  deriveHexagramStructure,
  encodeHexagramBits,
} from '../../src/domain/hexagram';

const LINE_VALUES = [6, 7, 8, 9] as const satisfies readonly LineValue[];
const UNICODE_TRIGRAM_SYMBOLS = Object.freeze({
  '000': '☷',
  '001': '☶',
  '010': '☵',
  '011': '☴',
  '100': '☳',
  '101': '☲',
  '110': '☱',
  '111': '☰',
});
const FIRST_UNICODE_HEXAGRAM_CODE_POINT = 0x4dc0;

function valuesForState(state: number): readonly LineValue[] {
  const values: LineValue[] = [];
  let remainder = state;
  for (let position = 0; position < 6; position += 1) {
    const value = LINE_VALUES[remainder % LINE_VALUES.length];
    if (value === undefined) {
      throw new Error('Exhaustive state produced an invalid line value index.');
    }
    values.push(value);
    remainder = Math.floor(remainder / LINE_VALUES.length);
  }
  return values;
}

function originalBit(value: LineValue): 0 | 1 {
  return value === 6 || value === 8 ? 0 : 1;
}

function changedBit(value: LineValue): 0 | 1 {
  if (value === 6) {
    return 1;
  }
  if (value === 9) {
    return 0;
  }
  return originalBit(value);
}

function loadProductionCatalog(): ReturnType<typeof createHexagramCatalog> {
  const input: unknown = JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/catalog/index.json'), 'utf8'),
  );
  const records = releaseReadyCatalogSchema.parse(input);
  const trigrams = records.flatMap((record) =>
    record.recordType === 'trigram' ? [trigramContentSchema.parse(record.content)] : [],
  );
  const hexagrams = records.flatMap((record) =>
    record.recordType === 'hexagram' ? [hexagramContentSchema.parse(record.content)] : [],
  );
  const versions = new Set([
    ...trigrams.map((trigram) => trigram.dataVersion),
    ...hexagrams.map((hexagram) => hexagram.dataVersion),
  ]);
  if (versions.size !== 1) {
    throw new Error('Production hexagram mapping must contain exactly one immutable data version.');
  }
  const [dataVersion] = versions;
  if (dataVersion === undefined) {
    throw new Error('Production hexagram mapping is missing its data version.');
  }
  return createHexagramCatalog({ dataVersion, trigrams, hexagrams });
}

describe('all 4096 four-state six-line combinations', () => {
  it('matches the reviewed mapping to the Unicode trigram and King Wen symbols', () => {
    const catalog = loadProductionCatalog();

    expect(catalog.trigrams).toHaveLength(8);
    expect(catalog.hexagrams).toHaveLength(64);
    for (const trigram of catalog.trigrams) {
      expect(trigram.symbol).toBe(UNICODE_TRIGRAM_SYMBOLS[trigram.code]);
    }
    for (const hexagram of catalog.hexagrams) {
      expect([...hexagram.symbol]).toHaveLength(1);
      expect(hexagram.symbol.codePointAt(0)).toBe(
        FIRST_UNICODE_HEXAGRAM_CODE_POINT + hexagram.kingWenSequence - 1,
      );
    }
  });

  it('preserves every bottom-to-top transformation invariant deterministically', () => {
    const primaryCodes = new Set<string>();
    const changedCodes = new Set<string>();
    const movingLineCounts = new Set<number>();
    let testedStates = 0;

    for (let state = 0; state < 4 ** 6; state += 1) {
      const values = valuesForState(state);
      const lines = values.map((value, index) => ({
        position: (index + 1) as LinePosition,
        value,
      }));
      const before = JSON.stringify(lines);
      const result = deriveHexagramStructure(lines, CASTING_RULESET_VERSION);
      const repeated = deriveHexagramStructure(lines, CASTING_RULESET_VERSION);
      const expectedMovingLines = values.flatMap((value, index) =>
        value === 6 || value === 9 ? [(index + 1) as LinePosition] : [],
      );

      expect(result.primaryLineBits).toEqual(values.map(originalBit));
      if (expectedMovingLines.length === 0) {
        expect(result.changeStatus).toBe('STATIC');
        expect(result.changedLineBits).toBeNull();
        expect(result.changedLowerTrigram).toBeNull();
        expect(result.changedUpperTrigram).toBeNull();
      } else {
        expect(result.changeStatus).toBe('CHANGING');
        expect(result.changedLineBits).toEqual(values.map(changedBit));
        expect(result.changedLowerTrigram?.lineBits).toEqual(result.changedLineBits?.slice(0, 3));
        expect(result.changedUpperTrigram?.lineBits).toEqual(result.changedLineBits?.slice(3, 6));
      }
      expect(result.movingLines).toEqual(expectedMovingLines);
      expect(new Set(result.movingLines).size).toBe(result.movingLines.length);
      expect(result.primaryLowerTrigram.lineBits).toEqual(result.primaryLineBits.slice(0, 3));
      expect(result.primaryUpperTrigram.lineBits).toEqual(result.primaryLineBits.slice(3, 6));
      expect(repeated).toEqual(result);
      expect(JSON.stringify(lines)).toBe(before);

      primaryCodes.add(encodeHexagramBits(result.primaryLineBits));
      if (result.changeStatus === 'CHANGING') {
        changedCodes.add(encodeHexagramBits(result.changedLineBits));
      }
      movingLineCounts.add(result.movingLines.length);
      testedStates += 1;
    }

    expect(testedStates).toBe(4096);
    expect(primaryCodes.size).toBe(64);
    expect(changedCodes.size).toBe(64);
    expect([...movingLineCounts].sort((left, right) => left - right)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('resolves every primary and changed state through the verified production catalog', () => {
    const catalog = loadProductionCatalog();
    const primaryIds = new Set<string>();
    const changedIds = new Set<string>();
    const primarySequences = new Set<number>();
    const changedSequences = new Set<number>();
    let testedStates = 0;

    for (let state = 0; state < 4 ** 6; state += 1) {
      const values = valuesForState(state);
      const originalLines = values.map((value, index) => ({
        position: (index + 1) as LinePosition,
        value,
      }));
      const result = calculateHexagram({
        originalLines,
        rulesetVersion: CASTING_RULESET_VERSION,
        catalog,
      });
      const repeated = calculateHexagram({
        originalLines,
        rulesetVersion: CASTING_RULESET_VERSION,
        catalog,
      });

      expect(result.primaryHexagram.kingWenSequence).toBeGreaterThanOrEqual(1);
      expect(result.primaryHexagram.kingWenSequence).toBeLessThanOrEqual(64);
      if (result.changeStatus === 'CHANGING') {
        expect(result.changedHexagram.kingWenSequence).toBeGreaterThanOrEqual(1);
        expect(result.changedHexagram.kingWenSequence).toBeLessThanOrEqual(64);
      } else {
        expect(result.changedHexagram).toBeNull();
      }
      expect(result.mappingDataVersion).toBe(catalog.dataVersion);
      expect(repeated).toEqual(result);

      primaryIds.add(result.primaryHexagram.id);
      primarySequences.add(result.primaryHexagram.kingWenSequence);
      if (result.changeStatus === 'CHANGING') {
        changedIds.add(result.changedHexagram.id);
        changedSequences.add(result.changedHexagram.kingWenSequence);
      }
      testedStates += 1;
    }

    expect(testedStates).toBe(4096);
    expect(primaryIds.size).toBe(64);
    expect(changedIds.size).toBe(64);
    expect(primarySequences.size).toBe(64);
    expect(changedSequences.size).toBe(64);
  });
});

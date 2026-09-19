import type { LinePosition, LineValue } from '../casting';

declare const validatedHexagramCatalogBrand: unique symbol;

export type YinYangBit = 0 | 1;

export type TrigramBits = readonly [YinYangBit, YinYangBit, YinYangBit];

export type HexagramBits = readonly [
  YinYangBit,
  YinYangBit,
  YinYangBit,
  YinYangBit,
  YinYangBit,
  YinYangBit,
];

export type TrigramCode = '000' | '001' | '010' | '011' | '100' | '101' | '110' | '111';

export type HexagramCode =
  `${YinYangBit}${YinYangBit}${YinYangBit}${YinYangBit}${YinYangBit}${YinYangBit}`;

export type HexagramChangeStatus = 'STATIC' | 'CHANGING';

export type TrigramPatternId = `trigram-pattern-${TrigramCode}`;

export interface TrigramPattern {
  readonly id: TrigramPatternId;
  readonly code: TrigramCode;
  readonly lineBits: TrigramBits;
}

export interface TrigramDefinition {
  readonly id: string;
  readonly name: string;
  readonly symbol: string;
  readonly code: TrigramCode;
  readonly lineBits: TrigramBits;
  readonly element: string | null;
  readonly direction: string | null;
  readonly dataVersion: string;
}

export interface HexagramDefinition {
  readonly id: string;
  readonly kingWenSequence: number;
  readonly name: string;
  readonly symbol: string;
  readonly upperTrigramId: string;
  readonly lowerTrigramId: string;
  readonly code: HexagramCode;
  readonly lineBits: HexagramBits;
  readonly dataVersion: string;
}

export interface HexagramCatalog {
  readonly [validatedHexagramCatalogBrand]: true;
  readonly dataVersion: string;
  readonly trigrams: readonly TrigramDefinition[];
  readonly hexagrams: readonly HexagramDefinition[];
}

export interface OriginalLineValue {
  readonly position: LinePosition;
  readonly value: LineValue;
}

export interface HexagramStructureResult {
  readonly originalLines: readonly OriginalLineValue[];
  readonly primaryLineBits: HexagramBits;
  readonly primaryLowerTrigram: TrigramPattern;
  readonly primaryUpperTrigram: TrigramPattern;
  readonly movingLines: readonly LinePosition[];
  readonly changeStatus: HexagramChangeStatus;
  readonly changedLineBits: HexagramBits | null;
  readonly changedLowerTrigram: TrigramPattern | null;
  readonly changedUpperTrigram: TrigramPattern | null;
  readonly encodingVersion: string;
  readonly rulesetVersion: string;
}

export interface HexagramCalculationBase {
  readonly originalLines: readonly OriginalLineValue[];
  readonly primaryLineBits: HexagramBits;
  readonly lowerTrigram: TrigramDefinition;
  readonly upperTrigram: TrigramDefinition;
  readonly primaryHexagram: HexagramDefinition;
  readonly movingLines: readonly LinePosition[];
  readonly encodingVersion: string;
  readonly rulesetVersion: string;
  readonly mappingDataVersion: string;
}

export interface StaticHexagramCalculationResult extends HexagramCalculationBase {
  readonly changeStatus: 'STATIC';
  readonly changedLineBits: null;
  readonly changedLowerTrigram: null;
  readonly changedUpperTrigram: null;
  readonly changedHexagram: null;
}

export interface ChangingHexagramCalculationResult extends HexagramCalculationBase {
  readonly changeStatus: 'CHANGING';
  readonly changedLineBits: HexagramBits;
  readonly changedLowerTrigram: TrigramDefinition;
  readonly changedUpperTrigram: TrigramDefinition;
  readonly changedHexagram: HexagramDefinition;
}

export type HexagramCalculationResult =
  StaticHexagramCalculationResult | ChangingHexagramCalculationResult;

export interface ResolvedHexagram {
  readonly lowerTrigram: TrigramDefinition;
  readonly upperTrigram: TrigramDefinition;
  readonly hexagram: HexagramDefinition;
}

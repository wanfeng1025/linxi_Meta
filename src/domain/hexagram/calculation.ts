import { getLineFacts, isLinePosition, isLineValue, type LinePosition } from '../casting';
import { resolveHexagramByBits } from './catalog';
import {
  createHexagramBits,
  createTrigramPattern,
  polarityToBit,
  splitHexagramBits,
} from './encoding';
import { HexagramDomainError } from './errors';
import type {
  HexagramCalculationResult,
  HexagramCatalog,
  HexagramStructureResult,
  OriginalLineValue,
} from './types';
import { HEXAGRAM_ENCODING_VERSION } from './versions';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readRulesetVersion(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim() === 'latest') {
    throw new HexagramDomainError(
      'INVALID_VERSION',
      'rulesetVersion must be a non-empty immutable version and cannot be "latest".',
    );
  }
  return value;
}

function readOriginalLines(value: unknown): readonly OriginalLineValue[] {
  if (!Array.isArray(value) || value.length !== 6) {
    throw new HexagramDomainError(
      'INVALID_LINE_COUNT',
      'Hexagram calculation requires exactly six original lines.',
    );
  }

  const positions = new Set<LinePosition>();
  const lines = value.map((line, index) => {
    if (!isRecord(line) || !isLinePosition(line.position)) {
      throw new HexagramDomainError(
        'INVALID_LINE_POSITION',
        'Every line position must be an integer from 1 to 6.',
      );
    }
    if (positions.has(line.position)) {
      throw new HexagramDomainError(
        'INVALID_LINE_POSITION',
        'Line positions must be unique and cover 1 through 6.',
      );
    }
    positions.add(line.position);
    if (line.position !== index + 1) {
      throw new HexagramDomainError(
        'INVALID_LINE_ORDER',
        'Domain lines must be stored from position 1 at index 0 through position 6 at index 5.',
      );
    }
    if (!isLineValue(line.value)) {
      throw new HexagramDomainError(
        'INVALID_LINE_VALUE',
        'Every original line value must be 6, 7, 8, or 9.',
      );
    }
    return Object.freeze({ position: line.position, value: line.value });
  });

  return Object.freeze(lines);
}

export function deriveHexagramStructure(
  originalLinesValue: unknown,
  rulesetVersionValue: unknown,
): HexagramStructureResult {
  const originalLines = readOriginalLines(originalLinesValue);
  const rulesetVersion = readRulesetVersion(rulesetVersionValue);
  const facts = originalLines.map((line) => getLineFacts(line.value, rulesetVersion));
  const primaryLineBits = createHexagramBits(facts.map((line) => polarityToBit(line.polarity)));
  const movingLines = Object.freeze(
    originalLines
      .filter((_line, index) => facts[index]?.movement === 'moving')
      .map((line) => line.position),
  );
  const changeStatus = movingLines.length === 0 ? 'STATIC' : 'CHANGING';
  const changedLineBits =
    changeStatus === 'CHANGING'
      ? createHexagramBits(facts.map((line) => polarityToBit(line.changedPolarity)))
      : null;
  const primaryTrigrams = splitHexagramBits(primaryLineBits);
  const changedTrigrams = changedLineBits === null ? null : splitHexagramBits(changedLineBits);

  return Object.freeze({
    originalLines,
    primaryLineBits,
    primaryLowerTrigram: createTrigramPattern(primaryTrigrams.lower),
    primaryUpperTrigram: createTrigramPattern(primaryTrigrams.upper),
    movingLines,
    changeStatus,
    changedLineBits,
    changedLowerTrigram:
      changedTrigrams === null ? null : createTrigramPattern(changedTrigrams.lower),
    changedUpperTrigram:
      changedTrigrams === null ? null : createTrigramPattern(changedTrigrams.upper),
    encodingVersion: HEXAGRAM_ENCODING_VERSION,
    rulesetVersion,
  });
}

export interface CalculateHexagramInput {
  readonly originalLines: unknown;
  readonly rulesetVersion: unknown;
  readonly catalog: HexagramCatalog;
}

export function calculateHexagram(input: CalculateHexagramInput): HexagramCalculationResult {
  const structure = deriveHexagramStructure(input.originalLines, input.rulesetVersion);
  const primary = resolveHexagramByBits(input.catalog, structure.primaryLineBits);

  if (structure.changeStatus === 'STATIC') {
    return Object.freeze({
      originalLines: structure.originalLines,
      primaryLineBits: structure.primaryLineBits,
      lowerTrigram: primary.lowerTrigram,
      upperTrigram: primary.upperTrigram,
      primaryHexagram: primary.hexagram,
      movingLines: structure.movingLines,
      changeStatus: 'STATIC',
      changedLineBits: null,
      changedLowerTrigram: null,
      changedUpperTrigram: null,
      changedHexagram: null,
      encodingVersion: structure.encodingVersion,
      rulesetVersion: structure.rulesetVersion,
      mappingDataVersion: input.catalog.dataVersion,
    });
  }

  if (
    structure.changedLineBits === null ||
    structure.changedLowerTrigram === null ||
    structure.changedUpperTrigram === null
  ) {
    throw new HexagramDomainError(
      'INVALID_STRUCTURE',
      'A changing hexagram must include changed line bits and trigrams.',
    );
  }

  const changed = resolveHexagramByBits(input.catalog, structure.changedLineBits);

  return Object.freeze({
    originalLines: structure.originalLines,
    primaryLineBits: structure.primaryLineBits,
    lowerTrigram: primary.lowerTrigram,
    upperTrigram: primary.upperTrigram,
    primaryHexagram: primary.hexagram,
    movingLines: structure.movingLines,
    changeStatus: 'CHANGING',
    changedLineBits: structure.changedLineBits,
    changedLowerTrigram: changed.lowerTrigram,
    changedUpperTrigram: changed.upperTrigram,
    changedHexagram: changed.hexagram,
    encodingVersion: structure.encodingVersion,
    rulesetVersion: structure.rulesetVersion,
    mappingDataVersion: input.catalog.dataVersion,
  });
}

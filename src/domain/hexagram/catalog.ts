import { HexagramDomainError } from './errors';
import {
  TRIGRAM_CODES,
  combineTrigramBits,
  createHexagramBits,
  createTrigramBits,
  encodeHexagramBits,
  encodeTrigramBits,
  splitHexagramBits,
} from './encoding';
import type {
  HexagramCatalog,
  HexagramDefinition,
  ResolvedHexagram,
  TrigramBits,
  TrigramDefinition,
} from './types';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HexagramDomainError('INVALID_CATALOG', `${fieldName} must be a non-empty string.`);
  }
  return value;
}

function readImmutableVersion(value: unknown, fieldName: string): string {
  const version = readNonEmptyString(value, fieldName);
  if (version.trim() === 'latest') {
    throw new HexagramDomainError(
      'INVALID_VERSION',
      `${fieldName} must be immutable and cannot be "latest".`,
    );
  }
  return version;
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) {
    return null;
  }
  return readNonEmptyString(value, fieldName);
}

function readKingWenSequence(value: unknown): number {
  if (!Number.isInteger(value) || typeof value !== 'number' || value < 1 || value > 64) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'kingWenSequence must be an integer from 1 to 64.',
    );
  }
  return value;
}

function parseTrigramDefinition(value: unknown, dataVersion: string): TrigramDefinition {
  if (!isRecord(value)) {
    throw new HexagramDomainError('INVALID_CATALOG', 'Every trigram must be an object.');
  }

  const lineBits = createTrigramBits(value.lineBits);
  const code = encodeTrigramBits(lineBits);
  if (value.code !== code) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'A trigram code must equal its bottom-to-top line bits.',
    );
  }
  if (readImmutableVersion(value.dataVersion, 'trigram.dataVersion') !== dataVersion) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'Every trigram dataVersion must equal the catalog dataVersion.',
    );
  }

  return Object.freeze({
    id: readNonEmptyString(value.id, 'trigram.id'),
    name: readNonEmptyString(value.name, 'trigram.name'),
    symbol: readNonEmptyString(value.symbol, 'trigram.symbol'),
    code,
    lineBits,
    element: readNullableString(value.element, 'trigram.element'),
    direction: readNullableString(value.direction, 'trigram.direction'),
    dataVersion,
  });
}

function parseHexagramDefinition(
  value: unknown,
  dataVersion: string,
  trigrams: readonly TrigramDefinition[],
): HexagramDefinition {
  if (!isRecord(value)) {
    throw new HexagramDomainError('INVALID_CATALOG', 'Every hexagram must be an object.');
  }

  const upperTrigramId = readNonEmptyString(value.upperTrigramId, 'hexagram.upperTrigramId');
  const lowerTrigramId = readNonEmptyString(value.lowerTrigramId, 'hexagram.lowerTrigramId');
  const upperTrigram = trigrams.find((trigram) => trigram.id === upperTrigramId);
  const lowerTrigram = trigrams.find((trigram) => trigram.id === lowerTrigramId);
  if (upperTrigram === undefined || lowerTrigram === undefined) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'Every hexagram must reference trigrams in the same catalog.',
    );
  }

  const lineBits = createHexagramBits(value.lineBits);
  const code = encodeHexagramBits(lineBits);
  const expectedBits = combineTrigramBits(lowerTrigram.lineBits, upperTrigram.lineBits);
  if (value.code !== code || code !== encodeHexagramBits(expectedBits)) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'A hexagram code and line bits must match its explicit lower and upper trigrams.',
    );
  }
  if (readImmutableVersion(value.dataVersion, 'hexagram.dataVersion') !== dataVersion) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'Every hexagram dataVersion must equal the catalog dataVersion.',
    );
  }

  return Object.freeze({
    id: readNonEmptyString(value.id, 'hexagram.id'),
    kingWenSequence: readKingWenSequence(value.kingWenSequence),
    name: readNonEmptyString(value.name, 'hexagram.name'),
    symbol: readNonEmptyString(value.symbol, 'hexagram.symbol'),
    upperTrigramId,
    lowerTrigramId,
    code,
    lineBits,
    dataVersion,
  });
}

function assertUnique<T>(
  values: readonly T[],
  key: (value: T) => string | number,
  code: 'DUPLICATE_TRIGRAM' | 'DUPLICATE_HEXAGRAM',
  message: string,
): void {
  const seen = new Set<string | number>();
  for (const value of values) {
    const itemKey = key(value);
    if (seen.has(itemKey)) {
      throw new HexagramDomainError(code, message);
    }
    seen.add(itemKey);
  }
}

export function createHexagramPairKey(upperTrigramId: string, lowerTrigramId: string): string {
  return `${upperTrigramId.length}:${upperTrigramId}|${lowerTrigramId.length}:${lowerTrigramId}`;
}

export function createHexagramCatalog(value: unknown): HexagramCatalog {
  if (!isRecord(value) || !Array.isArray(value.trigrams) || !Array.isArray(value.hexagrams)) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'A catalog requires dataVersion, trigrams, and hexagrams.',
    );
  }

  const dataVersion = readImmutableVersion(value.dataVersion, 'catalog.dataVersion');
  const trigrams = Object.freeze(
    value.trigrams.map((trigram) => parseTrigramDefinition(trigram, dataVersion)),
  );
  const hexagrams = Object.freeze(
    value.hexagrams.map((hexagram) => parseHexagramDefinition(hexagram, dataVersion, trigrams)),
  );

  assertUnique(
    trigrams,
    (trigram) => trigram.id,
    'DUPLICATE_TRIGRAM',
    'Trigram IDs must be unique.',
  );
  assertUnique(
    trigrams,
    (trigram) => trigram.code,
    'DUPLICATE_TRIGRAM',
    'Trigram codes must be unique.',
  );
  assertUnique(
    trigrams,
    (trigram) => trigram.symbol,
    'DUPLICATE_TRIGRAM',
    'Trigram symbols must be unique.',
  );
  assertUnique(
    hexagrams,
    (hexagram) => hexagram.id,
    'DUPLICATE_HEXAGRAM',
    'Hexagram IDs must be unique.',
  );
  assertUnique(
    hexagrams,
    (hexagram) => hexagram.kingWenSequence,
    'DUPLICATE_HEXAGRAM',
    'King Wen sequence numbers must be unique.',
  );
  assertUnique(
    hexagrams,
    (hexagram) => hexagram.symbol,
    'DUPLICATE_HEXAGRAM',
    'Hexagram symbols must be unique.',
  );
  assertUnique(
    hexagrams,
    (hexagram) => createHexagramPairKey(hexagram.upperTrigramId, hexagram.lowerTrigramId),
    'DUPLICATE_HEXAGRAM',
    'Each explicit upper/lower trigram pair must be unique.',
  );
  assertUnique(
    hexagrams,
    (hexagram) => hexagram.code,
    'DUPLICATE_HEXAGRAM',
    'Hexagram line codes must be unique.',
  );

  return Object.freeze({ dataVersion, trigrams, hexagrams }) as HexagramCatalog;
}

export function assertCompleteHexagramCatalog(catalog: HexagramCatalog): HexagramCatalog {
  const validatedCatalog = createHexagramCatalog(catalog);
  if (validatedCatalog.trigrams.length !== 8 || validatedCatalog.hexagrams.length !== 64) {
    throw new HexagramDomainError(
      'INCOMPLETE_CATALOG',
      'A complete catalog requires exactly eight trigrams and 64 hexagrams.',
    );
  }

  for (const code of TRIGRAM_CODES) {
    if (!validatedCatalog.trigrams.some((trigram) => trigram.code === code)) {
      throw new HexagramDomainError(
        'INCOMPLETE_CATALOG',
        `Complete catalog is missing trigram code ${code}.`,
      );
    }
  }

  for (const upper of validatedCatalog.trigrams) {
    for (const lower of validatedCatalog.trigrams) {
      const pairKey = createHexagramPairKey(upper.id, lower.id);
      if (
        !validatedCatalog.hexagrams.some(
          (hexagram) =>
            createHexagramPairKey(hexagram.upperTrigramId, hexagram.lowerTrigramId) === pairKey,
        )
      ) {
        throw new HexagramDomainError(
          'INCOMPLETE_CATALOG',
          `Complete catalog is missing upper/lower pair ${pairKey}.`,
        );
      }
    }
  }

  for (let sequence = 1; sequence <= 64; sequence += 1) {
    if (!validatedCatalog.hexagrams.some((hexagram) => hexagram.kingWenSequence === sequence)) {
      throw new HexagramDomainError(
        'INCOMPLETE_CATALOG',
        `Complete catalog is missing King Wen sequence ${sequence}.`,
      );
    }
  }

  return validatedCatalog;
}

export function trigramDefinitionToBits(trigram: TrigramDefinition): TrigramBits {
  const lineBits = createTrigramBits(trigram.lineBits);
  if (encodeTrigramBits(lineBits) !== trigram.code) {
    throw new HexagramDomainError(
      'INVALID_CATALOG',
      'Trigram definition code and line bits must describe the same bottom-to-top pattern.',
    );
  }
  return lineBits;
}

export function resolveTrigram(catalog: HexagramCatalog, lineBits: unknown): TrigramDefinition {
  const code = encodeTrigramBits(lineBits);
  const trigram = catalog.trigrams.find((candidate) => candidate.code === code);
  if (trigram === undefined) {
    throw new HexagramDomainError(
      'TRIGRAM_NOT_FOUND',
      `No explicit trigram mapping exists for code ${code}.`,
    );
  }
  return trigram;
}

export function resolveHexagram(
  catalog: HexagramCatalog,
  upperTrigramId: string,
  lowerTrigramId: string,
): HexagramDefinition {
  const pairKey = createHexagramPairKey(upperTrigramId, lowerTrigramId);
  const hexagram = catalog.hexagrams.find(
    (candidate) =>
      createHexagramPairKey(candidate.upperTrigramId, candidate.lowerTrigramId) === pairKey,
  );
  if (hexagram === undefined) {
    throw new HexagramDomainError(
      'HEXAGRAM_NOT_FOUND',
      `No explicit hexagram mapping exists for upper/lower pair ${pairKey}.`,
    );
  }
  return hexagram;
}

export function resolveHexagramByBits(
  catalog: HexagramCatalog,
  lineBits: unknown,
): ResolvedHexagram {
  const { lower, upper } = splitHexagramBits(lineBits);
  const lowerTrigram = resolveTrigram(catalog, lower);
  const upperTrigram = resolveTrigram(catalog, upper);
  const hexagram = resolveHexagram(catalog, upperTrigram.id, lowerTrigram.id);
  return Object.freeze({ lowerTrigram, upperTrigram, hexagram });
}

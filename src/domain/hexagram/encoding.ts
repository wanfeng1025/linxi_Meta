import type { Polarity } from '../casting';
import { HexagramDomainError } from './errors';
import type {
  HexagramBits,
  HexagramCode,
  TrigramBits,
  TrigramCode,
  TrigramPattern,
  YinYangBit,
} from './types';

export const TRIGRAM_CODES = Object.freeze([
  '000',
  '001',
  '010',
  '011',
  '100',
  '101',
  '110',
  '111',
] as const satisfies readonly TrigramCode[]);

export function isYinYangBit(value: unknown): value is YinYangBit {
  return value === 0 || value === 1;
}

export function polarityToBit(polarity: Polarity): YinYangBit {
  return polarity === 'yin' ? 0 : 1;
}

export function bitToPolarity(bit: YinYangBit): Polarity {
  return bit === 0 ? 'yin' : 'yang';
}

export function createTrigramBits(value: unknown): TrigramBits {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new HexagramDomainError(
      'INVALID_TRIGRAM_BITS',
      'Trigram bits must contain exactly three bottom-to-top values.',
    );
  }

  const [first, second, third] = value;
  if (!isYinYangBit(first) || !isYinYangBit(second) || !isYinYangBit(third)) {
    throw new HexagramDomainError('INVALID_BIT', 'Every trigram bit must be 0 or 1.');
  }

  return Object.freeze([first, second, third]);
}

export function createHexagramBits(value: unknown): HexagramBits {
  if (!Array.isArray(value) || value.length !== 6) {
    throw new HexagramDomainError(
      'INVALID_HEXAGRAM_BITS',
      'Hexagram bits must contain exactly six bottom-to-top values.',
    );
  }

  const [first, second, third, fourth, fifth, sixth] = value;
  if (
    !isYinYangBit(first) ||
    !isYinYangBit(second) ||
    !isYinYangBit(third) ||
    !isYinYangBit(fourth) ||
    !isYinYangBit(fifth) ||
    !isYinYangBit(sixth)
  ) {
    throw new HexagramDomainError('INVALID_BIT', 'Every hexagram bit must be 0 or 1.');
  }

  return Object.freeze([first, second, third, fourth, fifth, sixth]);
}

export function encodeTrigramBits(value: unknown): TrigramCode {
  const [first, second, third] = createTrigramBits(value);
  return `${first}${second}${third}`;
}

export function decodeTrigramCode(value: unknown): TrigramBits {
  if (typeof value !== 'string' || !TRIGRAM_CODES.some((code) => code === value)) {
    throw new HexagramDomainError(
      'INVALID_TRIGRAM_CODE',
      'Trigram code must be one of the eight three-bit bottom-to-top codes.',
    );
  }

  return createTrigramBits([
    value.charAt(0) === '1' ? 1 : 0,
    value.charAt(1) === '1' ? 1 : 0,
    value.charAt(2) === '1' ? 1 : 0,
  ]);
}

export function encodeHexagramBits(value: unknown): HexagramCode {
  const [first, second, third, fourth, fifth, sixth] = createHexagramBits(value);
  return `${first}${second}${third}${fourth}${fifth}${sixth}`;
}

export function decodeHexagramCode(value: unknown): HexagramBits {
  if (typeof value !== 'string' || !/^[01]{6}$/.test(value)) {
    throw new HexagramDomainError(
      'INVALID_HEXAGRAM_CODE',
      'Hexagram code must contain exactly six 0/1 characters from bottom to top.',
    );
  }

  return createHexagramBits([
    value.charAt(0) === '1' ? 1 : 0,
    value.charAt(1) === '1' ? 1 : 0,
    value.charAt(2) === '1' ? 1 : 0,
    value.charAt(3) === '1' ? 1 : 0,
    value.charAt(4) === '1' ? 1 : 0,
    value.charAt(5) === '1' ? 1 : 0,
  ]);
}

export function createTrigramPattern(value: unknown): TrigramPattern {
  const lineBits = createTrigramBits(value);
  const code = encodeTrigramBits(lineBits);
  return Object.freeze({
    id: `trigram-pattern-${code}`,
    code,
    lineBits,
  });
}

export function trigramPatternToBits(pattern: TrigramPattern): TrigramBits {
  const lineBits = createTrigramBits(pattern.lineBits);
  const code = encodeTrigramBits(lineBits);
  if (pattern.code !== code || pattern.id !== `trigram-pattern-${code}`) {
    throw new HexagramDomainError(
      'INVALID_TRIGRAM_CODE',
      'Trigram pattern ID, code, and bits must describe the same pattern.',
    );
  }
  return lineBits;
}

export function splitHexagramBits(value: unknown): Readonly<{
  lower: TrigramBits;
  upper: TrigramBits;
}> {
  const [first, second, third, fourth, fifth, sixth] = createHexagramBits(value);
  return Object.freeze({
    lower: createTrigramBits([first, second, third]),
    upper: createTrigramBits([fourth, fifth, sixth]),
  });
}

export function combineTrigramBits(lowerValue: unknown, upperValue: unknown): HexagramBits {
  const [first, second, third] = createTrigramBits(lowerValue);
  const [fourth, fifth, sixth] = createTrigramBits(upperValue);
  return createHexagramBits([first, second, third, fourth, fifth, sixth]);
}

export function toTopDownLineDisplay<T>(bottomUpLines: readonly T[]): readonly T[] {
  if (bottomUpLines.length !== 6) {
    throw new HexagramDomainError(
      'INVALID_LINE_COUNT',
      'A hexagram display requires exactly six bottom-to-top lines.',
    );
  }
  return Object.freeze([...bottomUpLines].reverse());
}

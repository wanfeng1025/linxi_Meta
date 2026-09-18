import { CastingDomainError } from './errors';
import type {
  CastLine,
  CoinTuple,
  CoinValue,
  LineMovement,
  LinePosition,
  LineValue,
  Polarity,
} from './types';

interface LineFacts {
  readonly polarity: Polarity;
  readonly movement: LineMovement;
  readonly changedPolarity: Polarity;
}

const LINE_FACTS: Readonly<Record<LineValue, LineFacts>> = Object.freeze({
  6: Object.freeze({ polarity: 'yin', movement: 'moving', changedPolarity: 'yang' }),
  7: Object.freeze({ polarity: 'yang', movement: 'static', changedPolarity: 'yang' }),
  8: Object.freeze({ polarity: 'yin', movement: 'static', changedPolarity: 'yin' }),
  9: Object.freeze({ polarity: 'yang', movement: 'moving', changedPolarity: 'yin' }),
});

export function isCoinValue(value: unknown): value is CoinValue {
  return value === 2 || value === 3;
}

export function isLineValue(value: unknown): value is LineValue {
  return value === 6 || value === 7 || value === 8 || value === 9;
}

export function isLinePosition(value: unknown): value is LinePosition {
  return Number.isInteger(value) && typeof value === 'number' && value >= 1 && value <= 6;
}

export function assertImmutableVersion(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim() === 'latest') {
    throw new CastingDomainError(
      'INVALID_VERSION',
      `${fieldName} must be a non-empty immutable version and cannot be "latest".`,
    );
  }

  return value;
}

export function createCoinTuple(value: unknown): CoinTuple {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new CastingDomainError('INVALID_COIN_COUNT', 'A line requires exactly three coins.');
  }

  const [first, second, third] = value;
  if (!isCoinValue(first) || !isCoinValue(second) || !isCoinValue(third)) {
    throw new CastingDomainError('INVALID_COIN_VALUE', 'Every coin must be either 2 or 3.');
  }

  return Object.freeze([first, second, third]);
}

export function getLineFacts(value: unknown, rulesetVersion: unknown): LineFacts {
  assertImmutableVersion(rulesetVersion, 'rulesetVersion');
  if (!isLineValue(value)) {
    throw new CastingDomainError('INVALID_LINE_VALUE', 'A line value must be 6, 7, 8, or 9.');
  }

  return LINE_FACTS[value];
}

export interface CreateCastLineInput {
  readonly position: unknown;
  readonly coins: unknown;
  readonly sequence: unknown;
  readonly rulesetVersion: unknown;
}

export function createCastLine(input: CreateCastLineInput): CastLine {
  if (!isLinePosition(input.position)) {
    throw new CastingDomainError('INVALID_LINE_POSITION', 'Line position must be from 1 to 6.');
  }
  if (!isLinePosition(input.sequence) || input.sequence !== input.position) {
    throw new CastingDomainError(
      'INVALID_LINE_SEQUENCE',
      'Line sequence must equal its bottom-to-top position.',
    );
  }

  const coins = createCoinTuple(input.coins);
  const sum = coins[0] + coins[1] + coins[2];
  if (!isLineValue(sum)) {
    throw new CastingDomainError('INVALID_LINE_VALUE', 'Coin sum must produce a valid line value.');
  }

  const facts = getLineFacts(sum, input.rulesetVersion);
  return Object.freeze({
    position: input.position,
    coins,
    value: sum,
    polarity: facts.polarity,
    movement: facts.movement,
    changedPolarity: facts.changedPolarity,
    sequence: input.sequence,
  });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function restoreCastLine(
  value: unknown,
  expectedPosition: LinePosition,
  rulesetVersion: string,
): CastLine {
  if (!isRecord(value)) {
    throw new CastingDomainError('INVALID_LINE_FACTS', 'Saved line must be an object.');
  }

  const restored = createCastLine({
    position: value.position,
    coins: value.coins,
    sequence: value.sequence,
    rulesetVersion,
  });

  if (restored.position !== expectedPosition) {
    throw new CastingDomainError(
      'INVALID_LINE_POSITION',
      'Saved lines must be continuous from the bottom line upward.',
    );
  }

  if (
    value.value !== restored.value ||
    value.polarity !== restored.polarity ||
    value.movement !== restored.movement ||
    value.changedPolarity !== restored.changedPolarity
  ) {
    throw new CastingDomainError(
      'INVALID_LINE_FACTS',
      'Saved derived line facts do not match the original coins.',
    );
  }

  return restored;
}

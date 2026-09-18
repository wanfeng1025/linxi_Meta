import { describe, expect, it } from 'vitest';

import {
  CASTING_INPUT_SCHEMA_VERSION,
  CASTING_RULESET_VERSION,
  CastingDomainError,
  castNextLine,
  createCastingSession,
  getCastingProgress,
  lockCastingSession,
  resetCastingSession,
  restoreCastingSession,
  restoreLastUndoneLine,
  undoLastLine,
  type CastingMethod,
  type CastingSession,
  type CoinTuple,
} from '../../src/domain/casting';

const coins: CoinTuple = [2, 3, 2];

function timestamp(step: number): string {
  return new Date(Date.UTC(2026, 6, 20, 0, 0, step)).toISOString();
}

function newSession(method: CastingMethod = 'tap'): CastingSession {
  return createCastingSession({
    sessionId: `session-${method}`,
    method,
    inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
    rulesetVersion: CASTING_RULESET_VERSION,
    randomAlgorithmVersion: 'test-sequence-coin-v1',
    createdAt: timestamp(0),
  });
}

function castLines(session: CastingSession, count: number): CastingSession {
  let current = session;
  for (let index = 1; index <= count; index += 1) {
    current = castNextLine(current, coins, timestamp(index));
  }
  return current;
}

function expectDomainError(operation: () => unknown, code: CastingDomainError['code']): void {
  try {
    operation();
    throw new Error('Expected CastingDomainError.');
  } catch (error) {
    expect(error).toBeInstanceOf(CastingDomainError);
    expect((error as CastingDomainError).code).toBe(code);
  }
}

describe('casting session state machine', () => {
  it('stores the first line at position 1 and the sixth at position 6', () => {
    const initial = newSession();
    expect(initial.status).toBe('draft');
    expect(getCastingProgress(initial)).toEqual({
      castCount: 0,
      remainingCount: 6,
      nextPosition: 1,
      isComplete: false,
      isLocked: false,
    });

    const complete = castLines(initial, 6);
    expect(complete.status).toBe('complete');
    expect(complete.lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(complete.lines.map((line) => line.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(getCastingProgress(complete)).toMatchObject({
      castCount: 6,
      remainingCount: 0,
      nextPosition: null,
      isComplete: true,
    });
    expect(Object.isFrozen(complete)).toBe(true);
    expect(Object.isFrozen(complete.lines)).toBe(true);
    expect(Object.isFrozen(complete.lines[0]?.coins)).toBe(true);
  });

  it('rejects a seventh line and all mutations after completion', () => {
    const complete = castLines(newSession(), 6);

    expectDomainError(() => castNextLine(complete, coins, timestamp(7)), 'SESSION_COMPLETE');
    expectDomainError(() => undoLastLine(complete, timestamp(7)), 'SESSION_COMPLETE');
    expectDomainError(() => resetCastingSession(complete, timestamp(7)), 'SESSION_COMPLETE');
  });

  it('undoes only the last line and restores it without generating new coins', () => {
    const threeLines = castLines(newSession(), 3);
    const undone = undoLastLine(threeLines, timestamp(4));

    expect(undone.lines.map((line) => line.position)).toEqual([1, 2]);
    expect(undone.redoLines).toEqual([threeLines.lines[2]]);

    const restored = restoreLastUndoneLine(undone, timestamp(5));
    expect(restored.lines).toEqual(threeLines.lines);
    expect(restored.redoLines).toEqual([]);
  });

  it('resets only an incomplete session', () => {
    const session = castLines(newSession(), 2);
    const reset = resetCastingSession(session, timestamp(3));

    expect(reset.status).toBe('draft');
    expect(reset.lines).toEqual([]);
    expect(reset.redoLines).toEqual([]);
  });

  it('locks only a complete session and rejects every later mutation', () => {
    const incomplete = castLines(newSession(), 5);
    expectDomainError(() => lockCastingSession(incomplete, timestamp(6)), 'SESSION_NOT_COMPLETE');

    const locked = lockCastingSession(castNextLine(incomplete, coins, timestamp(6)), timestamp(7));
    expect(locked.status).toBe('locked');
    expect(locked.lockedAt).toBe(timestamp(7));
    expectDomainError(() => lockCastingSession(locked, timestamp(8)), 'SESSION_LOCKED');
    expectDomainError(() => castNextLine(locked, coins, timestamp(8)), 'SESSION_LOCKED');
    expectDomainError(() => undoLastLine(locked, timestamp(8)), 'SESSION_LOCKED');
  });

  it('restores a saved incomplete session without changing raw data', () => {
    const session = castLines(newSession(), 4);
    const persisted = JSON.parse(JSON.stringify(session)) as unknown;
    const restored = restoreCastingSession(persisted);

    expect(restored).toEqual(session);
    expect(restored.lines.map((line) => line.coins)).toEqual(
      session.lines.map((line) => line.coins),
    );
  });

  it('rejects illegal saved session states and corrupted original data', () => {
    const session = castLines(newSession(), 1);
    expectDomainError(
      () => restoreCastingSession({ ...session, status: 'complete' }),
      'INVALID_SESSION_STATE',
    );
    expectDomainError(
      () =>
        restoreCastingSession({
          ...session,
          lines: [{ ...session.lines[0], coins: [2, 2, 4] }],
        }),
      'INVALID_COIN_VALUE',
    );
    expectDomainError(
      () => restoreCastingSession({ ...session, updatedAt: timestamp(-1) }),
      'INVALID_SESSION_STATE',
    );
    expectDomainError(() => undoLastLine(newSession(), timestamp(1)), 'NO_LINE_TO_UNDO');
  });

  it('keeps tap and shake as metadata only', () => {
    const tap = castLines(newSession('tap'), 1);
    const shake = castLines(newSession('shake'), 1);

    expect(tap.lines).toEqual(shake.lines);
    expect(tap.method).toBe('tap');
    expect(shake.method).toBe('shake');
  });
});

import { describe, expect, it } from 'vitest';

import {
  CASTING_INPUT_SCHEMA_VERSION,
  CASTING_RULESET_VERSION,
  CastingDomainError,
  type CoinValue,
  type RandomSource,
} from '../../src/domain/casting';
import { CastingApplicationError, CastingService } from '../../src/application/casting';
import { InMemoryCastingSessionRepository } from '../../src/infrastructure/repositories/InMemoryCastingSessionRepository';
import {
  ExpoCryptoRandomSource,
  FixedRandomSource,
  SequenceRandomSource,
} from '../../src/infrastructure/random';

function timestamp(step: number): string {
  return new Date(Date.UTC(2026, 6, 20, 1, 0, step)).toISOString();
}

function service(
  repository: InMemoryCastingSessionRepository,
  randomSource: RandomSource,
): CastingService {
  return new CastingService({
    repository,
    randomSource,
    inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
    rulesetVersion: CASTING_RULESET_VERSION,
  });
}

async function expectErrorCode(
  operation: () => Promise<unknown>,
  errorType: typeof CastingDomainError | typeof CastingApplicationError,
  code: string,
): Promise<void> {
  try {
    await operation();
    throw new Error('Expected a casting error.');
  } catch (error) {
    expect(error).toBeInstanceOf(errorType);
    expect((error as CastingDomainError | CastingApplicationError).code).toBe(code);
  }
}

describe('casting application and infrastructure', () => {
  it('repeats an exactly controlled coin sequence', async () => {
    const values = [2, 2, 2, 2, 2, 3, 3, 3, 3] as const;

    const run = async () => {
      const repository = new InMemoryCastingSessionRepository();
      const casting = service(repository, new SequenceRandomSource(values));
      await casting.startSession({
        sessionId: 'repeatable',
        method: 'tap',
        createdAt: timestamp(0),
      });

      const lines = [];
      for (let index = 0; index < 3; index += 1) {
        const session = await casting.castNext({
          sessionId: 'repeatable',
          updatedAt: timestamp(index + 1),
          expectedLineCount: index,
        });
        lines.push(session.lines[index]);
      }
      return lines;
    };

    expect(await run()).toEqual(await run());
  });

  it('does not call a random source while restoring a saved session', async () => {
    const repository = new InMemoryCastingSessionRepository();
    const initialRandom = new SequenceRandomSource([2, 2, 2, 3, 3, 3]);
    const initialService = service(repository, initialRandom);
    await initialService.startSession({
      sessionId: 'resume',
      method: 'tap',
      createdAt: timestamp(0),
    });
    await initialService.castNext({
      sessionId: 'resume',
      updatedAt: timestamp(1),
      expectedLineCount: 0,
    });
    const beforeExit = await initialService.castNext({
      sessionId: 'resume',
      updatedAt: timestamp(2),
      expectedLineCount: 1,
    });

    const resumedRandom = new SequenceRandomSource([2, 3, 2]);
    const resumedService = service(repository, resumedRandom);
    const restored = await resumedService.restoreActiveSession();

    expect(restored).toEqual(beforeExit);
    expect(resumedRandom.consumedCount).toBe(0);

    const continued = await resumedService.castNext({
      sessionId: 'resume',
      updatedAt: timestamp(3),
      expectedLineCount: 2,
    });
    expect(continued.lines.slice(0, 2)).toEqual(beforeExit.lines);
    expect(resumedRandom.consumedCount).toBe(3);
  });

  it('rejects a seventh cast before consuming more randomness', async () => {
    const sequence = Array.from({ length: 18 }, (_, index) =>
      index % 2 === 0 ? 2 : 3,
    ) as CoinValue[];
    const random = new SequenceRandomSource(sequence);
    const repository = new InMemoryCastingSessionRepository();
    const casting = service(repository, random);
    await casting.startSession({ sessionId: 'six-only', method: 'tap', createdAt: timestamp(0) });

    for (let index = 0; index < 6; index += 1) {
      await casting.castNext({
        sessionId: 'six-only',
        updatedAt: timestamp(index + 1),
        expectedLineCount: index,
      });
    }

    await expectErrorCode(
      () =>
        casting.castNext({
          sessionId: 'six-only',
          updatedAt: timestamp(7),
          expectedLineCount: 6,
        }),
      CastingDomainError,
      'SESSION_COMPLETE',
    );
    expect(random.consumedCount).toBe(18);
  });

  it('locks complete data into the repository and removes the active draft', async () => {
    const repository = new InMemoryCastingSessionRepository();
    const casting = service(repository, new FixedRandomSource(2));
    await casting.startSession({ sessionId: 'lock-me', method: 'tap', createdAt: timestamp(0) });

    for (let index = 0; index < 6; index += 1) {
      await casting.castNext({
        sessionId: 'lock-me',
        updatedAt: timestamp(index + 1),
        expectedLineCount: index,
      });
    }

    const locked = await casting.lock({
      sessionId: 'lock-me',
      updatedAt: timestamp(7),
      expectedLineCount: 6,
    });
    expect(locked.status).toBe('locked');
    expect(await casting.restoreActiveSession()).toBeNull();
    expect(await repository.loadCompletedSession('lock-me')).toEqual(locked);
  });

  it('rejects stale duplicate triggers without consuming coins', async () => {
    const random = new SequenceRandomSource([2, 2, 2, 3, 3, 3]);
    const repository = new InMemoryCastingSessionRepository();
    const casting = service(repository, random);
    await casting.startSession({ sessionId: 'stale', method: 'tap', createdAt: timestamp(0) });
    await casting.castNext({
      sessionId: 'stale',
      updatedAt: timestamp(1),
      expectedLineCount: 0,
    });

    await expectErrorCode(
      () =>
        casting.castNext({
          sessionId: 'stale',
          updatedAt: timestamp(2),
          expectedLineCount: 0,
        }),
      CastingApplicationError,
      'STALE_SESSION',
    );
    expect(random.consumedCount).toBe(3);
  });

  it('supports undo, redo, reset, progress, and draft deletion through the service', async () => {
    const repository = new InMemoryCastingSessionRepository();
    const casting = service(repository, new FixedRandomSource(3));
    await casting.startSession({ sessionId: 'commands', method: 'tap', createdAt: timestamp(0) });
    await casting.castNext({
      sessionId: 'commands',
      updatedAt: timestamp(1),
      expectedLineCount: 0,
    });
    expect(await casting.getProgress('commands')).toMatchObject({ castCount: 1, nextPosition: 2 });

    await casting.undo({
      sessionId: 'commands',
      updatedAt: timestamp(2),
      expectedLineCount: 1,
    });
    const redone = await casting.restoreUndone({
      sessionId: 'commands',
      updatedAt: timestamp(3),
      expectedLineCount: 0,
    });
    expect(redone.lines[0]?.coins).toEqual([3, 3, 3]);

    await casting.reset({
      sessionId: 'commands',
      updatedAt: timestamp(4),
      expectedLineCount: 1,
    });
    await casting.deleteDraft('commands');
    expect(await casting.restoreActiveSession()).toBeNull();
  });

  it('maps secure bytes evenly by their low bit and fails closed', async () => {
    const even = new ExpoCryptoRandomSource(async () => new Uint8Array([254]));
    const odd = new ExpoCryptoRandomSource(async () => new Uint8Array([255]));
    const unavailable = new ExpoCryptoRandomSource(async () => {
      throw new Error('not available');
    });
    const invalid = new ExpoCryptoRandomSource(async () => new Uint8Array());

    expect(await even.nextCoin()).toBe(2);
    expect(await odd.nextCoin()).toBe(3);
    await expectErrorCode(
      () => unavailable.nextCoin(),
      CastingDomainError,
      'SECURE_RANDOM_UNAVAILABLE',
    );
    await expectErrorCode(
      () => invalid.nextCoin(),
      CastingDomainError,
      'SECURE_RANDOM_UNAVAILABLE',
    );
  });

  it('maps all byte values to exactly 128 twos and 128 threes', async () => {
    let nextByte = 0;
    const random = new ExpoCryptoRandomSource(async () => new Uint8Array([nextByte++]));
    const results = await Promise.all(Array.from({ length: 256 }, () => random.nextCoin()));

    expect(results.filter((value) => value === 2)).toHaveLength(128);
    expect(results.filter((value) => value === 3)).toHaveLength(128);
  });

  it('rejects invalid or exhausted deterministic sequences', async () => {
    expect(() => new SequenceRandomSource([2, 4] as unknown as CoinValue[])).toThrow(
      CastingDomainError,
    );

    const sequence = new SequenceRandomSource([2]);
    expect(await sequence.nextCoin()).toBe(2);
    await expectErrorCode(() => sequence.nextCoin(), CastingDomainError, 'RANDOM_SOURCE_EXHAUSTED');
  });

  it('rejects a concurrent duplicate trigger for the same session', async () => {
    let releaseRandom!: () => void;
    let markStarted!: () => void;
    const randomReleased = new Promise<void>((resolve) => {
      releaseRandom = resolve;
    });
    const randomStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const delayedRandom: RandomSource = {
      algorithmVersion: 'test-delayed-v1',
      async nextCoin() {
        markStarted();
        await randomReleased;
        return 2;
      },
    };
    const repository = new InMemoryCastingSessionRepository();
    const casting = service(repository, delayedRandom);
    await casting.startSession({ sessionId: 'busy', method: 'tap', createdAt: timestamp(0) });

    const first = casting.castNext({
      sessionId: 'busy',
      updatedAt: timestamp(1),
      expectedLineCount: 0,
    });
    await randomStarted;
    await expectErrorCode(
      () =>
        casting.castNext({
          sessionId: 'busy',
          updatedAt: timestamp(1),
          expectedLineCount: 0,
        }),
      CastingApplicationError,
      'SESSION_BUSY',
    );

    releaseRandom();
    expect((await first).lines).toHaveLength(1);
  });
});

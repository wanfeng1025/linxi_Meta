import {
  assertCanCastNext,
  castNextLine,
  createCastingSession,
  drawThreeCoins,
  getCastingProgress,
  lockCastingSession,
  resetCastingSession,
  restoreLastUndoneLine,
  undoLastLine,
  type CastingMethod,
  type CastingProgress,
  type CastingSession,
  type RandomSource,
} from '@/domain/casting';

import type { CastingSessionRepository } from './CastingSessionRepository';
import { CastingApplicationError } from './errors';

export interface CastingServiceOptions {
  readonly repository: CastingSessionRepository;
  readonly randomSource: RandomSource;
  readonly inputSchemaVersion: string;
  readonly rulesetVersion: string;
}

export interface StartCastingSessionInput {
  readonly sessionId: string;
  readonly method: CastingMethod;
  readonly createdAt: string;
}

export interface SessionCommandInput {
  readonly sessionId: string;
  readonly updatedAt: string;
  readonly expectedLineCount: number;
}

export class CastingService {
  private readonly repository: CastingSessionRepository;
  private readonly randomSource: RandomSource;
  private readonly inputSchemaVersion: string;
  private readonly rulesetVersion: string;
  private readonly activeMutations = new Set<string>();

  public constructor(options: CastingServiceOptions) {
    this.repository = options.repository;
    this.randomSource = options.randomSource;
    this.inputSchemaVersion = options.inputSchemaVersion;
    this.rulesetVersion = options.rulesetVersion;
  }

  public async startSession(input: StartCastingSessionInput): Promise<CastingSession> {
    if ((await this.repository.loadActiveSession()) !== null) {
      throw new CastingApplicationError(
        'ACTIVE_SESSION_EXISTS',
        'Finish or delete the active session before starting another one.',
      );
    }

    const session = createCastingSession({
      ...input,
      inputSchemaVersion: this.inputSchemaVersion,
      rulesetVersion: this.rulesetVersion,
      randomAlgorithmVersion: this.randomSource.algorithmVersion,
    });
    await this.repository.saveActiveSession(session);
    return session;
  }

  public async castNext(input: SessionCommandInput): Promise<CastingSession> {
    return this.withMutation(input.sessionId, async () => {
      const session = await this.requireActiveSession(input.sessionId, input.expectedLineCount);
      assertCanCastNext(session);
      const coins = await drawThreeCoins(this.randomSource);
      const next = castNextLine(session, coins, input.updatedAt);
      await this.repository.saveActiveSession(next);
      return next;
    });
  }

  public async undo(input: SessionCommandInput): Promise<CastingSession> {
    return this.withMutation(input.sessionId, async () => {
      const session = await this.requireActiveSession(input.sessionId, input.expectedLineCount);
      const next = undoLastLine(session, input.updatedAt);
      await this.repository.saveActiveSession(next);
      return next;
    });
  }

  public async restoreUndone(input: SessionCommandInput): Promise<CastingSession> {
    return this.withMutation(input.sessionId, async () => {
      const session = await this.requireActiveSession(input.sessionId, input.expectedLineCount);
      const next = restoreLastUndoneLine(session, input.updatedAt);
      await this.repository.saveActiveSession(next);
      return next;
    });
  }

  public async reset(input: SessionCommandInput): Promise<CastingSession> {
    return this.withMutation(input.sessionId, async () => {
      const session = await this.requireActiveSession(input.sessionId, input.expectedLineCount);
      const next = resetCastingSession(session, input.updatedAt);
      await this.repository.saveActiveSession(next);
      return next;
    });
  }

  public async lock(input: SessionCommandInput): Promise<CastingSession> {
    return this.withMutation(input.sessionId, async () => {
      const session = await this.requireActiveSession(input.sessionId, input.expectedLineCount);
      const locked = lockCastingSession(session, input.updatedAt);
      await this.repository.completeSession(locked);
      return locked;
    });
  }

  public async restoreActiveSession(): Promise<CastingSession | null> {
    return this.repository.loadActiveSession();
  }

  public async getProgress(sessionId: string): Promise<CastingProgress> {
    return getCastingProgress(await this.requireActiveSession(sessionId));
  }

  public async deleteDraft(sessionId: string): Promise<void> {
    await this.withMutation(sessionId, async () => {
      const session = await this.requireActiveSession(sessionId);
      if (session.status !== 'draft' && session.status !== 'collecting') {
        throw new CastingApplicationError(
          'NOT_A_DRAFT',
          'Only a draft or collecting session can be deleted.',
        );
      }
      await this.repository.deleteDraft(sessionId);
    });
  }

  private async requireActiveSession(
    sessionId: string,
    expectedLineCount?: number,
  ): Promise<CastingSession> {
    const session = await this.repository.loadActiveSession();
    if (session === null) {
      throw new CastingApplicationError('SESSION_NOT_FOUND', 'No active casting session exists.');
    }
    if (session.sessionId !== sessionId) {
      throw new CastingApplicationError(
        'SESSION_ID_MISMATCH',
        'The active session does not match the requested session.',
      );
    }
    if (expectedLineCount !== undefined && session.lines.length !== expectedLineCount) {
      throw new CastingApplicationError(
        'STALE_SESSION',
        'The casting command was created from a stale session projection.',
      );
    }
    return session;
  }

  private async withMutation<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    if (this.activeMutations.has(sessionId)) {
      throw new CastingApplicationError(
        'SESSION_BUSY',
        'Another mutation for this session is already in progress.',
      );
    }

    this.activeMutations.add(sessionId);
    try {
      return await operation();
    } finally {
      this.activeMutations.delete(sessionId);
    }
  }
}

import type { CastingSessionRepository } from '@/application/casting';
import { CastingDomainError, restoreCastingSession, type CastingSession } from '@/domain/casting';

export class InMemoryCastingSessionRepository implements CastingSessionRepository {
  private activeSession: CastingSession | null = null;
  private readonly completedSessions = new Map<string, CastingSession>();

  public async saveActiveSession(session: CastingSession): Promise<void> {
    const restored = restoreCastingSession(session);
    if (restored.status === 'locked') {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'A locked session cannot be saved as an active draft.',
      );
    }
    if (this.activeSession !== null && this.activeSession.sessionId !== restored.sessionId) {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'A different active session already exists.',
      );
    }
    this.activeSession = restored;
  }

  public async loadActiveSession(): Promise<CastingSession | null> {
    return this.activeSession === null ? null : restoreCastingSession(this.activeSession);
  }

  public async completeSession(session: CastingSession): Promise<void> {
    const restored = restoreCastingSession(session);
    if (restored.status !== 'locked') {
      throw new CastingDomainError(
        'SESSION_NOT_COMPLETE',
        'The repository can complete only a locked six-line session.',
      );
    }
    if (
      this.activeSession === null ||
      this.activeSession.sessionId !== restored.sessionId ||
      this.activeSession.status !== 'complete' ||
      !sameImmutableFacts(this.activeSession, restored)
    ) {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'The locked session must match the active complete session.',
      );
    }

    this.completedSessions.set(restored.sessionId, restored);
    if (this.activeSession?.sessionId === restored.sessionId) {
      this.activeSession = null;
    }
  }

  public async deleteDraft(sessionId: string): Promise<void> {
    if (this.activeSession?.sessionId === sessionId) {
      this.activeSession = null;
    }
  }

  public async loadCompletedSession(sessionId: string): Promise<CastingSession | null> {
    const session = this.completedSessions.get(sessionId);
    return session === undefined ? null : restoreCastingSession(session);
  }

  public async loadPendingCompletedSession(sessionId?: string): Promise<CastingSession | null> {
    if (sessionId === undefined) {
      const first = this.completedSessions.values().next().value as CastingSession | undefined;
      return first === undefined ? null : restoreCastingSession(first);
    }
    return this.loadCompletedSession(sessionId);
  }

  public async acknowledgeCompletedSession(sessionId: string): Promise<void> {
    this.completedSessions.delete(sessionId);
  }

  public async clearCorruptedState(): Promise<void> {
    this.activeSession = null;
    this.completedSessions.clear();
  }
}

function sameImmutableFacts(active: CastingSession, locked: CastingSession): boolean {
  return (
    active.method === locked.method &&
    active.inputSchemaVersion === locked.inputSchemaVersion &&
    active.rulesetVersion === locked.rulesetVersion &&
    active.randomAlgorithmVersion === locked.randomAlgorithmVersion &&
    active.createdAt === locked.createdAt &&
    JSON.stringify(active.lines) === JSON.stringify(locked.lines)
  );
}

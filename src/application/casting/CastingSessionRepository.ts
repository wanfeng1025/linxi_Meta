import type { CastingSession } from '@/domain/casting';

export interface CastingSessionRepository {
  saveActiveSession(session: CastingSession): Promise<void>;
  loadActiveSession(): Promise<CastingSession | null>;
  completeSession(session: CastingSession): Promise<void>;
  deleteDraft(sessionId: string): Promise<void>;
}

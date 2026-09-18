import type { CastingSession, HexagramCalculationResult } from '@liuyao/domain';

export interface CastingSessionSnapshot {
  readonly schemaVersion: 'casting-session-snapshot-v1';
  readonly session: CastingSession;
  readonly result: HexagramCalculationResult | null;
}

export interface CastingSessionStore {
  load(sessionId: string): Promise<CastingSessionSnapshot | null>;
  save(snapshot: CastingSessionSnapshot): Promise<void>;
  remove(sessionId: string): Promise<void>;
}

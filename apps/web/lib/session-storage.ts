import { z } from 'zod';

import {
  restoreCastingSession,
  type CastingSession,
  type HexagramCalculationResult,
} from '@liuyao/domain';

export const WEB_SESSION_STORAGE_SCHEMA_VERSION = 'web-casting-session-v1';

const STORAGE_PREFIX = 'liuyao:web:session:';
const ACTIVE_SESSION_KEY = 'liuyao:web:active-session-id';

const StoredSnapshotSchema = z.object({
  schemaVersion: z.literal(WEB_SESSION_STORAGE_SCHEMA_VERSION),
  question: z.string().max(1_000),
  session: z.unknown(),
  result: z.unknown().nullable(),
});

export interface WebCastingSnapshot {
  readonly schemaVersion: typeof WEB_SESSION_STORAGE_SCHEMA_VERSION;
  readonly question: string;
  readonly session: CastingSession;
  /**
   * A serialized, informational snapshot captured at lock time. The UI always
   * recalculates facts from the stored coins and ruleset before rendering.
   */
  readonly result: HexagramCalculationResult | null;
}

export function sessionStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function saveWebCastingSnapshot(
  storage: Storage,
  snapshot: WebCastingSnapshot,
  options: { readonly active?: boolean } = {},
): void {
  const session = restoreCastingSession(snapshot.session);
  const normalized: WebCastingSnapshot = {
    schemaVersion: WEB_SESSION_STORAGE_SCHEMA_VERSION,
    question: snapshot.question,
    session,
    result: snapshot.result,
  };

  storage.setItem(sessionStorageKey(session.sessionId), JSON.stringify(normalized));
  if (options.active === true) {
    storage.setItem(ACTIVE_SESSION_KEY, session.sessionId);
  } else if (storage.getItem(ACTIVE_SESSION_KEY) === session.sessionId) {
    storage.removeItem(ACTIVE_SESSION_KEY);
  }
}

export function loadWebCastingSnapshot(
  storage: Storage,
  sessionId: string,
): WebCastingSnapshot | null {
  const key = sessionStorageKey(sessionId);
  const raw = storage.getItem(key);
  if (raw === null) return null;

  try {
    const parsed = StoredSnapshotSchema.parse(JSON.parse(raw));
    const session = restoreCastingSession(parsed.session);
    if (session.sessionId !== sessionId) {
      throw new Error('Stored session id does not match its storage key.');
    }
    return Object.freeze({
      schemaVersion: parsed.schemaVersion,
      question: parsed.question,
      session,
      result: parsed.result as HexagramCalculationResult | null,
    });
  } catch {
    storage.removeItem(key);
    if (storage.getItem(ACTIVE_SESSION_KEY) === sessionId) storage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
}

export function loadActiveWebCastingSnapshot(storage: Storage): WebCastingSnapshot | null {
  const sessionId = storage.getItem(ACTIVE_SESSION_KEY);
  return sessionId === null ? null : loadWebCastingSnapshot(storage, sessionId);
}

export function clearWebCastingSnapshot(storage: Storage, sessionId: string): void {
  storage.removeItem(sessionStorageKey(sessionId));
  if (storage.getItem(ACTIVE_SESSION_KEY) === sessionId) storage.removeItem(ACTIVE_SESSION_KEY);
}

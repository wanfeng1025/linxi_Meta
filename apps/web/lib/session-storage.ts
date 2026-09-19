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
  schemaVersion: z.string(),
  question: z.string().max(1_000).optional().default(''),
  session: z.unknown(),
  result: z.unknown().nullable().optional().default(null),
});

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Result snapshots are advisory only: the session's raw coins are the source
 * of truth and are recalculated before rendering. This boundary keeps old
 * static records from resurrecting a fake changed hexagram and drops unknown
 * result shapes without making the result page fail to load.
 */
function normalizeStoredResult(value: unknown): HexagramCalculationResult | null {
  if (!isRecord(value)) return null;
  if (value.changeStatus === 'STATIC') return null;
  if (value.changeStatus !== 'CHANGING') return null;
  if (!Array.isArray(value.movingLines) || value.movingLines.length === 0) return null;
  if (!isRecord(value.changedHexagram) || !Array.isArray(value.changedLineBits)) return null;
  return value as unknown as HexagramCalculationResult;
}

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
    result: normalizeStoredResult(snapshot.result),
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
    if (
      parsed.schemaVersion !== WEB_SESSION_STORAGE_SCHEMA_VERSION &&
      parsed.schemaVersion !== 'web-casting-session-v0'
    ) {
      throw new Error('Unsupported web session snapshot version.');
    }
    const session = restoreCastingSession(parsed.session);
    if (session.sessionId !== sessionId) {
      throw new Error('Stored session id does not match its storage key.');
    }
    return Object.freeze({
      schemaVersion: WEB_SESSION_STORAGE_SCHEMA_VERSION,
      question: parsed.question,
      session,
      result: normalizeStoredResult(parsed.result),
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

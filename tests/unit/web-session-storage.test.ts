import { describe, expect, it } from 'vitest';

import { castNextLine, createCastingSession, lockCastingSession } from '../../src/domain/casting';
import {
  clearWebCastingSnapshot,
  loadActiveWebCastingSnapshot,
  loadWebCastingSnapshot,
  saveWebCastingSnapshot,
  sessionStorageKey,
  WEB_SESSION_STORAGE_SCHEMA_VERSION,
} from '../../apps/web/lib/session-storage';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function draftSession() {
  return createCastingSession({
    sessionId: 'web-storage-session',
    method: 'tap',
    inputSchemaVersion: 'web-input-v1',
    rulesetVersion: 'hexagram-structure-v1',
    randomAlgorithmVersion: 'web-crypto-v1',
    createdAt: '2026-07-25T00:00:00.000Z',
  });
}

function lockedStaticSession() {
  let session = draftSession();
  for (let index = 0; index < 6; index += 1) {
    session = castNextLine(session, [2, 2, 3], `2026-07-25T00:00:0${index + 1}.000Z`);
  }
  return lockCastingSession(session, '2026-07-25T00:00:07.000Z');
}

describe('web session storage', () => {
  it('round-trips a versioned active anonymous draft', () => {
    const storage = new MemoryStorage();
    const session = draftSession();

    saveWebCastingSnapshot(
      storage,
      {
        schemaVersion: WEB_SESSION_STORAGE_SCHEMA_VERSION,
        question: '只保存在浏览器内的问题',
        session,
        result: null,
      },
      { active: true },
    );

    expect(loadActiveWebCastingSnapshot(storage)).toMatchObject({
      question: '只保存在浏览器内的问题',
      session: { sessionId: session.sessionId, status: 'draft' },
    });
  });

  it('removes malformed and incompatible entries instead of restoring them', () => {
    const storage = new MemoryStorage();
    storage.setItem(sessionStorageKey('broken'), '{not json');
    expect(loadWebCastingSnapshot(storage, 'broken')).toBeNull();
    expect(storage.getItem(sessionStorageKey('broken'))).toBeNull();

    const legacySession = lockedStaticSession();
    storage.setItem(
      sessionStorageKey(legacySession.sessionId),
      JSON.stringify({
        schemaVersion: 'web-casting-session-v0',
        question: '',
        session: legacySession,
        result: {
          changeStatus: 'STATIC',
          movingLines: [],
          changedHexagram: { id: 'legacy-static-pseudo' },
          changedLineBits: [1, 1, 1, 1, 1, 1],
        },
      }),
    );
    expect(loadWebCastingSnapshot(storage, legacySession.sessionId)).toMatchObject({
      schemaVersion: WEB_SESSION_STORAGE_SCHEMA_VERSION,
      session: { status: 'locked' },
      result: null,
    });

    storage.setItem(
      sessionStorageKey('old-version'),
      JSON.stringify({
        schemaVersion: 'web-casting-session-v0',
        question: '',
        session: {},
        result: null,
      }),
    );
    expect(loadWebCastingSnapshot(storage, 'old-version')).toBeNull();
    expect(storage.getItem(sessionStorageKey('old-version'))).toBeNull();
  });

  it('clears both a snapshot and its active pointer', () => {
    const storage = new MemoryStorage();
    const session = draftSession();
    saveWebCastingSnapshot(
      storage,
      { schemaVersion: WEB_SESSION_STORAGE_SCHEMA_VERSION, question: '', session, result: null },
      { active: true },
    );

    clearWebCastingSnapshot(storage, session.sessionId);
    expect(loadActiveWebCastingSnapshot(storage)).toBeNull();
  });
});

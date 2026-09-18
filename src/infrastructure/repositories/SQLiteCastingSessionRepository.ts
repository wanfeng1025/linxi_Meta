import type { CastingSessionRepository } from '@/application/casting';
import { CastingDomainError, restoreCastingSession, type CastingSession } from '@/domain/casting';
import type { SqlDatabase } from '@/infrastructure/database';

const STORAGE_KEY = 'page.active-casting-envelope-v1';

interface StoredEnvelope {
  readonly schemaVersion: 'active-casting-envelope-v1';
  readonly active: unknown | null;
  readonly pendingCompleted: unknown | null;
}

interface SettingRow {
  readonly setting_value: string;
}

export class CastingStorageError extends Error {
  public override readonly name = 'CastingStorageError';

  public constructor(
    public readonly code: 'CORRUPTED_CASTING_STATE',
    message: string,
  ) {
    super(message);
  }
}

function emptyEnvelope(): StoredEnvelope {
  return { schemaVersion: 'active-casting-envelope-v1', active: null, pendingCompleted: null };
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

export class SQLiteCastingSessionRepository implements CastingSessionRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async saveActiveSession(session: CastingSession): Promise<void> {
    const restored = restoreCastingSession(session);
    if (restored.status === 'locked') {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'A locked session cannot be saved as an active draft.',
      );
    }
    const envelope = await this.readEnvelope();
    const current = this.restoreOptional(envelope.active);
    if (current !== null && current.sessionId !== restored.sessionId) {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'A different active session already exists.',
      );
    }
    await this.writeEnvelope({ ...envelope, active: restored }, restored.updatedAt);
  }

  public async loadActiveSession(): Promise<CastingSession | null> {
    return this.restoreOptional((await this.readEnvelope()).active);
  }

  public async completeSession(session: CastingSession): Promise<void> {
    const restored = restoreCastingSession(session);
    if (restored.status !== 'locked') {
      throw new CastingDomainError(
        'SESSION_NOT_COMPLETE',
        'The repository can complete only a locked six-line session.',
      );
    }
    const envelope = await this.readEnvelope();
    const active = this.restoreOptional(envelope.active);
    if (
      active === null ||
      active.sessionId !== restored.sessionId ||
      active.status !== 'complete' ||
      !sameImmutableFacts(active, restored)
    ) {
      throw new CastingDomainError(
        'INVALID_SESSION_STATE',
        'The locked session must match the active complete session.',
      );
    }
    await this.writeEnvelope(
      { ...envelope, active: null, pendingCompleted: restored },
      restored.updatedAt,
    );
  }

  public async deleteDraft(sessionId: string): Promise<void> {
    const envelope = await this.readEnvelope();
    const active = this.restoreOptional(envelope.active);
    if (active?.sessionId === sessionId) {
      await this.writeEnvelope({ ...envelope, active: null }, new Date().toISOString());
    }
  }

  public async loadPendingCompletedSession(sessionId?: string): Promise<CastingSession | null> {
    const completed = this.restoreOptional((await this.readEnvelope()).pendingCompleted);
    if (completed === null || (sessionId !== undefined && completed.sessionId !== sessionId)) {
      return null;
    }
    return completed;
  }

  public async acknowledgeCompletedSession(sessionId: string): Promise<void> {
    const envelope = await this.readEnvelope();
    const completed = this.restoreOptional(envelope.pendingCompleted);
    if (completed?.sessionId === sessionId) {
      await this.writeEnvelope({ ...envelope, pendingCompleted: null }, new Date().toISOString());
    }
  }

  public async clearCorruptedState(): Promise<void> {
    await this.writeEnvelope(emptyEnvelope(), new Date().toISOString());
  }

  private restoreOptional(value: unknown | null): CastingSession | null {
    if (value === null) return null;
    try {
      return restoreCastingSession(value);
    } catch {
      throw new CastingStorageError(
        'CORRUPTED_CASTING_STATE',
        '保存的起卦会话无法校验。原始记录可能不完整，请删除后重新起卦。',
      );
    }
  }

  private async readEnvelope(): Promise<StoredEnvelope> {
    const row = await this.database.getFirst<SettingRow>(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      [STORAGE_KEY],
    );
    if (row === null) return emptyEnvelope();
    try {
      const parsed = JSON.parse(row.setting_value) as Partial<StoredEnvelope>;
      if (
        parsed.schemaVersion !== 'active-casting-envelope-v1' ||
        !Object.prototype.hasOwnProperty.call(parsed, 'active') ||
        !Object.prototype.hasOwnProperty.call(parsed, 'pendingCompleted')
      ) {
        throw new Error('invalid envelope');
      }
      return {
        schemaVersion: 'active-casting-envelope-v1',
        active: parsed.active ?? null,
        pendingCompleted: parsed.pendingCompleted ?? null,
      };
    } catch {
      throw new CastingStorageError('CORRUPTED_CASTING_STATE', '保存的起卦会话格式已损坏。');
    }
  }

  private async writeEnvelope(envelope: StoredEnvelope, updatedAt: string): Promise<void> {
    await this.database.run(
      `INSERT INTO settings (setting_key, setting_value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET
         setting_value = excluded.setting_value,
         updated_at = excluded.updated_at`,
      [STORAGE_KEY, JSON.stringify(envelope), updatedAt],
    );
  }
}

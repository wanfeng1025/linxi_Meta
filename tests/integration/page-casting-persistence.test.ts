import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CastingService } from '../../src/application/casting';
import { CASTING_INPUT_SCHEMA_VERSION, CASTING_RULESET_VERSION } from '../../src/domain/casting';
import { migrations, runMigrations } from '../../src/infrastructure/database/migrations';
import {
  CastingStorageError,
  SQLiteCastingSessionRepository,
} from '../../src/infrastructure/repositories/SQLiteCastingSessionRepository';
import { SequenceRandomSource } from '../../src/infrastructure/random';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

describe('page casting persistence adapter', () => {
  let database: NodeSqliteDatabase;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await runMigrations(database, {
      appVersion: 'test-page-v1',
      appliedAt: '2026-07-20T00:00:00.000Z',
      hashProvider: new NodeSha256Provider(),
      migrations,
    });
  });

  afterEach(async () => database.close());

  it('restores saved lines after service recreation without consuming new randomness', async () => {
    const repository = new SQLiteCastingSessionRepository(database);
    const initialRandom = new SequenceRandomSource([2, 2, 2, 3, 3, 3]);
    const initial = new CastingService({
      repository,
      randomSource: initialRandom,
      inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
      rulesetVersion: CASTING_RULESET_VERSION,
    });
    await initial.startSession({
      sessionId: 'persisted',
      method: 'tap',
      createdAt: '2026-07-20T00:00:00.000Z',
    });
    await initial.castNext({
      sessionId: 'persisted',
      expectedLineCount: 0,
      updatedAt: '2026-07-20T00:00:01.000Z',
    });
    await initial.castNext({
      sessionId: 'persisted',
      expectedLineCount: 1,
      updatedAt: '2026-07-20T00:00:02.000Z',
    });

    const resumedRandom = new SequenceRandomSource([2, 3, 2]);
    const resumed = new CastingService({
      repository: new SQLiteCastingSessionRepository(database),
      randomSource: resumedRandom,
      inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
      rulesetVersion: CASTING_RULESET_VERSION,
    });
    expect((await resumed.restoreActiveSession())?.lines.map((line) => line.coins)).toEqual([
      [2, 2, 2],
      [3, 3, 3],
    ]);
    expect(resumedRandom.consumedCount).toBe(0);
  });

  it('reports corrupted state and supports explicit deletion instead of re-randomizing', async () => {
    await database.run(
      `INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)`,
      ['page.active-casting-envelope-v1', '{broken', '2026-07-20T00:00:00.000Z'],
    );
    const repository = new SQLiteCastingSessionRepository(database);
    await expect(repository.loadActiveSession()).rejects.toBeInstanceOf(CastingStorageError);
    await repository.clearCorruptedState();
    expect(await repository.loadActiveSession()).toBeNull();
  });
});

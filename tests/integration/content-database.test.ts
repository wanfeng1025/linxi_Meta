import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type {
  DivinationSessionRecordDto,
  StoredCastLineDto,
} from '../../src/application/repositories';
import { ContentImporter } from '../../src/infrastructure/database/content';
import {
  SQLiteContentRepository,
  SQLiteDivinationSessionRepository,
  SQLiteHexagramRepository,
  SQLiteRuleRepository,
  SQLiteSettingsRepository,
} from '../../src/infrastructure/database/repositories';
import { migrations, runMigrations } from '../../src/infrastructure/database/migrations';
import { createCompleteFixtureDataset } from '../fixtures/content-dataset.fixture';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

const hashProvider = new NodeSha256Provider();
const now = '2026-07-20T00:00:00.000Z';

async function migrate(database: NodeSqliteDatabase): Promise<void> {
  await runMigrations(database, {
    appVersion: 'test-app-v1',
    appliedAt: now,
    hashProvider,
    migrations,
  });
}

async function seed(database: NodeSqliteDatabase): Promise<void> {
  await new ContentImporter(database, hashProvider).import(createCompleteFixtureDataset(), {
    environment: 'fixture',
    importedAt: now,
    sourceFile: 'tests/fixtures/content-dataset.fixture.ts',
  });
}

function storedLine(position: 1 | 2 | 3 | 4 | 5 | 6, value: 6 | 7 | 8 | 9): StoredCastLineDto {
  switch (value) {
    case 6:
      return { position, coins: [2, 2, 2], value, primaryBit: 0, changedBit: 1, isMoving: true };
    case 7:
      return { position, coins: [3, 2, 2], value, primaryBit: 1, changedBit: 1, isMoving: false };
    case 8:
      return { position, coins: [3, 3, 2], value, primaryBit: 0, changedBit: 0, isMoving: false };
    case 9:
      return { position, coins: [3, 3, 3], value, primaryBit: 1, changedBit: 0, isMoving: true };
  }
}

function historyRecord(): DivinationSessionRecordDto {
  const dataset = createCompleteFixtureDataset();
  const lines = [
    storedLine(1, 6),
    storedLine(2, 7),
    storedLine(3, 8),
    storedLine(4, 9),
    storedLine(5, 7),
    storedLine(6, 8),
  ] as const;
  const primaryCode = lines.map((line) => line.primaryBit).join('');
  const changedCode = lines.map((line) => line.changedBit).join('');
  const primary = dataset.hexagrams.find((hexagram) => hexagram.code === primaryCode);
  const changed = dataset.hexagrams.find((hexagram) => hexagram.code === changedCode);
  if (primary === undefined || changed === undefined) {
    throw new Error('Fixture does not contain the required history hexagrams.');
  }
  return {
    sessionId: 'fixture-session-1',
    question: 'Synthetic local test question',
    categoryId: 'fixture-category-general',
    castAt: '2026-07-20T08:00:00+08:00',
    timezone: 'Asia/Shanghai',
    appVersion: 'test-app-v1',
    databaseSchemaVersion: 'sqlite-schema-v5',
    castAlgorithmVersion: 'fixture-cast-v1',
    calendarAlgorithmVersion: 'fixture-calendar-v1',
    templateVersion: 'fixture-template-v2',
    aiPromptVersion: null,
    calendarSnapshot: { timezone: 'Asia/Shanghai', fixture: true },
    inputSchemaVersion: 'divination-input-v1-draft',
    divinationRulesetVersion: 'divination-input-v1-draft',
    interpretationRulesetVersion: 'fixture-ruleset-v2',
    randomAlgorithmVersion: 'fixture-random-v1',
    contentVersion: 'fixture-complete-v2',
    primaryHexagramId: primary.id,
    changedHexagramId: changed.id,
    createdAt: now,
    lines,
    analysisSnapshots: [
      {
        snapshotId: 'fixture-snapshot-1',
        schemaVersion: 'analysis-schema-v1',
        rulesetVersion: 'fixture-ruleset-v2',
        contentVersion: 'fixture-complete-v2',
        templateVersion: 'fixture-template-v2',
        calendarAlgorithmVersion: 'fixture-calendar-v1',
        aiPromptVersion: null,
        reanalysisOfSnapshotId: null,
        payload: { facts: { movingPositions: [1, 4] }, conclusion: 'fixture-only' },
        createdAt: now,
      },
    ],
  };
}

describe('content database import and repositories', () => {
  let database: NodeSqliteDatabase;

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await migrate(database);
  });

  afterEach(async () => {
    await database.close();
  });

  it('imports a complete seed transactionally and is idempotent by version and hash', async () => {
    const importer = new ContentImporter(database, hashProvider);
    const first = await importer.import(createCompleteFixtureDataset(), {
      environment: 'fixture',
      importedAt: now,
      sourceFile: 'synthetic-fixture',
    });
    const second = await importer.import(createCompleteFixtureDataset(), {
      environment: 'fixture',
      importedAt: now,
      sourceFile: 'synthetic-fixture',
    });

    expect(first).toMatchObject({ status: 'imported', recordCount: 1077 });
    expect(second).toMatchObject({ status: 'already-imported', recordCount: 1077 });
    expect(first.payloadHash).toMatch(/^[a-f0-9]{64}$/);

    await database.run(
      `DELETE FROM hexagram_lines
       WHERE line_id = 'fixture-hexagram-01-line-1' AND content_version = 'fixture-complete-v2'`,
    );
    await expect(
      importer.import(createCompleteFixtureDataset(), {
        environment: 'fixture',
        importedAt: now,
        sourceFile: 'synthetic-fixture',
      }),
    ).rejects.toMatchObject({ code: 'CONTENT_DATABASE_MISMATCH' });
  });

  it('rejects same-version content changes and rolls back source conflicts', async () => {
    const importer = new ContentImporter(database, hashProvider);
    const dataset = createCompleteFixtureDataset();
    await importer.import(dataset, {
      environment: 'fixture',
      importedAt: now,
      sourceFile: 'synthetic-fixture',
    });
    await expect(
      importer.import(
        { ...dataset, version: { ...dataset.version, notes: 'Changed without version bump.' } },
        { environment: 'fixture', importedAt: now, sourceFile: 'synthetic-fixture' },
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_VERSION_HASH_MISMATCH' });

    const isolated = new NodeSqliteDatabase();
    try {
      await migrate(isolated);
      await isolated.run(
        `INSERT INTO data_sources
          (source_id, source_version, title, edition, locator, source_type, license_status,
           status, verified_by, verified_at, notes, metadata_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          'fixture-source',
          'fixture-source-v2',
          'Conflicting source',
          null,
          null,
          'authorized-dataset',
          'cleared',
          'verified',
          'test',
          now,
          'conflict',
          'different-hash',
        ],
      );
      await expect(
        new ContentImporter(isolated, hashProvider).import(dataset, {
          environment: 'fixture',
          importedAt: now,
          sourceFile: 'synthetic-fixture',
        }),
      ).rejects.toMatchObject({ code: 'SOURCE_VERSION_HASH_MISMATCH' });
      const version = await isolated.getFirst<{ count: number }>(
        `SELECT COUNT(*) AS count FROM content_versions
         WHERE content_version = 'fixture-complete-v2'`,
      );
      expect(version?.count).toBe(0);
    } finally {
      await isolated.close();
    }
  });

  it('returns DTOs without leaking SQLite row names', async () => {
    await seed(database);
    const contentRepository = new SQLiteContentRepository(database);
    const hexagramRepository = new SQLiteHexagramRepository(database);
    const ruleRepository = new SQLiteRuleRepository(database);
    const settingsRepository = new SQLiteSettingsRepository(database);
    const dataset = createCompleteFixtureDataset();
    const allYang = dataset.hexagrams.find((hexagram) => hexagram.code === '111111');
    if (allYang === undefined) throw new Error('Missing all-yang fixture.');

    const version = await contentRepository.getVersion('fixture-complete-v2');
    const hexagram = await hexagramRepository.getById(allYang.id, 'fixture-complete-v2');
    const rules = await ruleRepository.listDefinitions('fixture-ruleset', 'fixture-ruleset-v2');
    const palace = await ruleRepository.listPalaceHexagrams(
      'fixture-ruleset',
      'fixture-ruleset-v2',
    );
    const najia = await ruleRepository.listNajiaAssignments(
      'fixture-ruleset',
      'fixture-ruleset-v2',
    );
    const branchRelations = await ruleRepository.listBranchRelations(
      'fixture-ruleset',
      'fixture-ruleset-v2',
    );
    const importReport = await contentRepository.getImportReport('fixture-complete-v2');
    await settingsRepository.set('theme', 'dark', now);

    expect(version).toMatchObject({ contentVersion: 'fixture-complete-v2', recordCount: 1077 });
    expect(hexagram?.lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(hexagram?.specialLineTexts.map((line) => line.kind)).toEqual(['use-nine']);
    expect(hexagram?.texts.some((text) => text.textType === 'judgment')).toBe(true);
    expect(hexagram?.lines.every((line) => line.texts.length === 1)).toBe(true);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({ ruleKey: 'fixture-rule-key', inputFields: ['facts.input'] });
    expect(palace).toHaveLength(64);
    expect(najia).toHaveLength(48);
    expect(branchRelations[0]?.branchIds).toEqual(['fixture-branch-1', 'fixture-branch-2']);
    expect(importReport).toMatchObject({
      contentVersion: 'fixture-complete-v2',
      payloadHash: version?.payloadHash,
    });
    expect(await settingsRepository.get('theme')).toBe('dark');
    expect(Object.hasOwn(version ?? {}, 'content_version')).toBe(false);
    await expect(
      database.run(
        `INSERT INTO content_texts
          (text_id, content_version, owner_type, owner_id, text_type, text_class, locale,
           text_value)
         VALUES ('orphan-text', 'fixture-complete-v2', 'hexagram', 'missing-owner',
                 'judgment', 'canonical', 'zh-Hans', 'orphan')`,
      ),
    ).rejects.toThrow(/owner does not exist/);
  });

  it('preserves six raw coin groups, immutable facts, and append-only reanalysis', async () => {
    await seed(database);
    const repository = new SQLiteDivinationSessionRepository(database, hashProvider);
    const record = historyRecord();
    await repository.append(record);
    await repository.appendAnalysisSnapshot(record.sessionId, {
      snapshotId: 'fixture-snapshot-2',
      schemaVersion: 'analysis-schema-v2',
      rulesetVersion: 'fixture-ruleset-v2',
      contentVersion: 'fixture-complete-v2',
      templateVersion: 'fixture-template-v2',
      calendarAlgorithmVersion: 'fixture-calendar-v1',
      aiPromptVersion: null,
      reanalysisOfSnapshotId: 'fixture-snapshot-1',
      payload: { facts: { movingPositions: [1, 4] }, conclusion: 'reanalyzed-fixture' },
      createdAt: '2026-07-20T00:01:00.000Z',
    });

    const stored = await repository.getById(record.sessionId);
    expect(stored?.lines.map((line) => line.coins)).toEqual(record.lines.map((line) => line.coins));
    expect(stored?.lines.filter((line) => line.isMoving).map((line) => line.position)).toEqual([
      1, 4,
    ]);
    expect(stored?.analysisSnapshots).toHaveLength(2);
    await expect(
      database.run('UPDATE cast_lines SET coin_1 = 3 WHERE session_id = ? AND line_position = 1', [
        record.sessionId,
      ]),
    ).rejects.toThrow(/append-only/);
    await expect(
      repository.append({
        ...record,
        sessionId: 'invalid-session',
        lines: record.lines.slice(0, 5),
      }),
    ).rejects.toMatchObject({ code: 'INVALID_HISTORY_RECORD' });
  });

  it('lists and deletes complete history while cascading raw lines and snapshots', async () => {
    await seed(database);
    const repository = new SQLiteDivinationSessionRepository(database, hashProvider);
    const record = historyRecord();
    await repository.append(record);
    expect((await repository.list()).map((item) => item.sessionId)).toEqual([record.sessionId]);
    expect(await repository.delete(record.sessionId)).toBe(true);
    expect(await repository.getById(record.sessionId)).toBeNull();
    expect(
      await database.getFirst('SELECT session_id FROM cast_lines WHERE session_id = ?', [
        record.sessionId,
      ]),
    ).toBeNull();
    expect(
      await database.getFirst('SELECT session_id FROM analysis_snapshots WHERE session_id = ?', [
        record.sessionId,
      ]),
    ).toBeNull();
    expect(await repository.delete(record.sessionId)).toBe(false);
    expect(await repository.deleteAll()).toBe(0);
  });
});

describe('database reopen persistence', () => {
  it('persists content, settings, raw casts, and snapshots after reopening the file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'liuyao-content-db-'));
    const path = join(directory, 'content-test.sqlite');
    const first = new NodeSqliteDatabase(path);
    try {
      await migrate(first);
      await seed(first);
      await new SQLiteSettingsRepository(first).set('language', 'zh-Hans', now);
      await new SQLiteDivinationSessionRepository(first, hashProvider).append(historyRecord());
    } finally {
      await first.close();
    }

    const reopened = new NodeSqliteDatabase(path);
    try {
      await migrate(reopened);
      const version = await new SQLiteContentRepository(reopened).getVersion('fixture-complete-v2');
      const setting = await new SQLiteSettingsRepository(reopened).get('language');
      const history = await new SQLiteDivinationSessionRepository(reopened, hashProvider).getById(
        'fixture-session-1',
      );
      expect(version?.recordCount).toBe(1077);
      expect(setting).toBe('zh-Hans');
      expect(history?.lines).toHaveLength(6);
      expect(history?.analysisSnapshots).toHaveLength(1);
    } finally {
      await reopened.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

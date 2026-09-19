import productionDataset from '../../data/source/content-dataset.json';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CastingService } from '../../src/application/casting';
import { PageApplicationService, PageCapabilityError } from '../../src/application/page';
import { CASTING_INPUT_SCHEMA_VERSION, CASTING_RULESET_VERSION } from '../../src/domain/casting';
import { createProductionHexagramCatalog } from '../../src/infrastructure/content/productionHexagramCatalog';
import { ContentImporter } from '../../src/infrastructure/database/content';
import {
  SQLiteDivinationSessionRepository,
  SQLiteSettingsRepository,
} from '../../src/infrastructure/database/repositories';
import { migrations, runMigrations } from '../../src/infrastructure/database/migrations';
import { UnavailableProfessionalChartAdapter } from '../../src/infrastructure/professional/UnavailableProfessionalChartAdapter';
import { SequenceRandomSource } from '../../src/infrastructure/random';
import { SQLiteCastingSessionRepository } from '../../src/infrastructure/repositories/SQLiteCastingSessionRepository';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

describe('page application flow', () => {
  let database: NodeSqliteDatabase;
  const hashProvider = new NodeSha256Provider();

  beforeEach(async () => {
    database = new NodeSqliteDatabase();
    await runMigrations(database, {
      appVersion: 'page-test-v1',
      appliedAt: '2026-07-20T00:00:00.000Z',
      hashProvider,
      migrations,
    });
    await new ContentImporter(database, hashProvider).import(productionDataset, {
      environment: 'production',
      importedAt: '2026-07-20T00:00:00.000Z',
      sourceFile: 'data/source/content-dataset.json',
    });
  });

  afterEach(async () => database.close());

  it('runs six page actions, locks facts, and creates a structure-only history snapshot', async () => {
    const castingRepository = new SQLiteCastingSessionRepository(database);
    const timestamps = Array.from({ length: 10 }, (_, index) =>
      new Date(Date.UTC(2026, 6, 20, 0, 0, index)).toISOString(),
    );
    let timeIndex = 0;
    let idIndex = 0;
    const historyRepository = new SQLiteDivinationSessionRepository(database, hashProvider);
    const service = new PageApplicationService({
      castingService: new CastingService({
        repository: castingRepository,
        randomSource: new SequenceRandomSource([
          2, 2, 2, 3, 2, 2, 3, 3, 2, 3, 3, 3, 2, 3, 2, 2, 2, 3,
        ]),
        inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
        rulesetVersion: CASTING_RULESET_VERSION,
      }),
      castingRepository,
      historyRepository,
      settingsRepository: new SQLiteSettingsRepository(database),
      catalog: createProductionHexagramCatalog(),
      appVersion: 'page-test-v1',
      databaseSchemaVersion: 'sqlite-schema-v5',
      now: () => timestamps[timeIndex++] ?? timestamps.at(-1)!,
      createId: () => `page-id-${++idIndex}`,
      timezone: () => 'Asia/Shanghai',
      professionalChartPort: new UnavailableProfessionalChartAdapter(),
    });

    let session = await service.start({
      question: '未来一月如何调整项目节奏？',
      category: 'career',
      timeHorizon: 'within-month',
      askingFor: 'self',
      mode: 'simple',
      method: 'tap',
      notes: '仅用于自动化测试',
    });
    for (let index = 0; index < 6; index += 1) {
      session = await service.castNext(session.sessionId, index);
    }
    expect(session.status).toBe('complete');
    expect(session.lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6]);

    const result = await service.lockAndSave(session.sessionId, 6);
    expect(result.snapshot.capability).toBe('interpretation-rules-unavailable');
    expect(result.snapshot.lines.map((line) => line.coins)).toEqual(
      session.lines.map((line) => line.coins),
    );
    expect(result.snapshot.primaryHexagram.id).toMatch(/^hexagram-kw-/);
    expect(result.snapshotCount).toBe(1);
    expect(await castingRepository.loadActiveSession()).toBeNull();
    expect((await historyRepository.list()).map((record) => record.sessionId)).toEqual([
      session.sessionId,
    ]);
    expect(() => service.reanalyze()).toThrow(PageCapabilityError);
    expect(service.getProfessionalChartAvailability(session.sessionId)).toMatchObject({
      status: 'unavailable',
      confirmedFields: ['primaryHexagram', 'changedHexagram', 'movingLines'],
    });
  });

  it('persists a static cast without a changed hexagram', async () => {
    const castingRepository = new SQLiteCastingSessionRepository(database);
    const historyRepository = new SQLiteDivinationSessionRepository(database, hashProvider);
    const timestamps = Array.from({ length: 10 }, (_, index) =>
      new Date(Date.UTC(2026, 6, 20, 1, 0, index)).toISOString(),
    );
    let timeIndex = 0;
    let idIndex = 0;
    const service = new PageApplicationService({
      castingService: new CastingService({
        repository: castingRepository,
        randomSource: new SequenceRandomSource(
          Array.from({ length: 18 }, (_, index) => (index % 3 === 2 ? 3 : 2)),
        ),
        inputSchemaVersion: CASTING_INPUT_SCHEMA_VERSION,
        rulesetVersion: CASTING_RULESET_VERSION,
      }),
      castingRepository,
      historyRepository,
      settingsRepository: new SQLiteSettingsRepository(database),
      catalog: createProductionHexagramCatalog(),
      appVersion: 'page-test-v1',
      databaseSchemaVersion: 'sqlite-schema-v8',
      now: () => timestamps[timeIndex++] ?? timestamps.at(-1)!,
      createId: () => `static-page-id-${++idIndex}`,
      timezone: () => 'Asia/Shanghai',
      professionalChartPort: new UnavailableProfessionalChartAdapter(),
    });

    let session = await service.start({
      question: '静卦兼容性测试',
      category: 'general-decision',
      timeHorizon: 'within-week',
      askingFor: 'self',
      mode: 'simple',
      method: 'tap',
      notes: '',
    });
    for (let index = 0; index < 6; index += 1) {
      session = await service.castNext(session.sessionId, index);
    }

    const result = await service.lockAndSave(session.sessionId, 6);
    expect(result.snapshot.changeStatus).toBe('STATIC');
    expect(result.snapshot.changedHexagram).toBeNull();
    expect((await historyRepository.getById(session.sessionId))?.changedHexagramId).toBeNull();
  });
});

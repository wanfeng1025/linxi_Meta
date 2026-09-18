import { describe, expect, it } from 'vitest';

import productionDataset from '../../data/source/content-dataset.json';
import { ContentImporter } from '../../src/infrastructure/database/content';
import { migrations, runMigrations } from '../../src/infrastructure/database/migrations';
import {
  SQLiteContentRepository,
  SQLiteHexagramRepository,
} from '../../src/infrastructure/database/repositories';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

describe('production content source import', () => {
  it('imports the 8 verified trigrams and 64 verified structural hexagrams', async () => {
    const database = new NodeSqliteDatabase();
    const hashProvider = new NodeSha256Provider();
    try {
      await runMigrations(database, {
        appVersion: 'test-app-v1',
        appliedAt: '2026-07-20T00:00:00.000Z',
        hashProvider,
        migrations,
      });
      const report = await new ContentImporter(database, hashProvider).import(productionDataset, {
        environment: 'production',
        importedAt: '2026-07-20T00:00:00.000Z',
        sourceFile: 'data/source/content-dataset.json',
      });
      const contentRepository = new SQLiteContentRepository(database);
      const hexagramRepository = new SQLiteHexagramRepository(database);
      const qian = await hexagramRepository.getById(
        'hexagram-kw-01',
        'hexagram-mapping-2026-07-20-v1',
      );

      expect(report).toMatchObject({
        status: 'imported',
        contentVersion: 'hexagram-mapping-2026-07-20-v1',
        recordCount: 72,
      });
      expect(report.validation.counts).toMatchObject({ trigrams: 8, hexagrams: 64 });
      expect(qian).toMatchObject({
        name: '乾',
        code: '111111',
        upperTrigramId: 'trigram-qian',
        lowerTrigramId: 'trigram-qian',
      });
      expect(qian?.lines).toEqual([]);
      expect(await contentRepository.listSources()).toHaveLength(1);
    } finally {
      await database.close();
    }
  });
});

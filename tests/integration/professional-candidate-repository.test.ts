import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { SQLiteProfessionalRulesetRepository } from '../../src/infrastructure/database/repositories';
import { canonicalJson } from '../../src/shared/data/canonical-json';
import { buildProfessionalCandidateRuleset } from '../../scripts/build-professional-candidate';
import { migrations, runMigrations } from '../../src/infrastructure/database/migrations';
import { NodeSha256Provider, NodeSqliteDatabase } from '../helpers/NodeSqliteDatabase';

describe('professional candidate repository', () => {
  it('stages a complete candidate package without exposing it through verified lookup', async () => {
    const database = new NodeSqliteDatabase();
    try {
      await runMigrations(database, {
        appVersion: 'test',
        appliedAt: '2026-07-25T00:00:00Z',
        hashProvider: new NodeSha256Provider(),
        migrations,
      });
      const ruleset = buildProfessionalCandidateRuleset();
      const repository = new SQLiteProfessionalRulesetRepository(database);
      await repository.importCandidatePackage({
        ruleset,
        payloadHash: createHash('sha256').update(canonicalJson(ruleset)).digest('hex'),
        sourceManifestHash: ruleset.metadata.sourceManifestHash ?? 'missing',
        importedAt: '2026-07-25T00:00:00Z',
      });

      await expect(
        repository.getRuleset(
          ruleset.metadata.rulesetId,
          ruleset.metadata.rulesetVersion,
          ruleset.metadata.contentVersion,
        ),
      ).resolves.toBeNull();
      await expect(
        repository.getCandidatePackage(
          ruleset.metadata.rulesetId,
          ruleset.metadata.rulesetVersion,
          ruleset.metadata.contentVersion,
        ),
      ).resolves.toMatchObject({
        payloadHash: expect.any(String),
        ruleset: { metadata: { verificationStatus: 'production_candidate' } },
      });

      await repository.recordCandidateReviewSignoff(
        ruleset.metadata.rulesetId,
        ruleset.metadata.rulesetVersion,
        ruleset.metadata.contentVersion,
        {
          signoffId: 'human-reviewer-a-ruleset',
          reviewerId: 'human-reviewer-a',
          reviewScope: 'palace-and-najia',
          reviewResult: 'needs_changes',
          evidenceLocator: 'manual-review://pending',
          signedAt: '2026-07-25T00:00:00Z',
        },
      );
      await expect(
        repository.listCandidateReviewSignoffs(
          ruleset.metadata.rulesetId,
          ruleset.metadata.rulesetVersion,
          ruleset.metadata.contentVersion,
        ),
      ).resolves.toEqual([
        expect.objectContaining({ reviewerId: 'human-reviewer-a', reviewResult: 'needs_changes' }),
      ]);

      await repository.appendChartSnapshot({
        snapshotId: 'candidate-snapshot-1',
        sessionId: 'session-1',
        rulesetId: ruleset.metadata.rulesetId,
        rulesetVersion: ruleset.metadata.rulesetVersion,
        contentVersion: ruleset.metadata.contentVersion,
        calendarPolicyId: 'civil_midnight_solar_terms_tzdb2026c',
        calendarAlgorithmVersion: ruleset.metadata.calendarAlgorithmVersion,
        timezone: 'Asia/Hong_Kong',
        calculatedAt: '2026-02-03T20:02:00Z',
        chart: { status: 'candidate-only' },
        chartHash: 'candidate-chart-hash',
        status: 'candidate',
        createdAt: '2026-07-25T00:00:00Z',
      });
      await expect(repository.listChartSnapshots('session-1')).resolves.toEqual([
        expect.objectContaining({
          snapshotId: 'candidate-snapshot-1',
          chart: { status: 'candidate-only' },
        }),
      ]);
    } finally {
      await database.close();
    }
  });
});

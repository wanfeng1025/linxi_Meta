import type {
  CandidateReviewSignoff,
  CandidateRulesetPackage,
  ProfessionalChartSnapshotRecord,
  ProfessionalRulesetRepository,
} from '@/application/professional';
import {
  createCandidateProfessionalRuleset,
  type ProfessionalRulesetInput,
} from '@/domain/professional';
import { canonicalJson } from '@/shared/data/canonical-json';

import type { SqlDatabase } from '../types';

interface CandidatePackageRow {
  readonly package_json: string;
  readonly payload_hash: string;
  readonly source_manifest_hash: string;
  readonly imported_at: string;
}

interface SignoffRow {
  readonly signoff_id: string;
  readonly reviewer_id: string;
  readonly review_scope: string;
  readonly review_result: CandidateReviewSignoff['reviewResult'];
  readonly evidence_locator: string;
  readonly signed_at: string;
}

interface SnapshotRow {
  readonly snapshot_id: string;
  readonly session_id: string;
  readonly ruleset_id: string;
  readonly ruleset_version: string;
  readonly content_version: string;
  readonly calendar_policy_id: string;
  readonly calendar_algorithm_version: string;
  readonly timezone: string;
  readonly calculated_at: string;
  readonly chart_json: string;
  readonly chart_hash: string;
  readonly status: ProfessionalChartSnapshotRecord['status'];
  readonly created_at: string;
}

function assertCandidate(candidate: CandidateRulesetPackage): void {
  if (candidate.ruleset.metadata.verificationStatus !== 'production_candidate') {
    throw new Error('Only production_candidate rule packages may enter candidate staging.');
  }
  if (!candidate.payloadHash || !candidate.sourceManifestHash || !candidate.importedAt) {
    throw new Error('Candidate package requires immutable hashes and an import timestamp.');
  }
  createCandidateProfessionalRuleset(candidate.ruleset);
}

/** Candidate staging implementation. getRuleset intentionally never reads this staging area. */
export class SQLiteProfessionalRulesetRepository implements ProfessionalRulesetRepository {
  public constructor(private readonly database: SqlDatabase) {}

  public async getRuleset(
    _rulesetId: string,
    _rulesetVersion: string,
    _contentVersion: string,
  ): Promise<ProfessionalRulesetInput | null> {
    return null;
  }

  public async getCandidatePackage(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
  ): Promise<CandidateRulesetPackage | null> {
    const row = await this.database.getFirst<CandidatePackageRow>(
      `SELECT package_json, payload_hash, source_manifest_hash, imported_at
       FROM professional_candidate_packages
       WHERE ruleset_id = ? AND ruleset_version = ? AND content_version = ?`,
      [rulesetId, rulesetVersion, contentVersion],
    );
    if (!row) return null;
    const ruleset = JSON.parse(row.package_json) as ProfessionalRulesetInput;
    if (ruleset.metadata.verificationStatus !== 'production_candidate') {
      throw new Error('Candidate staging contains a non-candidate package.');
    }
    return {
      ruleset,
      payloadHash: row.payload_hash,
      sourceManifestHash: row.source_manifest_hash,
      importedAt: row.imported_at,
    };
  }

  public async importCandidatePackage(candidate: CandidateRulesetPackage): Promise<void> {
    assertCandidate(candidate);
    const metadata = candidate.ruleset.metadata;
    await this.database.transaction(async (transaction) => {
      const existing = await transaction.getFirst<Pick<CandidatePackageRow, 'payload_hash'>>(
        `SELECT payload_hash FROM professional_candidate_packages
         WHERE ruleset_id = ? AND ruleset_version = ? AND content_version = ?`,
        [metadata.rulesetId, metadata.rulesetVersion, metadata.contentVersion],
      );
      if (existing && existing.payload_hash !== candidate.payloadHash) {
        throw new Error(
          'Immutable candidate package identity already exists with a different hash.',
        );
      }
      if (!existing) {
        await transaction.run(
          `INSERT INTO professional_candidate_packages
             (ruleset_id, ruleset_version, content_version, status, source_manifest_hash,
              payload_hash, package_json, imported_at)
           VALUES (?, ?, ?, 'production_candidate', ?, ?, ?, ?)`,
          [
            metadata.rulesetId,
            metadata.rulesetVersion,
            metadata.contentVersion,
            candidate.sourceManifestHash,
            candidate.payloadHash,
            canonicalJson(candidate.ruleset),
            candidate.importedAt,
          ],
        );
        for (const source of metadata.sources) {
          await transaction.run(
            `INSERT INTO professional_candidate_sources
               (ruleset_id, ruleset_version, content_version, source_id, source_version,
                source_locator, verification_status)
             VALUES (?, ?, ?, ?, ?, ?, 'production_candidate')`,
            [
              metadata.rulesetId,
              metadata.rulesetVersion,
              metadata.contentVersion,
              source.sourceId,
              source.sourceVersion,
              source.sourceLocator,
            ],
          );
        }
      }
    });
  }

  public async recordCandidateReviewSignoff(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
    signoff: CandidateReviewSignoff,
  ): Promise<void> {
    await this.database.run(
      `INSERT INTO professional_candidate_review_signoffs
         (signoff_id, ruleset_id, ruleset_version, content_version, reviewer_id, review_scope,
          review_result, evidence_locator, signed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        signoff.signoffId,
        rulesetId,
        rulesetVersion,
        contentVersion,
        signoff.reviewerId,
        signoff.reviewScope,
        signoff.reviewResult,
        signoff.evidenceLocator,
        signoff.signedAt,
      ],
    );
  }

  public async listCandidateReviewSignoffs(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
  ): Promise<readonly CandidateReviewSignoff[]> {
    const rows = await this.database.getAll<SignoffRow>(
      `SELECT signoff_id, reviewer_id, review_scope, review_result, evidence_locator, signed_at
       FROM professional_candidate_review_signoffs
       WHERE ruleset_id = ? AND ruleset_version = ? AND content_version = ?
       ORDER BY signed_at, signoff_id`,
      [rulesetId, rulesetVersion, contentVersion],
    );
    return rows.map((row) => ({
      signoffId: row.signoff_id,
      reviewerId: row.reviewer_id,
      reviewScope: row.review_scope,
      reviewResult: row.review_result,
      evidenceLocator: row.evidence_locator,
      signedAt: row.signed_at,
    }));
  }

  public async appendChartSnapshot(snapshot: ProfessionalChartSnapshotRecord): Promise<void> {
    await this.database.run(
      `INSERT INTO professional_chart_snapshots
         (snapshot_id, session_id, ruleset_id, ruleset_version, content_version,
          calendar_policy_id, calendar_algorithm_version, timezone, calculated_at,
          chart_json, chart_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        snapshot.snapshotId,
        snapshot.sessionId,
        snapshot.rulesetId,
        snapshot.rulesetVersion,
        snapshot.contentVersion,
        snapshot.calendarPolicyId,
        snapshot.calendarAlgorithmVersion,
        snapshot.timezone,
        snapshot.calculatedAt,
        canonicalJson(snapshot.chart),
        snapshot.chartHash,
        snapshot.status,
        snapshot.createdAt,
      ],
    );
  }

  public async listChartSnapshots(
    sessionId: string,
  ): Promise<readonly ProfessionalChartSnapshotRecord[]> {
    const rows = await this.database.getAll<SnapshotRow>(
      `SELECT snapshot_id, session_id, ruleset_id, ruleset_version, content_version,
              calendar_policy_id, calendar_algorithm_version, timezone, calculated_at,
              chart_json, chart_hash, status, created_at
       FROM professional_chart_snapshots WHERE session_id = ?
       ORDER BY calculated_at, snapshot_id`,
      [sessionId],
    );
    return rows.map((row) => ({
      snapshotId: row.snapshot_id,
      sessionId: row.session_id,
      rulesetId: row.ruleset_id,
      rulesetVersion: row.ruleset_version,
      contentVersion: row.content_version,
      calendarPolicyId: row.calendar_policy_id,
      calendarAlgorithmVersion: row.calendar_algorithm_version,
      timezone: row.timezone,
      calculatedAt: row.calculated_at,
      chart: JSON.parse(row.chart_json) as unknown,
      chartHash: row.chart_hash,
      status: row.status,
      createdAt: row.created_at,
    }));
  }
}

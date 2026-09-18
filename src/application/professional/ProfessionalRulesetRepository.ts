import type { ProfessionalRulesetInput } from '@/domain/professional';

export interface CandidateRulesetPackage {
  readonly ruleset: ProfessionalRulesetInput;
  readonly payloadHash: string;
  readonly sourceManifestHash: string;
  readonly importedAt: string;
}

export interface CandidateReviewSignoff {
  readonly signoffId: string;
  readonly reviewerId: string;
  readonly reviewScope: string;
  readonly reviewResult: 'accepted' | 'rejected' | 'needs_changes';
  readonly evidenceLocator: string;
  readonly signedAt: string;
}

export interface ProfessionalChartSnapshotRecord {
  readonly snapshotId: string;
  readonly sessionId: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly calendarPolicyId: string;
  readonly calendarAlgorithmVersion: string;
  readonly timezone: string;
  readonly calculatedAt: string;
  readonly chart: unknown;
  readonly chartHash: string;
  readonly status: 'candidate' | 'verified';
  readonly createdAt: string;
}

/**
 * Loads one immutable ruleset bundle. Implementations must not merge records from fallback versions.
 * The application validates the returned value with the boundary Schema and production domain gate.
 */
export interface ProfessionalRulesetRepository {
  /** Loads only a production-verified package; candidate packages must never be returned here. */
  getRuleset(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
  ): Promise<ProfessionalRulesetInput | null>;

  getCandidatePackage(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
  ): Promise<CandidateRulesetPackage | null>;
  importCandidatePackage(candidate: CandidateRulesetPackage): Promise<void>;
  recordCandidateReviewSignoff(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
    signoff: CandidateReviewSignoff,
  ): Promise<void>;
  listCandidateReviewSignoffs(
    rulesetId: string,
    rulesetVersion: string,
    contentVersion: string,
  ): Promise<readonly CandidateReviewSignoff[]>;
  appendChartSnapshot(snapshot: ProfessionalChartSnapshotRecord): Promise<void>;
  listChartSnapshots(sessionId: string): Promise<readonly ProfessionalChartSnapshotRecord[]>;
}

import type { CoinTuple, LinePosition, LineValue } from '@/domain/casting';

export interface ContentVersionDto {
  readonly contentVersion: string;
  readonly schemaVersion: string;
  readonly status: 'draft' | 'verified';
  readonly completenessMode: 'partial' | 'complete';
  readonly payloadHash: string;
  readonly recordCount: number;
  readonly importedAt: string;
}

export interface DataSourceDto {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly title: string;
  readonly edition: string | null;
  readonly authorOrEditor: string | null;
  readonly dynastyOrYear: string | null;
  readonly publisherOrPlatform: string | null;
  readonly url: string | null;
  readonly sourceType: string;
  readonly licenseStatus: string;
  readonly publicDomainStatus: string | null;
  readonly proofreadingStatus: string | null;
  readonly reliabilityGrade: string | null;
  readonly status: 'draft' | 'verified';
}

export interface ContentImportReportDto {
  readonly contentVersion: string;
  readonly sourceFile: string;
  readonly payloadHash: string;
  readonly validationReport: unknown;
  readonly importedAt: string;
}

export interface ContentTextDto {
  readonly id: string;
  readonly textType: string;
  readonly textClass: string;
  readonly locale: string;
  readonly text: string;
}

export interface HexagramLineDto {
  readonly id: string;
  readonly position: LinePosition;
  readonly classicalText: string | null;
  readonly modernText: string | null;
  readonly texts: readonly ContentTextDto[];
}

export interface SpecialLineTextDto {
  readonly id: string;
  readonly kind: 'use-nine' | 'use-six';
  readonly classicalText: string | null;
  readonly modernText: string | null;
  readonly texts: readonly ContentTextDto[];
}

export interface HexagramDto {
  readonly id: string;
  readonly contentVersion: string;
  readonly kingWenSequence: number;
  readonly name: string;
  readonly upperTrigramId: string;
  readonly lowerTrigramId: string;
  readonly code: string;
  readonly classicalText: string | null;
  readonly modernText: string | null;
  readonly texts: readonly ContentTextDto[];
  readonly lines: readonly HexagramLineDto[];
  readonly specialLineTexts: readonly SpecialLineTextDto[];
}

export interface RuleDefinitionDto {
  readonly id: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly ruleType: string;
  readonly ruleKey: string;
  readonly priority: number;
  readonly inputFields: readonly string[];
  readonly outputFields: readonly string[];
  readonly conflictStrategy: string;
  readonly description: string;
  readonly sourceLocator: string;
}

export interface PalaceHexagramDto {
  readonly id: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly palaceTrigramId: string;
  readonly palaceElementId: string;
  readonly hexagramId: string;
  readonly palaceSequence: number;
  readonly stage: string;
  readonly transformationMask: string;
  readonly shiPosition: LinePosition;
  readonly yingPosition: LinePosition;
}

export interface NajiaAssignmentDto {
  readonly id: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly trigramId: string;
  readonly scope: 'inner' | 'outer';
  readonly localLine: 1 | 2 | 3;
  readonly absoluteLineHint: LinePosition;
  readonly heavenlyStemId: string;
  readonly earthlyBranchId: string;
  readonly branchElementId: string;
}

export interface BranchRelationDto {
  readonly id: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly relationType: string;
  readonly branchIds: readonly string[];
  readonly resultElementId: string | null;
  readonly directional: boolean;
  readonly priority: number;
  readonly enabledByDefault: boolean;
  readonly evidenceRequirement: string;
  readonly notes: string;
}

export interface StoredCastLineDto {
  readonly position: LinePosition;
  readonly coins: CoinTuple;
  readonly value: LineValue;
  readonly primaryBit: 0 | 1;
  readonly changedBit: 0 | 1;
  readonly isMoving: boolean;
}

export interface AnalysisSnapshotDto {
  readonly snapshotId: string;
  readonly schemaVersion: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly templateVersion: string | null;
  readonly calendarAlgorithmVersion: string | null;
  readonly aiPromptVersion: string | null;
  readonly reanalysisOfSnapshotId: string | null;
  readonly payload: unknown;
  readonly createdAt: string;
}

export interface DivinationSessionRecordDto {
  readonly sessionId: string;
  readonly question: string | null;
  readonly categoryId: string | null;
  readonly castAt: string;
  readonly timezone: string;
  readonly appVersion: string;
  readonly databaseSchemaVersion: string;
  readonly castAlgorithmVersion: string;
  readonly calendarAlgorithmVersion: string | null;
  readonly templateVersion: string | null;
  readonly aiPromptVersion: string | null;
  readonly calendarSnapshot: unknown | null;
  readonly inputSchemaVersion: string;
  readonly divinationRulesetVersion: string;
  readonly interpretationRulesetVersion: string;
  readonly randomAlgorithmVersion: string;
  readonly contentVersion: string;
  readonly primaryHexagramId: string;
  readonly changedHexagramId: string;
  readonly createdAt: string;
  readonly lines: readonly StoredCastLineDto[];
  readonly analysisSnapshots: readonly AnalysisSnapshotDto[];
}

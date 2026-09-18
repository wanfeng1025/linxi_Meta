import type { LinePosition, LineValue } from '../casting';

declare const professionalRulesetBrand: unique symbol;

export type ElementId = string;
export type EarthlyBranchId = string;
export type HeavenlyStemId = string;
export type SixRelative = 'parent' | 'sibling' | 'offspring' | 'wealth' | 'official';
export type CandidateRole = 'primary' | 'secondary' | 'contextual';
export type Confidence = 'resolved' | 'ambiguous' | 'insufficient-context';
export type FactPolarity = 'positive' | 'negative' | 'neutral' | 'context-dependent';
/**
 * Candidate records are deliberately runnable in staging only.  They cannot be
 * promoted by application code; promotion requires independent human signoff.
 */
export type VerificationStatus = 'production_candidate' | 'production_verified' | 'test-only';

export interface RuleSourceRef {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly sourceLocator: string;
  readonly verificationStatus: 'production_candidate' | 'production_verified' | 'pending';
}

export interface ProfessionalRulesetMetadata {
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly calendarAlgorithmVersion: string;
  readonly timezoneDataVersion: string;
  readonly compatibilityGroup: string;
  readonly verificationStatus: VerificationStatus;
  readonly sourceManifestHash: string | null;
  readonly rulesHash: string | null;
  readonly verifiedBy: readonly string[];
  readonly verifiedAt: string | null;
  readonly sources: readonly RuleSourceRef[];
  readonly dayBoundaryPolicy: 'civil-midnight' | 'zi-hour' | 'true-solar-zi-hour';
  readonly trueSolarTimeEnabled: boolean;
}

export interface VersionedRule {
  readonly ruleId: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly sourceLocator: string;
}

export interface PalaceRule extends VersionedRule {
  readonly hexagramId: string;
  readonly palaceTrigramId: string;
  readonly palaceElementId: ElementId;
  readonly palaceSequence: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly stage:
    | 'base'
    | 'first-change'
    | 'second-change'
    | 'third-change'
    | 'fourth-change'
    | 'fifth-change'
    | 'wandering-soul'
    | 'returning-soul';
  readonly worldPosition: LinePosition;
  readonly responsePosition: LinePosition;
}

export interface NajiaRule extends VersionedRule {
  readonly trigramId: string;
  readonly scope: 'inner' | 'outer';
  readonly localLine: 1 | 2 | 3;
  readonly heavenlyStemId: HeavenlyStemId;
  readonly earthlyBranchId: EarthlyBranchId;
}

export interface EarthlyBranchRule extends VersionedRule {
  readonly branchId: EarthlyBranchId;
  readonly order: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  readonly elementId: ElementId;
}

export interface SixRelativeRule extends VersionedRule {
  readonly palaceElementId: ElementId;
  readonly lineElementId: ElementId;
  readonly relative: SixRelative;
  readonly formulaCode: string;
}

export interface SixSpiritDefinition extends VersionedRule {
  readonly spiritId: string;
  readonly order: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface SixSpiritStartRule extends VersionedRule {
  readonly dayStemId: HeavenlyStemId;
  readonly startSpiritId: string;
}

export interface VoidRule extends VersionedRule {
  readonly cycleStartIndex: 0 | 10 | 20 | 30 | 40 | 50;
  readonly voidBranches: readonly [EarthlyBranchId, EarthlyBranchId];
}

export type BranchRelationType =
  | 'six-harmony'
  | 'six-clash'
  | 'three-harmony'
  | 'half-harmony'
  | 'directional-harmony'
  | 'punishment'
  | 'harm'
  | 'break'
  | 'generate'
  | 'control';

export interface BranchRelationRule extends VersionedRule {
  readonly relationType: BranchRelationType;
  readonly branchIds: readonly EarthlyBranchId[];
  readonly directional: boolean;
  readonly resultElementId: ElementId | null;
  readonly priority: number;
  readonly enabled: boolean;
  readonly interpretationMode: 'active' | 'fact-only' | 'disabled';
}

export interface UsefulGodMatch {
  readonly questionCategories: readonly string[];
  readonly questionSubcategories: readonly string[];
  readonly selfOrProxy: readonly ('self' | 'proxy')[];
  readonly subjectRoles: readonly string[];
  readonly targetRoles: readonly string[];
  readonly targetRelationships: readonly string[];
  readonly desiredOutcomes: readonly string[];
  readonly requiredContextTags: readonly string[];
  readonly traditionalGenderRule: 'required' | 'forbidden' | 'irrelevant';
}

export interface UsefulGodRule extends VersionedRule {
  readonly match: UsefulGodMatch;
  readonly relative: SixRelative;
  readonly candidateRole: CandidateRole;
  readonly priority: number;
  readonly evidenceTemplate: string;
}

export interface SupportingRoleRule extends VersionedRule {
  readonly usefulGodRelative: SixRelative;
  readonly supportingRelative: SixRelative;
  readonly avoidingRelative: SixRelative;
  readonly enemyRelative: SixRelative;
}

export interface HiddenSpiritRule extends VersionedRule {
  readonly hexagramId: string;
  readonly linePosition: LinePosition;
  readonly hiddenRelative: SixRelative;
  readonly hiddenStemId: HeavenlyStemId;
  readonly hiddenBranchId: EarthlyBranchId;
  readonly flyingLinePosition: LinePosition;
}

export interface ProfessionalRulesetInput {
  readonly metadata: ProfessionalRulesetMetadata;
  readonly palaceRules: readonly PalaceRule[];
  readonly najiaRules: readonly NajiaRule[];
  readonly earthlyBranches: readonly EarthlyBranchRule[];
  readonly sixRelativeRules: readonly SixRelativeRule[];
  readonly sixSpirits: readonly SixSpiritDefinition[];
  readonly sixSpiritStartRules: readonly SixSpiritStartRule[];
  readonly voidRules: readonly VoidRule[];
  readonly branchRelationRules: readonly BranchRelationRule[];
  readonly usefulGodRules: readonly UsefulGodRule[];
  readonly supportingRoleRules: readonly SupportingRoleRule[];
  readonly hiddenSpiritRules: readonly HiddenSpiritRule[];
}

export interface ProfessionalRuleset extends ProfessionalRulesetInput {
  readonly [professionalRulesetBrand]: true;
}

export interface ResolvedPalace {
  readonly hexagramId: string;
  readonly palaceTrigramId: string;
  readonly palaceElementId: ElementId;
  readonly palaceSequence: number;
  readonly stage: PalaceRule['stage'];
  readonly ruleId: string;
}

export interface WorldAndResponse {
  readonly worldPosition: LinePosition;
  readonly responsePosition: LinePosition;
  readonly ruleId: string;
}

export interface NajiaLine {
  readonly position: LinePosition;
  readonly heavenlyStemId: HeavenlyStemId;
  readonly earthlyBranchId: EarthlyBranchId;
  readonly ruleId: string;
}

export interface ElementLine extends NajiaLine {
  readonly elementId: ElementId;
  readonly elementRuleId: string;
}

export interface RelativeLine extends ElementLine {
  readonly relative: SixRelative;
  readonly relativeRuleId: string;
  readonly relativeFormulaCode: string;
}

export interface SpiritLine {
  readonly position: LinePosition;
  readonly spiritId: string;
  readonly ruleId: string;
}

export interface CalendarInput {
  readonly isoInstant: string;
  readonly timezone: string;
  readonly calendarPolicyId: string;
  readonly calendarAlgorithmVersion: string;
  readonly timezoneDataVersion: string;
  readonly dayBoundaryPolicy: ProfessionalRulesetMetadata['dayBoundaryPolicy'];
  readonly trueSolarTime: Readonly<
    | { readonly enabled: false }
    | {
        readonly enabled: true;
        readonly longitude: number;
        readonly algorithmVersion: string;
      }
  >;
}

export interface CalendarContext {
  readonly isoInstant: string;
  readonly timezone: string;
  readonly localDateTime: string;
  readonly localDate: string;
  readonly utcOffsetSeconds: number;
  readonly isDst: boolean;
  readonly fold: 0 | 1 | null;
  readonly localTimeResolution: 'UNIQUE' | 'AMBIGUOUS' | 'NONEXISTENT';
  readonly monthBranchId: EarthlyBranchId;
  readonly dayStemId: HeavenlyStemId;
  readonly dayBranchId: EarthlyBranchId;
  readonly dayCycleIndex: number;
  /** Null means the candidate provider has no confirmed term record for this instant. */
  readonly solarTermId: string | null;
  readonly solarTermBoundaryInstant: string | null;
  /** Explicitly null rather than inferred when the source package does not contain the boundary. */
  readonly previousMonthBoundaryInstant: string | null;
  /** Explicitly null rather than inferred when the source package does not contain the boundary. */
  readonly nextMonthBoundaryInstant: string | null;
  readonly xunId: string;
  readonly voidBranches: readonly [EarthlyBranchId, EarthlyBranchId];
  readonly calendarPolicyId: string;
  readonly calendarAlgorithmVersion: string;
  readonly solarTermDataVersion: string;
  readonly timezoneDataVersion: string;
  readonly dayBoundaryPolicy: ProfessionalRulesetMetadata['dayBoundaryPolicy'];
  readonly trueSolarTimeEnabled: boolean;
  readonly sourceIds: readonly string[];
  readonly verificationStatus: VerificationStatus;
}

export interface CalendarProvider {
  resolve(input: CalendarInput): Promise<CalendarContext>;
}

export interface EvidenceFact {
  readonly factId: string;
  readonly ruleId: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly sourceLocator: string;
  readonly subjectLinePosition: LinePosition | null;
  readonly objectType: string;
  readonly objectValue: string;
  readonly factType: string;
  readonly polarity: FactPolarity;
  readonly priority: number;
  readonly evidenceData: Readonly<Record<string, string | number | boolean | readonly string[]>>;
  readonly shortExplanation: string;
  readonly verificationStatus: VerificationStatus;
}

export interface BranchRelationFact {
  readonly rule: BranchRelationRule;
  readonly matchedBranches: readonly EarthlyBranchId[];
}

export interface QuestionContext {
  readonly questionCategory: string;
  readonly questionSubcategory: string | null;
  readonly selfOrProxy: 'self' | 'proxy';
  readonly subjectRole: string;
  readonly targetRole: string | null;
  readonly targetRelationship: string | null;
  readonly desiredOutcome: string | null;
  readonly contextTags: readonly string[];
  readonly traditionalGenderRuleEnabled: boolean;
}

export interface UsefulGodCandidate {
  readonly relative: SixRelative;
  readonly role: CandidateRole;
  readonly priority: number;
  readonly reasonRuleId: string;
  readonly evidence: string;
  readonly sourceId: string;
  readonly sourceVersion: string;
}

export interface UsefulGodSelection {
  readonly candidates: readonly UsefulGodCandidate[];
  readonly selected: UsefulGodCandidate | null;
  readonly confidence: Confidence;
  readonly ambiguityReasons: readonly string[];
}

export interface RelatedGodRoles {
  readonly usefulGod: SixRelative;
  readonly supportingGod: SixRelative;
  readonly avoidingGod: SixRelative;
  readonly enemyGod: SixRelative;
  readonly ruleId: string;
}

export interface MovingTransformation {
  readonly position: LinePosition;
  readonly originalValue: LineValue;
  readonly changedBranchId: EarthlyBranchId;
  readonly changedElementId: ElementId;
  readonly relationFacts: readonly BranchRelationFact[];
}

export interface HiddenAndFlyingSpirit {
  readonly linePosition: LinePosition;
  readonly hiddenRelative: SixRelative;
  readonly hiddenStemId: HeavenlyStemId;
  readonly hiddenBranchId: EarthlyBranchId;
  readonly flyingLinePosition: LinePosition;
  readonly ruleId: string;
}

export interface ChartLine extends RelativeLine {
  readonly lineValue: LineValue;
  readonly isMoving: boolean;
  readonly isWorld: boolean;
  readonly isResponse: boolean;
  readonly sixSpiritId: string;
  readonly facts: readonly EvidenceFact[];
  readonly transformation: MovingTransformation | null;
  readonly hiddenSpirits: readonly HiddenAndFlyingSpirit[];
}

export interface SixYaoChart {
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly calendarAlgorithmVersion: string;
  readonly timezoneDataVersion: string;
  readonly timezone: string;
  readonly calculatedAt: string;
  readonly verificationStatus: VerificationStatus;
  readonly primaryHexagramId: string;
  readonly changedHexagramId: string;
  readonly palace: ResolvedPalace;
  readonly worldAndResponse: WorldAndResponse;
  readonly calendar: CalendarContext;
  readonly voidBranches: readonly [EarthlyBranchId, EarthlyBranchId];
  readonly lines: readonly ChartLine[];
  readonly usefulGod: UsefulGodSelection;
  readonly relatedGodRoles: RelatedGodRoles | null;
  readonly facts: readonly EvidenceFact[];
  readonly unresolvedQuestions: readonly string[];
}

export interface BuildSixYaoChartInput {
  readonly primaryHexagramId: string;
  readonly changedHexagramId: string;
  readonly primaryLowerTrigramId: string;
  readonly primaryUpperTrigramId: string;
  readonly changedLowerTrigramId: string;
  readonly changedUpperTrigramId: string;
  readonly lineValues: readonly [LineValue, LineValue, LineValue, LineValue, LineValue, LineValue];
  readonly calendar: CalendarContext;
  readonly question: QuestionContext;
  readonly calculatedAt: string;
}

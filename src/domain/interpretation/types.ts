import type { LinePosition } from '../casting';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | readonly JsonValue[] | JsonObject;
export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export type RuleVerificationStatus = 'verified' | 'test-only';
export type RuleEnablement = 'enabled' | 'disabled';
export type ConditionCombinator = 'all' | 'any';
export type PredicateOperator =
  | 'equals'
  | 'contains'
  | 'greater-than'
  | 'greater-than-or-equal'
  | 'less-than'
  | 'less-than-or-equal'
  | 'intersects'
  | 'exists'
  | 'not-exists';

export interface ValuePredicate {
  readonly kind: 'predicate';
  readonly field: string;
  readonly operator: Exclude<PredicateOperator, 'exists' | 'not-exists'>;
  readonly value: JsonValue;
}

export interface ExistencePredicate {
  readonly kind: 'predicate';
  readonly field: string;
  readonly operator: 'exists' | 'not-exists';
}

export interface ConditionGroup {
  readonly kind: 'group';
  readonly combinator: ConditionCombinator;
  readonly conditions: readonly RuleCondition[];
}

export type RuleCondition = ValuePredicate | ExistencePredicate | ConditionGroup;

export type PrimarySymbol =
  'auspicious' | 'inauspicious' | 'remorse' | 'regret' | 'danger' | 'blame' | 'undetermined';

export type AuxiliarySymbol =
  'without-blame' | 'remorse-disappears' | 'prosperous' | 'beneficial' | 'unfavorable';

export type OutcomePhase = 'overall' | 'current' | 'later' | 'condition';

export type Trend =
  | 'stable'
  | 'gradual'
  | 'recurring'
  | 'stalled'
  | 'hard-then-easy'
  | 'easy-then-hard'
  | 'danger-to-safety'
  | 'prosperity-to-decline'
  | 'condition-not-met'
  | 'insufficient-information';

export type InterpretationCategory =
  | 'career'
  | 'job-search'
  | 'study'
  | 'wealth'
  | 'investment'
  | 'cooperation'
  | 'relationship'
  | 'marriage'
  | 'travel'
  | 'lost-property'
  | 'health'
  | 'dispute'
  | 'legal'
  | 'general-decision';

export interface EffectBase {
  readonly effectId: string;
  readonly slot: string;
}

export interface OutcomeEffect extends EffectBase {
  readonly kind: 'outcome';
  readonly primarySymbol: Exclude<PrimarySymbol, 'undetermined'>;
  readonly auxiliarySymbols: readonly AuxiliarySymbol[];
  readonly phase: OutcomePhase;
  readonly sequence: number;
  readonly conditionLabel: string | null;
}

export interface TrendEffect extends EffectBase {
  readonly kind: 'trend';
  readonly trend: Exclude<Trend, 'insufficient-information'>;
}

export interface FactorEffect extends EffectBase {
  readonly kind: 'factor';
  readonly polarity: 'favorable' | 'unfavorable';
  readonly messageKey: string;
  readonly subjectIds: readonly string[];
}

export interface ActionEffect extends EffectBase {
  readonly kind: 'action';
  readonly messageKey: string;
  readonly safetyTag: 'general' | 'health' | 'financial' | 'legal' | 'emergency';
  readonly actionPriority: number;
}

export interface FactEffect extends EffectBase {
  readonly kind: 'fact';
  readonly factType: string;
  readonly value: JsonValue;
  readonly polarity: 'positive' | 'negative' | 'neutral' | 'context-dependent';
}

export type RuleEffect = OutcomeEffect | TrendEffect | FactorEffect | ActionEffect | FactEffect;

export interface RuleTarget {
  readonly scope: 'overall' | 'category' | 'line' | 'professional-fact';
  readonly ids: readonly string[];
  readonly linePositions: readonly LinePosition[];
}

export type ConflictResolution = 'override-target' | 'yield-to-target' | 'coexist' | 'block-both';

export interface ConflictRule {
  readonly withRuleId: string;
  readonly resolution: ConflictResolution;
  readonly reason: string;
}

export interface InterpretationRuleSource {
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly sourceLocator: string;
  readonly verificationStatus: RuleVerificationStatus;
}

export interface InterpretationRule {
  readonly ruleId: string;
  readonly name: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly preconditions: ConditionGroup;
  readonly conditions: ConditionGroup;
  readonly target: RuleTarget;
  readonly effects: readonly RuleEffect[];
  readonly priority: number;
  readonly weight: number;
  readonly exclusiveGroup: string | null;
  readonly conflictRules: readonly ConflictRule[];
  readonly requiredFields: readonly string[];
  readonly source: InterpretationRuleSource;
  readonly status: RuleEnablement;
}

export interface InterpretationRuleset {
  readonly schemaVersion: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly verificationStatus: RuleVerificationStatus;
  readonly availableFields: readonly string[];
  readonly samePriorityStrategy: 'rule-id-ascending' | 'higher-weight-then-rule-id';
  readonly defaultConflictStrategy: 'preserve-unresolved';
  readonly rules: readonly InterpretationRule[];
}

export interface InterpretationEngineInput {
  readonly schemaVersion: string;
  readonly divinationRecordId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly category: InterpretationCategory;
  readonly questionContext: JsonObject;
  readonly castingResult: JsonObject;
  readonly professionalChart: JsonObject | null;
  readonly usefulGodCandidates: readonly JsonObject[];
  readonly calendarContext: JsonObject | null;
}

export interface PredicateEvidence {
  readonly evidenceId: string;
  readonly field: string;
  readonly operator: PredicateOperator;
  readonly expected: JsonValue | null;
  readonly actual: JsonValue | null;
  readonly actualPresent: boolean;
  readonly satisfied: boolean;
}

export interface RuleEvaluation {
  readonly rule: InterpretationRule;
  readonly status: 'matched' | 'not-matched' | 'disabled' | 'missing-required-field';
  readonly evidence: readonly PredicateEvidence[];
  readonly missingFields: readonly string[];
}

export interface RuleMatchResult {
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly executionOrder: readonly string[];
  readonly matchedRules: readonly RuleEvaluation[];
  readonly unmatchedRules: readonly RuleEvaluation[];
}

export interface ExcludedRule {
  readonly ruleId: string;
  readonly reason: 'exclusive-group' | 'explicit-conflict' | 'explicit-yield' | 'block-both';
  readonly byRuleId: string | null;
  readonly explanation: string;
}

export interface ConflictRecord {
  readonly conflictId: string;
  readonly ruleIds: readonly [string, string];
  readonly kind: 'exclusive-group' | 'explicit' | 'semantic-slot';
  readonly resolution: 'first-wins' | ConflictResolution | 'unresolved-preserved';
  readonly winnerRuleId: string | null;
  readonly explanation: string;
}

export interface ConflictResolutionResult {
  readonly acceptedRules: readonly RuleEvaluation[];
  readonly excludedRules: readonly ExcludedRule[];
  readonly conflicts: readonly ConflictRecord[];
}

export interface OutcomeAssessment {
  readonly assessmentId: string;
  readonly slot: string;
  readonly primarySymbol: PrimarySymbol;
  readonly auxiliarySymbols: readonly AuxiliarySymbol[];
  readonly phase: OutcomePhase;
  readonly sequence: number;
  readonly conditionLabel: string | null;
  readonly ruleIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly conflictIds: readonly string[];
}

export interface TrendAssessment {
  readonly value: Trend;
  readonly ruleIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly conflictIds: readonly string[];
}

export interface EvidenceBackedFactor {
  readonly factorId: string;
  readonly polarity: 'favorable' | 'unfavorable';
  readonly messageKey: string;
  readonly subjectIds: readonly string[];
  readonly ruleIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface ActionRecommendation {
  readonly actionId: string;
  readonly messageKey: string;
  readonly safetyTag: ActionEffect['safetyTag'];
  readonly priority: number;
  readonly basedOnRuleIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface DerivedInterpretationFact {
  readonly factId: string;
  readonly factType: string;
  readonly value: JsonValue;
  readonly polarity: FactEffect['polarity'];
  readonly ruleIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

export interface RuleRationaleItem {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly conclusion: string;
  readonly evidence: readonly PredicateEvidence[];
  readonly linePositions: readonly LinePosition[];
  readonly polarity: 'positive' | 'negative' | 'neutral' | 'mixed' | 'context-dependent';
  readonly priority: number;
  readonly overridden: boolean;
  readonly overriddenByRuleId: string | null;
  readonly source: InterpretationRuleSource;
  readonly rulesetVersion: string;
}

export interface InterpretationAnalysis {
  readonly schemaVersion: string;
  readonly rulesetId: string;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly divinationRecordId: string;
  readonly category: InterpretationCategory;
  readonly facts: Readonly<{
    questionContext: JsonObject;
    castingResult: JsonObject;
    professionalChart: JsonObject | null;
    usefulGodCandidates: readonly JsonObject[];
    calendarContext: JsonObject | null;
  }>;
  readonly match: RuleMatchResult;
  readonly resolution: ConflictResolutionResult;
  readonly outcome: readonly OutcomeAssessment[];
  readonly trend: TrendAssessment;
  readonly favorableFactors: readonly EvidenceBackedFactor[];
  readonly unfavorableFactors: readonly EvidenceBackedFactor[];
  readonly actions: readonly ActionRecommendation[];
  readonly derivedFacts: readonly DerivedInterpretationFact[];
  readonly rationale: readonly RuleRationaleItem[];
  readonly capability: 'available' | 'insufficient-rules';
}

export type TemplateVariableName =
  | 'categoryLabel'
  | 'conclusion'
  | 'overall'
  | 'favorable'
  | 'unfavorable'
  | 'trend'
  | 'actions'
  | 'basis'
  | 'risk';

export interface CategoryTemplate {
  readonly templateId: string;
  readonly templateVersion: string;
  readonly category: InterpretationCategory;
  readonly locale: 'zh-Hans';
  readonly variables: readonly TemplateVariableName[];
  readonly sections: Readonly<{
    oneLineConclusion: string;
    overallAnalysis: string;
    favorableFactors: string;
    unfavorableFactors: string;
    trend: string;
    actionAdvice: string;
    rationale: string;
    riskStatement: string;
  }>;
}

export interface ComposedInterpretationText {
  readonly templateVersion: string;
  readonly usedFallback: boolean;
  readonly brief: string;
  readonly detailed: string;
  readonly professional: string;
  readonly classicalStyle: Readonly<{
    label: string;
    disclaimer: string;
    text: string;
  }>;
  readonly sections: CategoryTemplate['sections'];
  readonly riskStatement: string;
}

export interface InterpretationOutput {
  readonly analysis: InterpretationAnalysis;
  readonly presentation: ComposedInterpretationText;
}

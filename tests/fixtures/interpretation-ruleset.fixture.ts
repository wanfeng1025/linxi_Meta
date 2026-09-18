import type {
  InterpretationEngineInput,
  InterpretationRule,
  InterpretationRuleset,
  RuleEffect,
} from '../../src/domain/interpretation';

const rulesetId = 'synthetic-interpretation-rules';
const rulesetVersion = '0.0.0-test.1';
const contentVersion = 'synthetic-content-test.1';

const availableFields = [
  'question.category',
  'question.subject',
  'casting.primaryHexagramId',
  'casting.changedHexagramId',
  'casting.movingPositions',
  'professional.riskLevel',
  'professional.facts',
  'usefulGodCandidates.0.relative',
  'calendar.monthBranchId',
  'question.optionalMarker',
] as const;

const source = {
  sourceId: 'synthetic-interpretation-source',
  sourceVersion: '0.0.0-test.1',
  sourceLocator: 'tests/fixtures/interpretation-ruleset.fixture.ts',
  verificationStatus: 'test-only',
} as const;

function outcome(
  effectId: string,
  slot: string,
  primarySymbol: 'auspicious' | 'inauspicious' | 'remorse' | 'regret' | 'danger' | 'blame',
  phase: 'overall' | 'current' | 'later' | 'condition',
  sequence: number,
  auxiliarySymbols: readonly ('without-blame' | 'beneficial')[] = [],
): RuleEffect {
  return {
    effectId,
    slot,
    kind: 'outcome',
    primarySymbol,
    auxiliarySymbols,
    phase,
    sequence,
    conditionLabel: phase === 'condition' ? 'synthetic-condition' : null,
  };
}

export function syntheticRule(
  ruleId: string,
  priority: number,
  effects: readonly RuleEffect[],
  options: Readonly<{
    exclusiveGroup?: string | null;
    category?: string;
    weight?: number;
    linePositions?: readonly (1 | 2 | 3 | 4 | 5 | 6)[];
  }> = {},
): InterpretationRule {
  return {
    ruleId,
    name: `Synthetic rule ${ruleId}`,
    rulesetId,
    rulesetVersion,
    preconditions: {
      kind: 'group',
      combinator: 'all',
      conditions: [{ kind: 'predicate', field: 'question.category', operator: 'exists' }],
    },
    conditions: {
      kind: 'group',
      combinator: 'all',
      conditions: [
        {
          kind: 'predicate',
          field: 'question.category',
          operator: 'equals',
          value: options.category ?? 'career',
        },
        {
          kind: 'predicate',
          field: 'professional.riskLevel',
          operator: 'equals',
          value: 'contained',
        },
      ],
    },
    target: { scope: 'overall', ids: [], linePositions: options.linePositions ?? [] },
    effects,
    priority,
    weight: options.weight ?? 1,
    exclusiveGroup: options.exclusiveGroup ?? null,
    conflictRules: [],
    requiredFields: ['question.category', 'professional.riskLevel'],
    source,
    status: 'enabled',
  };
}

export function createSyntheticInterpretationRuleset(): InterpretationRuleset {
  return {
    schemaVersion: 'interpretation-ruleset-schema-v1',
    rulesetId,
    rulesetVersion,
    contentVersion,
    verificationStatus: 'test-only',
    availableFields,
    samePriorityStrategy: 'higher-weight-then-rule-id',
    defaultConflictStrategy: 'preserve-unresolved',
    rules: [
      syntheticRule(
        'synthetic-current-regret',
        100,
        [
          outcome('effect-current-regret', 'outcome-current', 'regret', 'current', 1),
          {
            effectId: 'factor-current-friction',
            slot: 'factor-friction',
            kind: 'factor',
            polarity: 'unfavorable',
            messageKey: 'current-friction-needs-review',
            subjectIds: ['line-3'],
          },
          {
            effectId: 'action-review-checkpoint',
            slot: 'action-checkpoint',
            kind: 'action',
            messageKey: 'review-before-next-step',
            safetyTag: 'general',
            actionPriority: 80,
          },
        ],
        { exclusiveGroup: 'current-outcome', linePositions: [3] },
      ),
      syntheticRule('synthetic-later-auspicious', 90, [
        outcome('effect-later-auspicious', 'outcome-later', 'auspicious', 'later', 2, [
          'beneficial',
        ]),
        {
          effectId: 'trend-hard-then-easy',
          slot: 'trend-overall',
          kind: 'trend',
          trend: 'hard-then-easy',
        },
        {
          effectId: 'factor-later-opening',
          slot: 'factor-opening',
          kind: 'factor',
          polarity: 'favorable',
          messageKey: 'later-opening-after-review',
          subjectIds: ['line-3'],
        },
        {
          effectId: 'fact-review-complete',
          slot: 'fact-review-state',
          kind: 'fact',
          factType: 'synthetic-review-state',
          value: 'can-improve',
          polarity: 'positive',
        },
      ]),
      syntheticRule(
        'synthetic-low-inauspicious',
        20,
        [outcome('effect-low-inauspicious', 'outcome-current', 'inauspicious', 'current', 1)],
        { exclusiveGroup: 'current-outcome' },
      ),
    ],
  };
}

export function createSyntheticInterpretationInput(
  category: InterpretationEngineInput['category'] = 'career',
): InterpretationEngineInput {
  return {
    schemaVersion: 'interpretation-input-v1',
    divinationRecordId: 'synthetic-record-1',
    rulesetVersion,
    contentVersion,
    category,
    questionContext: { category, subject: 'self' },
    castingResult: {
      primaryHexagramId: 'synthetic-primary',
      changedHexagramId: 'synthetic-changed',
      movingPositions: [3],
    },
    professionalChart: {
      riskLevel: 'contained',
      facts: [{ factType: 'synthetic-only', linePosition: 3 }],
    },
    usefulGodCandidates: [{ relative: 'official' }],
    calendarContext: { monthBranchId: 'synthetic-branch' },
  };
}

export { availableFields, contentVersion, outcome, rulesetId, rulesetVersion, source };

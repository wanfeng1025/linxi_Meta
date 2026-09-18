import type {
  ActionEffect,
  ActionRecommendation,
  AuxiliarySymbol,
  ConflictResolutionResult,
  DerivedInterpretationFact,
  EvidenceBackedFactor,
  FactorEffect,
  InterpretationAnalysis,
  InterpretationEngineInput,
  InterpretationRuleset,
  OutcomeAssessment,
  OutcomeEffect,
  PredicateEvidence,
  PrimarySymbol,
  RuleEffect,
  RuleEvaluation,
  RuleRationaleItem,
  Trend,
  TrendAssessment,
  TrendEffect,
} from './types';

const primaryLabels: Readonly<Record<PrimarySymbol, string>> = {
  auspicious: '吉',
  inauspicious: '凶',
  remorse: '悔',
  regret: '吝',
  danger: '厉',
  blame: '咎',
  undetermined: '未定',
};

const auxiliaryLabels: Readonly<Record<AuxiliarySymbol, string>> = {
  'without-blame': '无咎',
  'remorse-disappears': '悔亡',
  prosperous: '亨',
  beneficial: '利',
  unfavorable: '不利',
};

function evidenceIds(evaluation: RuleEvaluation): readonly string[] {
  return Object.freeze(
    evaluation.evidence.filter((item) => item.satisfied).map((item) => item.evidenceId),
  );
}

function outcomeSignature(effect: OutcomeEffect): string {
  return JSON.stringify({
    primarySymbol: effect.primarySymbol,
    auxiliarySymbols: [...effect.auxiliarySymbols].sort(),
    phase: effect.phase,
    sequence: effect.sequence,
    conditionLabel: effect.conditionLabel,
  });
}

function unique<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(values)]);
}

function conflictIdsForRules(
  resolution: ConflictResolutionResult,
  ruleIds: readonly string[],
): readonly string[] {
  const set = new Set(ruleIds);
  return Object.freeze(
    resolution.conflicts
      .filter(({ ruleIds: pair }) => pair.every((ruleId) => set.has(ruleId)))
      .map(({ conflictId }) => conflictId),
  );
}

function buildOutcomes(
  accepted: readonly RuleEvaluation[],
  resolution: ConflictResolutionResult,
): readonly OutcomeAssessment[] {
  const entries = accepted.flatMap((evaluation) =>
    evaluation.rule.effects
      .filter((effect): effect is OutcomeEffect => effect.kind === 'outcome')
      .map((effect) => ({ evaluation, effect })),
  );
  if (entries.length === 0) {
    return Object.freeze([
      Object.freeze({
        assessmentId: 'outcome-undetermined',
        slot: 'outcome-overall',
        primarySymbol: 'undetermined',
        auxiliarySymbols: [],
        phase: 'overall',
        sequence: 0,
        conditionLabel: null,
        ruleIds: [],
        evidenceIds: [],
        conflictIds: [],
      }),
    ]);
  }

  const slots = new Map<string, typeof entries>();
  for (const entry of entries) {
    const current = slots.get(entry.effect.slot) ?? [];
    current.push(entry);
    slots.set(entry.effect.slot, current);
  }
  const assessments: OutcomeAssessment[] = [];
  for (const [slot, slotEntries] of slots) {
    const signatures = unique(slotEntries.map(({ effect }) => outcomeSignature(effect)));
    const ruleIds = unique(slotEntries.map(({ evaluation }) => evaluation.rule.ruleId));
    const allEvidenceIds = unique(slotEntries.flatMap(({ evaluation }) => evidenceIds(evaluation)));
    const first = slotEntries[0];
    if (first === undefined) continue;
    if (signatures.length > 1) {
      assessments.push(
        Object.freeze({
          assessmentId: `outcome-${slot}-undetermined`,
          slot,
          primarySymbol: 'undetermined',
          auxiliarySymbols: [],
          phase: first.effect.phase,
          sequence: first.effect.sequence,
          conditionLabel: first.effect.conditionLabel,
          ruleIds,
          evidenceIds: allEvidenceIds,
          conflictIds: conflictIdsForRules(resolution, ruleIds),
        }),
      );
      continue;
    }
    assessments.push(
      Object.freeze({
        assessmentId: `outcome-${slot}`,
        slot,
        primarySymbol: first.effect.primarySymbol,
        auxiliarySymbols: unique(slotEntries.flatMap(({ effect }) => effect.auxiliarySymbols)),
        phase: first.effect.phase,
        sequence: first.effect.sequence,
        conditionLabel: first.effect.conditionLabel,
        ruleIds,
        evidenceIds: allEvidenceIds,
        conflictIds: conflictIdsForRules(resolution, ruleIds),
      }),
    );
  }
  return Object.freeze(
    assessments.sort(
      (left, right) => left.sequence - right.sequence || (left.slot < right.slot ? -1 : 1),
    ),
  );
}

function buildTrend(
  accepted: readonly RuleEvaluation[],
  resolution: ConflictResolutionResult,
): TrendAssessment {
  const entries = accepted.flatMap((evaluation) =>
    evaluation.rule.effects
      .filter((effect): effect is TrendEffect => effect.kind === 'trend')
      .map((effect) => ({ evaluation, effect })),
  );
  const values = unique(entries.map(({ effect }) => effect.trend));
  const ruleIds = unique(entries.map(({ evaluation }) => evaluation.rule.ruleId));
  const allEvidenceIds = unique(entries.flatMap(({ evaluation }) => evidenceIds(evaluation)));
  return Object.freeze({
    value: (values.length === 1 ? values[0] : 'insufficient-information') as Trend,
    ruleIds,
    evidenceIds: allEvidenceIds,
    conflictIds: values.length > 1 ? conflictIdsForRules(resolution, ruleIds) : [],
  });
}

function groupEffects<TEffect extends FactorEffect | ActionEffect>(
  accepted: readonly RuleEvaluation[],
  guard: (effect: RuleEffect) => effect is TEffect,
): ReadonlyMap<
  string,
  readonly { readonly effect: TEffect; readonly evaluation: RuleEvaluation }[]
> {
  const groups = new Map<
    string,
    { readonly effect: TEffect; readonly evaluation: RuleEvaluation }[]
  >();
  for (const evaluation of accepted) {
    for (const effect of evaluation.rule.effects.filter(guard)) {
      const key = `${effect.slot}|${effect.messageKey}`;
      const group = groups.get(key) ?? [];
      group.push({ effect, evaluation });
      groups.set(key, group);
    }
  }
  return groups;
}

function buildFactors(accepted: readonly RuleEvaluation[]): readonly EvidenceBackedFactor[] {
  const groups = groupEffects(
    accepted,
    (effect): effect is FactorEffect => effect.kind === 'factor',
  );
  return Object.freeze(
    [...groups.values()].map((entries) => {
      const first = entries[0];
      if (first === undefined) throw new Error('Factor group cannot be empty.');
      return Object.freeze({
        factorId: first.effect.effectId,
        polarity: first.effect.polarity,
        messageKey: first.effect.messageKey,
        subjectIds: unique(entries.flatMap(({ effect }) => effect.subjectIds)),
        ruleIds: unique(entries.map(({ evaluation }) => evaluation.rule.ruleId)),
        evidenceIds: unique(entries.flatMap(({ evaluation }) => evidenceIds(evaluation))),
      });
    }),
  );
}

function buildActions(accepted: readonly RuleEvaluation[]): readonly ActionRecommendation[] {
  const groups = groupEffects(
    accepted,
    (effect): effect is ActionEffect => effect.kind === 'action',
  );
  return Object.freeze(
    [...groups.values()]
      .map((entries) => {
        const first = entries[0];
        if (first === undefined) throw new Error('Action group cannot be empty.');
        return Object.freeze({
          actionId: first.effect.effectId,
          messageKey: first.effect.messageKey,
          safetyTag: first.effect.safetyTag,
          priority: Math.max(...entries.map(({ effect }) => effect.actionPriority)),
          basedOnRuleIds: unique(entries.map(({ evaluation }) => evaluation.rule.ruleId)),
          evidenceIds: unique(entries.flatMap(({ evaluation }) => evidenceIds(evaluation))),
        });
      })
      .sort(
        (left, right) =>
          right.priority - left.priority || (left.actionId < right.actionId ? -1 : 1),
      ),
  );
}

function buildDerivedFacts(
  accepted: readonly RuleEvaluation[],
): readonly DerivedInterpretationFact[] {
  return Object.freeze(
    accepted.flatMap((evaluation) =>
      evaluation.rule.effects
        .filter((effect) => effect.kind === 'fact')
        .map((effect) =>
          Object.freeze({
            factId: effect.effectId,
            factType: effect.factType,
            value: effect.value,
            polarity: effect.polarity,
            ruleIds: Object.freeze([evaluation.rule.ruleId]),
            evidenceIds: evidenceIds(evaluation),
          }),
        ),
    ),
  );
}

function effectConclusion(effect: RuleEffect): string {
  if (effect.kind === 'outcome') {
    const auxiliaries = effect.auxiliarySymbols.map((symbol) => auxiliaryLabels[symbol]).join('、');
    return `${primaryLabels[effect.primarySymbol]}${auxiliaries.length > 0 ? `（${auxiliaries}）` : ''}`;
  }
  if (effect.kind === 'trend') return `趋势：${effect.trend}`;
  if (effect.kind === 'factor') return `${effect.polarity}：${effect.messageKey}`;
  if (effect.kind === 'action') return `建议：${effect.messageKey}`;
  return `事实：${effect.factType}`;
}

function rationalePolarity(effects: readonly RuleEffect[]): RuleRationaleItem['polarity'] {
  const values = new Set<'positive' | 'negative' | 'neutral' | 'context-dependent'>();
  for (const effect of effects) {
    if (effect.kind === 'outcome') {
      if (effect.primarySymbol === 'auspicious') values.add('positive');
      else if (
        effect.primarySymbol === 'danger' &&
        effect.auxiliarySymbols.includes('without-blame')
      ) {
        values.add('context-dependent');
      } else values.add('negative');
    } else if (effect.kind === 'factor') {
      values.add(effect.polarity === 'favorable' ? 'positive' : 'negative');
    } else if (effect.kind === 'fact') values.add(effect.polarity);
    else values.add('neutral');
  }
  if (values.size > 1) return 'mixed';
  return values.values().next().value ?? 'neutral';
}

function buildRationale(
  matched: readonly RuleEvaluation[],
  resolution: ConflictResolutionResult,
): readonly RuleRationaleItem[] {
  const acceptedIds = new Set(resolution.acceptedRules.map(({ rule }) => rule.ruleId));
  const excludedById = new Map(
    resolution.excludedRules.map((excluded) => [excluded.ruleId, excluded] as const),
  );
  return Object.freeze(
    matched.map((evaluation) => {
      const excluded = excludedById.get(evaluation.rule.ruleId);
      return Object.freeze({
        ruleId: evaluation.rule.ruleId,
        ruleName: evaluation.rule.name,
        conclusion: evaluation.rule.effects.map(effectConclusion).join('；'),
        evidence: evaluation.evidence as readonly PredicateEvidence[],
        linePositions: evaluation.rule.target.linePositions,
        polarity: rationalePolarity(evaluation.rule.effects),
        priority: evaluation.rule.priority,
        overridden: !acceptedIds.has(evaluation.rule.ruleId),
        overriddenByRuleId: excluded?.byRuleId ?? null,
        source: evaluation.rule.source,
        rulesetVersion: evaluation.rule.rulesetVersion,
      });
    }),
  );
}

export function buildInterpretationAnalysis(
  input: InterpretationEngineInput,
  ruleset: InterpretationRuleset,
  match: InterpretationAnalysis['match'],
  resolution: ConflictResolutionResult,
): InterpretationAnalysis {
  const outcome = buildOutcomes(resolution.acceptedRules, resolution);
  const trend = buildTrend(resolution.acceptedRules, resolution);
  const factors = buildFactors(resolution.acceptedRules);
  return Object.freeze({
    schemaVersion: 'interpretation-result-v1',
    rulesetId: ruleset.rulesetId,
    rulesetVersion: ruleset.rulesetVersion,
    contentVersion: input.contentVersion,
    divinationRecordId: input.divinationRecordId,
    category: input.category,
    facts: Object.freeze({
      questionContext: input.questionContext,
      castingResult: input.castingResult,
      professionalChart: input.professionalChart,
      usefulGodCandidates: input.usefulGodCandidates,
      calendarContext: input.calendarContext,
    }),
    match,
    resolution,
    outcome,
    trend,
    favorableFactors: Object.freeze(factors.filter((factor) => factor.polarity === 'favorable')),
    unfavorableFactors: Object.freeze(
      factors.filter((factor) => factor.polarity === 'unfavorable'),
    ),
    actions: buildActions(resolution.acceptedRules),
    derivedFacts: buildDerivedFacts(resolution.acceptedRules),
    rationale: buildRationale(match.matchedRules, resolution),
    capability: outcome.some((assessment) => assessment.primarySymbol !== 'undetermined')
      ? 'available'
      : 'insufficient-rules',
  });
}

export { auxiliaryLabels, primaryLabels };

import type {
  ConflictRecord,
  ConflictResolution,
  ConflictResolutionResult,
  ExcludedRule,
  InterpretationRuleset,
  RuleEffect,
  RuleEvaluation,
} from './types';

interface PairDecision {
  readonly resolution: ConflictResolution;
  readonly winner: 'candidate' | 'selected' | 'neither' | 'both';
  readonly reason: string;
}

function explicitDecision(
  candidate: RuleEvaluation,
  selected: RuleEvaluation,
): PairDecision | null {
  const fromCandidate = candidate.rule.conflictRules.find(
    (conflict) => conflict.withRuleId === selected.rule.ruleId,
  );
  if (fromCandidate !== undefined) {
    return {
      resolution: fromCandidate.resolution,
      winner:
        fromCandidate.resolution === 'override-target'
          ? 'candidate'
          : fromCandidate.resolution === 'yield-to-target'
            ? 'selected'
            : fromCandidate.resolution === 'coexist'
              ? 'both'
              : 'neither',
      reason: fromCandidate.reason,
    };
  }
  const fromSelected = selected.rule.conflictRules.find(
    (conflict) => conflict.withRuleId === candidate.rule.ruleId,
  );
  if (fromSelected === undefined) return null;
  return {
    resolution: fromSelected.resolution,
    winner:
      fromSelected.resolution === 'override-target'
        ? 'selected'
        : fromSelected.resolution === 'yield-to-target'
          ? 'candidate'
          : fromSelected.resolution === 'coexist'
            ? 'both'
            : 'neither',
    reason: fromSelected.reason,
  };
}

function conflictId(kind: string, leftRuleId: string, rightRuleId: string, suffix = ''): string {
  const pair = [leftRuleId, rightRuleId].sort();
  return `${kind}-${pair[0]}-${pair[1]}${suffix}`;
}

function effectSignature(effect: RuleEffect): string {
  if (effect.kind === 'outcome') {
    return JSON.stringify({
      primarySymbol: effect.primarySymbol,
      auxiliarySymbols: [...effect.auxiliarySymbols].sort(),
      phase: effect.phase,
      sequence: effect.sequence,
      conditionLabel: effect.conditionLabel,
    });
  }
  if (effect.kind === 'trend') return effect.trend;
  if (effect.kind === 'fact')
    return JSON.stringify([effect.factType, effect.value, effect.polarity]);
  return effect.effectId;
}

function findSemanticConflicts(accepted: readonly RuleEvaluation[]): readonly ConflictRecord[] {
  const conflicts: ConflictRecord[] = [];
  const seen = new Set<string>();
  for (let leftIndex = 0; leftIndex < accepted.length; leftIndex += 1) {
    const left = accepted[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < accepted.length; rightIndex += 1) {
      const right = accepted[rightIndex];
      if (right === undefined) continue;
      for (const leftEffect of left.rule.effects) {
        if (!['outcome', 'trend', 'fact'].includes(leftEffect.kind)) continue;
        for (const rightEffect of right.rule.effects) {
          const semanticSlot = leftEffect.kind === 'trend' ? 'trend-overall' : leftEffect.slot;
          if (
            leftEffect.kind !== rightEffect.kind ||
            (leftEffect.kind !== 'trend' && leftEffect.slot !== rightEffect.slot) ||
            effectSignature(leftEffect) === effectSignature(rightEffect)
          ) {
            continue;
          }
          const id = conflictId(
            'semantic',
            left.rule.ruleId,
            right.rule.ruleId,
            `-${leftEffect.kind}-${semanticSlot}`,
          );
          if (seen.has(id)) continue;
          seen.add(id);
          conflicts.push(
            Object.freeze({
              conflictId: id,
              ruleIds: Object.freeze(
                [left.rule.ruleId, right.rule.ruleId].sort() as [string, string],
              ),
              kind: 'semantic-slot',
              resolution: 'unresolved-preserved',
              winnerRuleId: null,
              explanation: `Different ${leftEffect.kind} values target slot ${semanticSlot}; both are retained as an explicit unresolved conflict.`,
            }),
          );
        }
      }
    }
  }
  return conflicts;
}

export function resolveRuleConflicts(
  match: { readonly matchedRules: readonly RuleEvaluation[] },
  ruleset: InterpretationRuleset,
): ConflictResolutionResult {
  if (ruleset.defaultConflictStrategy !== 'preserve-unresolved') {
    throw new Error('Unsupported default conflict strategy.');
  }
  const accepted: RuleEvaluation[] = [];
  const excluded: ExcludedRule[] = [];
  const conflicts: ConflictRecord[] = [];

  for (const candidate of match.matchedRules) {
    const exclusiveWinner =
      candidate.rule.exclusiveGroup === null
        ? undefined
        : accepted.find(
            (selected) => selected.rule.exclusiveGroup === candidate.rule.exclusiveGroup,
          );
    if (exclusiveWinner !== undefined) {
      const explanation = `Exclusive group ${candidate.rule.exclusiveGroup} selected ${exclusiveWinner.rule.ruleId} by priority and the ruleset tie-break strategy.`;
      excluded.push({
        ruleId: candidate.rule.ruleId,
        reason: 'exclusive-group',
        byRuleId: exclusiveWinner.rule.ruleId,
        explanation,
      });
      conflicts.push({
        conflictId: conflictId('exclusive', candidate.rule.ruleId, exclusiveWinner.rule.ruleId),
        ruleIds: Object.freeze(
          [candidate.rule.ruleId, exclusiveWinner.rule.ruleId].sort() as [string, string],
        ),
        kind: 'exclusive-group',
        resolution: 'first-wins',
        winnerRuleId: exclusiveWinner.rule.ruleId,
        explanation,
      });
      continue;
    }

    const decisions = accepted
      .map((selected) => ({ selected, decision: explicitDecision(candidate, selected) }))
      .filter(
        (item): item is { readonly selected: RuleEvaluation; readonly decision: PairDecision } =>
          item.decision !== null,
      );
    const blocking = decisions.filter(({ decision }) => decision.winner === 'neither');
    const candidateLoses = decisions.filter(({ decision }) => decision.winner === 'selected');
    if (blocking.length > 0) {
      for (const { selected, decision } of blocking) {
        const index = accepted.indexOf(selected);
        if (index >= 0) accepted.splice(index, 1);
        excluded.push({
          ruleId: selected.rule.ruleId,
          reason: 'block-both',
          byRuleId: candidate.rule.ruleId,
          explanation: decision.reason,
        });
        conflicts.push({
          conflictId: conflictId('explicit', candidate.rule.ruleId, selected.rule.ruleId),
          ruleIds: Object.freeze(
            [candidate.rule.ruleId, selected.rule.ruleId].sort() as [string, string],
          ),
          kind: 'explicit',
          resolution: decision.resolution,
          winnerRuleId: null,
          explanation: decision.reason,
        });
      }
      excluded.push({
        ruleId: candidate.rule.ruleId,
        reason: 'block-both',
        byRuleId: null,
        explanation: blocking.map(({ decision }) => decision.reason).join(' '),
      });
      continue;
    }
    if (candidateLoses.length > 0) {
      const winner = candidateLoses[0];
      if (winner === undefined) continue;
      excluded.push({
        ruleId: candidate.rule.ruleId,
        reason: 'explicit-yield',
        byRuleId: winner.selected.rule.ruleId,
        explanation: winner.decision.reason,
      });
      for (const { selected, decision } of candidateLoses) {
        conflicts.push({
          conflictId: conflictId('explicit', candidate.rule.ruleId, selected.rule.ruleId),
          ruleIds: Object.freeze(
            [candidate.rule.ruleId, selected.rule.ruleId].sort() as [string, string],
          ),
          kind: 'explicit',
          resolution: decision.resolution,
          winnerRuleId: selected.rule.ruleId,
          explanation: decision.reason,
        });
      }
      continue;
    }

    for (const { selected, decision } of decisions) {
      const winnerRuleId =
        decision.winner === 'candidate'
          ? candidate.rule.ruleId
          : decision.winner === 'selected'
            ? selected.rule.ruleId
            : null;
      conflicts.push({
        conflictId: conflictId('explicit', candidate.rule.ruleId, selected.rule.ruleId),
        ruleIds: Object.freeze(
          [candidate.rule.ruleId, selected.rule.ruleId].sort() as [string, string],
        ),
        kind: 'explicit',
        resolution: decision.resolution,
        winnerRuleId,
        explanation: decision.reason,
      });
      if (decision.winner === 'candidate') {
        const index = accepted.indexOf(selected);
        if (index >= 0) accepted.splice(index, 1);
        excluded.push({
          ruleId: selected.rule.ruleId,
          reason: 'explicit-conflict',
          byRuleId: candidate.rule.ruleId,
          explanation: decision.reason,
        });
      }
    }
    accepted.push(candidate);
  }

  conflicts.push(...findSemanticConflicts(accepted));
  return Object.freeze({
    acceptedRules: Object.freeze(accepted),
    excludedRules: Object.freeze(excluded),
    conflicts: Object.freeze(conflicts),
  });
}

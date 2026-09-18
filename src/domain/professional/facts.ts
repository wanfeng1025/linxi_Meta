import type { LinePosition } from '../casting';
import { resolveBranchRelations } from './relations';
import type { CalendarContext, EvidenceFact, ProfessionalRuleset, RelativeLine } from './types';

type RelationDirection = 'line-to-context' | 'context-to-line' | 'symmetric';

function relationFactType(
  prefix: 'MONTH' | 'DAY',
  relationType: string,
  direction: RelationDirection,
): string {
  if (prefix === 'MONTH' && relationType === 'six-clash') return 'MONTH_BREAK';
  if (prefix === 'DAY' && relationType === 'six-clash') return 'DAY_CLASH';
  if (relationType === 'six-harmony') return `${prefix}_COMBINATION`;
  if (relationType === 'generate') {
    return direction === 'context-to-line'
      ? `${prefix}_GENERATES_LINE`
      : `LINE_GENERATES_${prefix}`;
  }
  if (relationType === 'control') {
    return direction === 'context-to-line' ? `${prefix}_CONTROLS_LINE` : `LINE_CONTROLS_${prefix}`;
  }
  return `${prefix}_${relationType.replaceAll('-', '_').toUpperCase()}`;
}

function relationPolarity(
  relationType: string,
  direction: RelationDirection,
): EvidenceFact['polarity'] {
  if (relationType === 'six-clash') return 'negative';
  if (relationType === 'control' && direction === 'context-to-line') return 'negative';
  if (relationType === 'generate' && direction === 'context-to-line') return 'positive';
  return 'context-dependent';
}

function makeFact(
  ruleset: ProfessionalRuleset,
  input: Omit<
    EvidenceFact,
    'rulesetId' | 'rulesetVersion' | 'contentVersion' | 'verificationStatus'
  >,
): EvidenceFact {
  return Object.freeze({
    ...input,
    rulesetId: ruleset.metadata.rulesetId,
    rulesetVersion: ruleset.metadata.rulesetVersion,
    contentVersion: ruleset.metadata.contentVersion,
    verificationStatus: ruleset.metadata.verificationStatus,
  });
}

export function evaluateLineStateFacts(
  lines: readonly RelativeLine[],
  calendar: CalendarContext,
  voidBranches: readonly string[],
  ruleset: ProfessionalRuleset,
): readonly EvidenceFact[] {
  const facts: EvidenceFact[] = [];
  const voidRule = ruleset.voidRules.find(
    (rule) => rule.cycleStartIndex === Math.floor(calendar.dayCycleIndex / 10) * 10,
  );
  for (const line of lines) {
    if (voidBranches.includes(line.earthlyBranchId) && voidRule !== undefined) {
      facts.push(
        makeFact(ruleset, {
          factId: `line-${line.position}-${voidRule.ruleId}-void`,
          ruleId: voidRule.ruleId,
          sourceId: voidRule.sourceId,
          sourceVersion: voidRule.sourceVersion,
          sourceLocator: voidRule.sourceLocator,
          subjectLinePosition: line.position,
          objectType: 'voidBranches',
          objectValue: voidBranches.join(','),
          factType: 'VOID',
          polarity: 'context-dependent',
          priority: 100,
          evidenceData: { lineBranch: line.earthlyBranchId, voidBranches },
          shortExplanation:
            'The line branch is in the day-cycle void pair; no final judgment is inferred.',
        }),
      );
    }
    for (const [prefix, branch] of [
      ['MONTH', calendar.monthBranchId],
      ['DAY', calendar.dayBranchId],
    ] as const) {
      const forward = resolveBranchRelations([line.earthlyBranchId, branch], ruleset).map(
        (fact) =>
          ({ fact, direction: fact.rule.directional ? 'line-to-context' : 'symmetric' }) as const,
      );
      const reverse = resolveBranchRelations([branch, line.earthlyBranchId], ruleset)
        .filter(({ rule }) => rule.directional)
        .map((fact) => ({ fact, direction: 'context-to-line' }) as const);
      for (const { fact, direction } of [...forward, ...reverse]) {
        const { rule } = fact;
        facts.push(
          makeFact(ruleset, {
            factId: `line-${line.position}-${prefix.toLowerCase()}-${rule.ruleId}`,
            ruleId: rule.ruleId,
            sourceId: rule.sourceId,
            sourceVersion: rule.sourceVersion,
            sourceLocator: rule.sourceLocator,
            subjectLinePosition: line.position as LinePosition,
            objectType: prefix === 'MONTH' ? 'monthBranch' : 'dayBranch',
            objectValue: branch,
            factType: relationFactType(prefix, rule.relationType, direction),
            polarity: relationPolarity(rule.relationType, direction),
            priority: rule.priority,
            evidenceData: {
              lineBranch: line.earthlyBranchId,
              contextBranch: branch,
              relationType: rule.relationType,
              relationDirection: direction,
              interpretationMode: rule.interpretationMode,
            },
            shortExplanation: `A configured ${rule.relationType} relation was matched; interpretation remains rule-set scoped.`,
          }),
        );
      }
    }
  }
  return Object.freeze(facts);
}

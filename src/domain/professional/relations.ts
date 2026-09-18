import { ProfessionalDomainError } from './errors';
import type { BranchRelationFact, EarthlyBranchId, ProfessionalRuleset } from './types';

function containsAll(haystack: readonly string[], needles: readonly string[]): boolean {
  const remaining = [...haystack];
  for (const needle of needles) {
    const index = remaining.indexOf(needle);
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}

export function resolveVoidBranches(
  dayCycleIndex: number,
  ruleset: ProfessionalRuleset,
): readonly [EarthlyBranchId, EarthlyBranchId] {
  if (!Number.isInteger(dayCycleIndex) || dayCycleIndex < 0 || dayCycleIndex > 59) {
    throw new ProfessionalDomainError('INVALID_INPUT', 'dayCycleIndex must be an integer 0..59.');
  }
  const cycleStartIndex = Math.floor(dayCycleIndex / 10) * 10;
  const rule = ruleset.voidRules.find((candidate) => candidate.cycleStartIndex === cycleStartIndex);
  if (rule === undefined) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `No void-branch rule exists for cycle start ${cycleStartIndex}.`,
    );
  }
  return Object.freeze([...rule.voidBranches]) as readonly [EarthlyBranchId, EarthlyBranchId];
}

export function resolveBranchRelations(
  branches: readonly EarthlyBranchId[],
  ruleset: ProfessionalRuleset,
): readonly BranchRelationFact[] {
  if (branches.length < 2) return Object.freeze([]);
  return Object.freeze(
    ruleset.branchRelationRules
      .filter((rule) => {
        if (!rule.enabled || rule.interpretationMode === 'disabled') return false;
        return rule.directional
          ? rule.branchIds.length === branches.length &&
              rule.branchIds.every((branch, index) => branch === branches[index])
          : containsAll(branches, rule.branchIds);
      })
      .sort((left, right) => right.priority - left.priority)
      .map((rule) => Object.freeze({ rule, matchedBranches: Object.freeze([...rule.branchIds]) })),
  );
}

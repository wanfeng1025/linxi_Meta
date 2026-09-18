import type { LinePosition } from '../casting';
import { ProfessionalDomainError } from './errors';
import type { ElementLine, NajiaLine, ProfessionalRuleset, RelativeLine } from './types';

function position(scope: 'inner' | 'outer', localLine: 1 | 2 | 3): LinePosition {
  return (scope === 'inner' ? localLine : localLine + 3) as LinePosition;
}

export function applyNajia(
  lowerTrigramId: string,
  upperTrigramId: string,
  ruleset: ProfessionalRuleset,
): readonly NajiaLine[] {
  const selected = ruleset.najiaRules.filter(
    (rule) =>
      (rule.scope === 'inner' && rule.trigramId === lowerTrigramId) ||
      (rule.scope === 'outer' && rule.trigramId === upperTrigramId),
  );
  if (selected.length !== 6) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `Najia requires three inner rules for ${lowerTrigramId} and three outer rules for ${upperTrigramId}.`,
    );
  }
  const lines = selected
    .map((rule) =>
      Object.freeze({
        position: position(rule.scope, rule.localLine),
        heavenlyStemId: rule.heavenlyStemId,
        earthlyBranchId: rule.earthlyBranchId,
        ruleId: rule.ruleId,
      }),
    )
    .sort((left, right) => left.position - right.position);
  if (new Set(lines.map((line) => line.position)).size !== 6) {
    throw new ProfessionalDomainError('INVALID_RULESET', 'Najia line positions must cover 1..6.');
  }
  return Object.freeze(lines);
}

export function resolveLineElements(
  lines: readonly NajiaLine[],
  ruleset: ProfessionalRuleset,
): readonly ElementLine[] {
  return Object.freeze(
    lines.map((line) => {
      const rule = ruleset.earthlyBranches.find(
        (candidate) => candidate.branchId === line.earthlyBranchId,
      );
      if (rule === undefined) {
        throw new ProfessionalDomainError(
          'RULE_NOT_FOUND',
          `No element rule exists for branch ${line.earthlyBranchId}.`,
        );
      }
      return Object.freeze({ ...line, elementId: rule.elementId, elementRuleId: rule.ruleId });
    }),
  );
}

export function resolveSixRelatives(
  palaceElementId: string,
  lines: readonly ElementLine[],
  ruleset: ProfessionalRuleset,
): readonly RelativeLine[] {
  return Object.freeze(
    lines.map((line) => {
      const rule = ruleset.sixRelativeRules.find(
        (candidate) =>
          candidate.palaceElementId === palaceElementId &&
          candidate.lineElementId === line.elementId,
      );
      if (rule === undefined) {
        throw new ProfessionalDomainError(
          'RULE_NOT_FOUND',
          `No six-relative rule exists for palace ${palaceElementId} and line ${line.elementId}.`,
        );
      }
      return Object.freeze({
        ...line,
        relative: rule.relative,
        relativeRuleId: rule.ruleId,
        relativeFormulaCode: rule.formulaCode,
      });
    }),
  );
}

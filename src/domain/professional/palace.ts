import { ProfessionalDomainError } from './errors';
import type { ProfessionalRuleset, ResolvedPalace, WorldAndResponse } from './types';

export function resolvePalace(hexagramId: string, ruleset: ProfessionalRuleset): ResolvedPalace {
  const rule = ruleset.palaceRules.find((candidate) => candidate.hexagramId === hexagramId);
  if (rule === undefined) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `No palace rule exists for hexagram ${hexagramId}.`,
    );
  }
  return Object.freeze({
    hexagramId,
    palaceTrigramId: rule.palaceTrigramId,
    palaceElementId: rule.palaceElementId,
    palaceSequence: rule.palaceSequence,
    stage: rule.stage,
    ruleId: rule.ruleId,
  });
}

export function resolveWorldAndResponse(
  hexagramId: string,
  ruleset: ProfessionalRuleset,
): WorldAndResponse {
  const rule = ruleset.palaceRules.find((candidate) => candidate.hexagramId === hexagramId);
  if (rule === undefined) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `No world/response rule exists for hexagram ${hexagramId}.`,
    );
  }
  const distance = Math.abs(rule.worldPosition - rule.responsePosition);
  if (distance !== 3) {
    throw new ProfessionalDomainError(
      'INVALID_RULESET',
      `World and response positions for ${hexagramId} must differ by three.`,
    );
  }
  return Object.freeze({
    worldPosition: rule.worldPosition,
    responsePosition: rule.responsePosition,
    ruleId: rule.ruleId,
  });
}

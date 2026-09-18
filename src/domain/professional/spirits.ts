import type { LinePosition } from '../casting';
import { ProfessionalDomainError } from './errors';
import type { ProfessionalRuleset, SpiritLine } from './types';

export function resolveSixSpirits(
  dayStemId: string,
  ruleset: ProfessionalRuleset,
): readonly SpiritLine[] {
  const startRule = ruleset.sixSpiritStartRules.find((rule) => rule.dayStemId === dayStemId);
  if (startRule === undefined) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `No six-spirit start rule exists for day stem ${dayStemId}.`,
    );
  }
  const ordered = [...ruleset.sixSpirits].sort((left, right) => left.order - right.order);
  if (ordered.length !== 6) {
    throw new ProfessionalDomainError(
      'INVALID_RULESET',
      'Six-spirit catalog must contain six items.',
    );
  }
  const startIndex = ordered.findIndex((spirit) => spirit.spiritId === startRule.startSpiritId);
  if (startIndex < 0) {
    throw new ProfessionalDomainError(
      'INVALID_RULESET',
      'Six-spirit start item is not in catalog.',
    );
  }
  return Object.freeze(
    Array.from({ length: 6 }, (_, index) => {
      const spirit = ordered[(startIndex + index) % 6];
      if (spirit === undefined) {
        throw new ProfessionalDomainError('INVALID_RULESET', 'Six-spirit sequence is incomplete.');
      }
      return Object.freeze({
        position: (index + 1) as LinePosition,
        spiritId: spirit.spiritId,
        ruleId: startRule.ruleId,
      });
    }),
  );
}

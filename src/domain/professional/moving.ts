import type { LinePosition, LineValue } from '../casting';
import { ProfessionalDomainError } from './errors';
import { resolveBranchRelations } from './relations';
import type {
  ElementLine,
  HiddenAndFlyingSpirit,
  MovingTransformation,
  ProfessionalRuleset,
} from './types';

export function resolveMovingTransformations(
  lineValues: readonly LineValue[],
  primaryLines: readonly ElementLine[],
  changedLines: readonly ElementLine[],
  ruleset: ProfessionalRuleset,
): readonly MovingTransformation[] {
  if (lineValues.length !== 6 || primaryLines.length !== 6 || changedLines.length !== 6) {
    throw new ProfessionalDomainError(
      'INVALID_INPUT',
      'Moving transformations require six original values and six primary/changed lines.',
    );
  }
  const transformations: MovingTransformation[] = [];
  for (let index = 0; index < 6; index += 1) {
    const value = lineValues[index];
    if (value !== 6 && value !== 9) continue;
    const position = (index + 1) as LinePosition;
    const primary = primaryLines.find((line) => line.position === position);
    const changed = changedLines.find((line) => line.position === position);
    if (primary === undefined || changed === undefined) {
      throw new ProfessionalDomainError(
        'INVALID_INPUT',
        `Missing transformation line ${position}.`,
      );
    }
    transformations.push(
      Object.freeze({
        position,
        originalValue: value,
        changedBranchId: changed.earthlyBranchId,
        changedElementId: changed.elementId,
        relationFacts: resolveBranchRelations(
          [changed.earthlyBranchId, primary.earthlyBranchId],
          ruleset,
        ),
      }),
    );
  }
  return Object.freeze(transformations);
}

export function resolveHiddenAndFlyingSpirits(
  hexagramId: string,
  ruleset: ProfessionalRuleset,
): readonly HiddenAndFlyingSpirit[] {
  return Object.freeze(
    ruleset.hiddenSpiritRules
      .filter((rule) => rule.hexagramId === hexagramId)
      .sort((left, right) => left.linePosition - right.linePosition)
      .map((rule) =>
        Object.freeze({
          linePosition: rule.linePosition,
          hiddenRelative: rule.hiddenRelative,
          hiddenStemId: rule.hiddenStemId,
          hiddenBranchId: rule.hiddenBranchId,
          flyingLinePosition: rule.flyingLinePosition,
          ruleId: rule.ruleId,
        }),
      ),
  );
}

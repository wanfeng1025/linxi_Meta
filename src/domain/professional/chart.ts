import { ProfessionalDomainError } from './errors';
import { evaluateLineStateFacts } from './facts';
import { resolveHiddenAndFlyingSpirits, resolveMovingTransformations } from './moving';
import { applyNajia, resolveLineElements, resolveSixRelatives } from './najia';
import { resolvePalace, resolveWorldAndResponse } from './palace';
import { resolveVoidBranches } from './relations';
import { resolveSixSpirits } from './spirits';
import type { BuildSixYaoChartInput, ChartLine, ProfessionalRuleset, SixYaoChart } from './types';
import {
  resolveOriginalSupportingAvoidingEnemyGods,
  selectUsefulGodCandidates,
} from './useful-god';

function assertIsoInstant(value: string, label: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value)) {
    throw new ProfessionalDomainError('INVALID_INPUT', `${label} must be a UTC ISO instant.`);
  }
}

function assertCalendarCompatibility(
  input: BuildSixYaoChartInput,
  ruleset: ProfessionalRuleset,
): void {
  const { calendar } = input;
  const { metadata } = ruleset;
  if (
    calendar.verificationStatus !== metadata.verificationStatus ||
    calendar.calendarAlgorithmVersion !== metadata.calendarAlgorithmVersion ||
    calendar.timezoneDataVersion !== metadata.timezoneDataVersion ||
    calendar.dayBoundaryPolicy !== metadata.dayBoundaryPolicy ||
    calendar.trueSolarTimeEnabled !== metadata.trueSolarTimeEnabled
  ) {
    throw new ProfessionalDomainError(
      'CALENDAR_VERSION_MISMATCH',
      'Chart calendar context does not match the selected professional ruleset.',
    );
  }
}

export function buildSixYaoChart(
  input: BuildSixYaoChartInput,
  ruleset: ProfessionalRuleset,
): SixYaoChart {
  assertIsoInstant(input.calculatedAt, 'calculatedAt');
  assertCalendarCompatibility(input, ruleset);

  const palace = resolvePalace(input.primaryHexagramId, ruleset);
  const worldAndResponse = resolveWorldAndResponse(input.primaryHexagramId, ruleset);
  const primaryNajia = applyNajia(
    input.primaryLowerTrigramId,
    input.primaryUpperTrigramId,
    ruleset,
  );
  const primaryElements = resolveLineElements(primaryNajia, ruleset);
  const relatives = resolveSixRelatives(palace.palaceElementId, primaryElements, ruleset);
  const spirits = resolveSixSpirits(input.calendar.dayStemId, ruleset);
  const changedElements = resolveLineElements(
    applyNajia(input.changedLowerTrigramId, input.changedUpperTrigramId, ruleset),
    ruleset,
  );
  const voidBranches = resolveVoidBranches(input.calendar.dayCycleIndex, ruleset);
  const facts = evaluateLineStateFacts(relatives, input.calendar, voidBranches, ruleset);
  const transformations = resolveMovingTransformations(
    input.lineValues,
    primaryElements,
    changedElements,
    ruleset,
  );
  const hiddenSpirits = resolveHiddenAndFlyingSpirits(input.primaryHexagramId, ruleset);
  const usefulGod = selectUsefulGodCandidates(input.question, ruleset);
  const relatedGodRoles = resolveOriginalSupportingAvoidingEnemyGods(usefulGod, ruleset);

  const lines: ChartLine[] = relatives.map((line) => {
    const lineValue = input.lineValues[line.position - 1];
    const spirit = spirits.find((candidate) => candidate.position === line.position);
    if (lineValue === undefined || spirit === undefined) {
      throw new ProfessionalDomainError(
        'INVALID_RULESET',
        `Chart line ${line.position} is incomplete.`,
      );
    }
    return Object.freeze({
      ...line,
      lineValue,
      isMoving: lineValue === 6 || lineValue === 9,
      isWorld: line.position === worldAndResponse.worldPosition,
      isResponse: line.position === worldAndResponse.responsePosition,
      sixSpiritId: spirit.spiritId,
      facts: Object.freeze(facts.filter((fact) => fact.subjectLinePosition === line.position)),
      transformation:
        transformations.find((transformation) => transformation.position === line.position) ?? null,
      hiddenSpirits: Object.freeze(
        hiddenSpirits.filter((hidden) => hidden.linePosition === line.position),
      ),
    });
  });

  const unresolvedQuestions =
    usefulGod.confidence === 'resolved'
      ? []
      : usefulGod.ambiguityReasons.map((reason) => `useful-god: ${reason}`);

  return Object.freeze({
    rulesetId: ruleset.metadata.rulesetId,
    rulesetVersion: ruleset.metadata.rulesetVersion,
    contentVersion: ruleset.metadata.contentVersion,
    calendarAlgorithmVersion: ruleset.metadata.calendarAlgorithmVersion,
    timezoneDataVersion: ruleset.metadata.timezoneDataVersion,
    timezone: input.calendar.timezone,
    calculatedAt: input.calculatedAt,
    verificationStatus: ruleset.metadata.verificationStatus,
    primaryHexagramId: input.primaryHexagramId,
    changedHexagramId: input.changedHexagramId,
    palace,
    worldAndResponse,
    calendar: input.calendar,
    voidBranches,
    lines: Object.freeze(lines),
    usefulGod,
    relatedGodRoles,
    facts,
    unresolvedQuestions: Object.freeze(unresolvedQuestions),
  });
}

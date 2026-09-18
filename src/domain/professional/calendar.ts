import { ProfessionalDomainError } from './errors';
import type {
  CalendarContext,
  CalendarInput,
  CalendarProvider,
  ProfessionalRuleset,
} from './types';

function isIsoInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(value);
}

function assertCalendarInput(input: CalendarInput, ruleset: ProfessionalRuleset): void {
  if (!isIsoInstant(input.isoInstant)) {
    throw new ProfessionalDomainError(
      'INVALID_INPUT',
      'Calendar input requires a UTC ISO instant.',
    );
  }
  if (!/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(input.timezone)) {
    throw new ProfessionalDomainError(
      'INVALID_INPUT',
      'Calendar input requires an IANA timezone name.',
    );
  }
  const metadata = ruleset.metadata;
  if (
    input.calendarAlgorithmVersion !== metadata.calendarAlgorithmVersion ||
    input.timezoneDataVersion !== metadata.timezoneDataVersion ||
    input.dayBoundaryPolicy !== metadata.dayBoundaryPolicy ||
    input.trueSolarTime.enabled !== metadata.trueSolarTimeEnabled
  ) {
    throw new ProfessionalDomainError(
      'CALENDAR_VERSION_MISMATCH',
      'Calendar input does not match the selected ruleset calendar policy and versions.',
    );
  }
  if (input.calendarPolicyId.trim().length === 0) {
    throw new ProfessionalDomainError('INVALID_INPUT', 'Calendar input requires a policy ID.');
  }
}

export async function resolveCalendarContext(
  provider: CalendarProvider,
  input: CalendarInput,
  ruleset: ProfessionalRuleset,
): Promise<CalendarContext> {
  assertCalendarInput(input, ruleset);
  const context = await provider.resolve(input);
  if (
    context.verificationStatus !== ruleset.metadata.verificationStatus ||
    context.isoInstant !== input.isoInstant ||
    context.timezone !== input.timezone ||
    context.calendarAlgorithmVersion !== input.calendarAlgorithmVersion ||
    context.timezoneDataVersion !== input.timezoneDataVersion ||
    context.dayBoundaryPolicy !== input.dayBoundaryPolicy ||
    context.trueSolarTimeEnabled !== input.trueSolarTime.enabled ||
    context.calendarPolicyId !== input.calendarPolicyId ||
    !Number.isInteger(context.dayCycleIndex) ||
    context.dayCycleIndex < 0 ||
    context.dayCycleIndex > 59 ||
    context.sourceIds.length === 0
  ) {
    throw new ProfessionalDomainError(
      'CALENDAR_VERSION_MISMATCH',
      'Calendar provider returned an unverified or version-incompatible context.',
    );
  }
  return Object.freeze({ ...context });
}

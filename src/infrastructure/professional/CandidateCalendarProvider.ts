import {
  ProfessionalDomainError,
  type CalendarContext,
  type CalendarInput,
  type CalendarProvider,
  type EarthlyBranchId,
  type HeavenlyStemId,
} from '@/domain/professional';

export type CandidateTimeZoneTransition = Readonly<{
  readonly instant: string;
  readonly offsetSecondsAfter: number;
  readonly isDstAfter: boolean;
}>;

export type CandidateTimeZoneDefinition = Readonly<{
  readonly timezone: string;
  readonly initialOffsetSeconds: number;
  readonly initialIsDst: boolean;
  readonly transitions: readonly CandidateTimeZoneTransition[];
}>;

export type CandidateSolarTerm = Readonly<{
  readonly id: string;
  readonly instant: string;
  readonly monthBranchId: EarthlyBranchId;
  readonly changesMonthBranch: boolean;
}>;

export type CandidateCalendarData = Readonly<{
  readonly policyId: string;
  readonly calendarAlgorithmVersion: string;
  readonly solarTermDataVersion: string;
  readonly timezoneDataVersion: string;
  readonly sourceIds: readonly string[];
  readonly dayGanzhiAnchor: Readonly<{
    readonly localDate: string;
    readonly cycleIndex: number;
  }>;
  /** No month assignment may be extrapolated beyond this confirmed instant. */
  readonly coverageEndInclusiveInstant: string;
  readonly solarTerms: readonly CandidateSolarTerm[];
  readonly timezones: readonly CandidateTimeZoneDefinition[];
}>;

export type CandidateLocalDateTimeResolution = Readonly<{
  readonly resolution: 'UNIQUE' | 'AMBIGUOUS' | 'NONEXISTENT';
  readonly instants: readonly string[];
}>;

const heavenlyStems: readonly HeavenlyStemId[] = [
  'stem-jia',
  'stem-yi',
  'stem-bing',
  'stem-ding',
  'stem-wu',
  'stem-ji',
  'stem-geng',
  'stem-xin',
  'stem-ren',
  'stem-gui',
];

const earthlyBranches: readonly EarthlyBranchId[] = [
  'branch-zi',
  'branch-chou',
  'branch-yin',
  'branch-mao',
  'branch-chen',
  'branch-si',
  'branch-wu',
  'branch-wei',
  'branch-shen',
  'branch-you',
  'branch-xu',
  'branch-hai',
];

const voidPairs: readonly (readonly [EarthlyBranchId, EarthlyBranchId])[] = [
  ['branch-xu', 'branch-hai'],
  ['branch-shen', 'branch-you'],
  ['branch-wu', 'branch-wei'],
  ['branch-chen', 'branch-si'],
  ['branch-yin', 'branch-mao'],
  ['branch-zi', 'branch-chou'],
];

const isoInstantPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const localDateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

function floorModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function parseIsoInstant(value: string): number {
  if (!isoInstantPattern.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ProfessionalDomainError('INVALID_INPUT', `Invalid UTC ISO instant: ${value}.`);
  }
  return Date.parse(value);
}

function formatIsoInstant(value: number): string {
  return new Date(value).toISOString().replace('.000Z', 'Z');
}

function formatDate(value: Date): string {
  return `${value.getUTCFullYear().toString().padStart(4, '0')}-${(value.getUTCMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getUTCDate().toString().padStart(2, '0')}`;
}

function formatOffset(offsetSeconds: number): string {
  const absolute = Math.abs(offsetSeconds);
  const hours = Math.floor(absolute / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((absolute % 3600) / 60)
    .toString()
    .padStart(2, '0');
  return `${offsetSeconds >= 0 ? '+' : '-'}${hours}:${minutes}`;
}

function civilDateNumber(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new ProfessionalDomainError('INVALID_INPUT', `Invalid civil date: ${date}.`);
  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day)) / 86_400_000;
}

function parseLocalDateTime(value: string): number {
  const match = localDateTimePattern.exec(value);
  if (!match) {
    throw new ProfessionalDomainError(
      'INVALID_INPUT',
      'Local datetime must use YYYY-MM-DDTHH:mm:ss without an offset.',
    );
  }
  const [, year, month, day, hour, minute, second] = match;
  return Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
}

function lookupTimeZone(
  data: CandidateCalendarData,
  timezone: string,
): CandidateTimeZoneDefinition {
  const entry = data.timezones.find((item) => item.timezone === timezone);
  if (!entry) {
    throw new ProfessionalDomainError(
      'INVALID_INPUT',
      `Candidate calendar data does not support timezone ${timezone}.`,
    );
  }
  return entry;
}

function resolveOffset(
  definition: CandidateTimeZoneDefinition,
  instantMilliseconds: number,
): Readonly<{ offsetSeconds: number; isDst: boolean }> {
  let offsetSeconds = definition.initialOffsetSeconds;
  let isDst = definition.initialIsDst;
  for (const transition of definition.transitions) {
    if (instantMilliseconds < parseIsoInstant(transition.instant)) break;
    offsetSeconds = transition.offsetSecondsAfter;
    isDst = transition.isDstAfter;
  }
  return { offsetSeconds, isDst };
}

function resolveFold(
  definition: CandidateTimeZoneDefinition,
  instantMilliseconds: number,
  localMilliseconds: number,
): 0 | 1 | null {
  const candidates = new Set<number>([
    definition.initialOffsetSeconds,
    ...definition.transitions.map((transition) => transition.offsetSecondsAfter),
  ]);
  const matching = [...candidates]
    .map((offsetSeconds) => localMilliseconds - offsetSeconds * 1000)
    .filter((candidate) => {
      const resolved = resolveOffset(definition, candidate);
      return candidate + resolved.offsetSeconds * 1000 === localMilliseconds;
    })
    .sort((left, right) => left - right);
  if (matching.length !== 2) return null;
  return matching[1] === instantMilliseconds ? 1 : 0;
}

function resolveMonthContext(
  data: CandidateCalendarData,
  instantMilliseconds: number,
): Readonly<{
  monthBranchId: EarthlyBranchId;
  solarTermId: string | null;
  solarTermBoundaryInstant: string | null;
  previousMonthBoundaryInstant: string | null;
  nextMonthBoundaryInstant: string | null;
}> {
  if (instantMilliseconds > parseIsoInstant(data.coverageEndInclusiveInstant)) {
    throw new ProfessionalDomainError(
      'CALENDAR_VERSION_MISMATCH',
      'Candidate calendar package has no confirmed month-boundary coverage for this instant.',
    );
  }
  const ordered = [...data.solarTerms].sort(
    (left, right) => parseIsoInstant(left.instant) - parseIsoInstant(right.instant),
  );
  const currentIndex = ordered.findLastIndex(
    (term) => parseIsoInstant(term.instant) <= instantMilliseconds,
  );

  if (currentIndex < 0) {
    const first = ordered[0];
    if (!first || first.id !== 'solar-term-xiaohan-2026') {
      throw new ProfessionalDomainError(
        'CALENDAR_VERSION_MISMATCH',
        'Candidate calendar package lacks a confirmed pre-boundary month assignment.',
      );
    }
    return {
      monthBranchId: 'branch-zi',
      solarTermId: null,
      solarTermBoundaryInstant: null,
      previousMonthBoundaryInstant: null,
      nextMonthBoundaryInstant: first.instant,
    };
  }

  const current = ordered[currentIndex];
  if (!current) throw new ProfessionalDomainError('INVALID_INPUT', 'Missing candidate solar term.');
  const previousMonthBoundary = [...ordered]
    .slice(0, currentIndex + 1)
    .reverse()
    .find((term) => term.changesMonthBranch);
  const nextMonthBoundary = ordered.slice(currentIndex + 1).find((term) => term.changesMonthBranch);
  return {
    monthBranchId: current.monthBranchId,
    solarTermId: current.id,
    solarTermBoundaryInstant: current.instant,
    previousMonthBoundaryInstant: previousMonthBoundary?.instant ?? null,
    nextMonthBoundaryInstant: nextMonthBoundary?.instant ?? null,
  };
}

/**
 * Offline provider for the explicitly bounded candidate package. It never reads the host
 * timezone and exposes absent source boundaries as null instead of extrapolating them.
 */
export class CandidateCalendarProvider implements CalendarProvider {
  public constructor(private readonly data: CandidateCalendarData) {}

  public resolveLocalDateTime(
    timezone: string,
    localDateTime: string,
  ): CandidateLocalDateTimeResolution {
    const definition = lookupTimeZone(this.data, timezone);
    const localMilliseconds = parseLocalDateTime(localDateTime);
    const offsets = new Set<number>([
      definition.initialOffsetSeconds,
      ...definition.transitions.map((transition) => transition.offsetSecondsAfter),
    ]);
    const instants = [...offsets]
      .map((offsetSeconds) => localMilliseconds - offsetSeconds * 1000)
      .filter((instant) => {
        const resolved = resolveOffset(definition, instant);
        return instant + resolved.offsetSeconds * 1000 === localMilliseconds;
      })
      .sort((left, right) => left - right)
      .map(formatIsoInstant);
    return Object.freeze({
      resolution:
        instants.length === 0 ? 'NONEXISTENT' : instants.length === 1 ? 'UNIQUE' : 'AMBIGUOUS',
      instants: Object.freeze(instants),
    });
  }

  public async resolve(input: CalendarInput): Promise<CalendarContext> {
    if (
      input.calendarPolicyId !== this.data.policyId ||
      input.calendarAlgorithmVersion !== this.data.calendarAlgorithmVersion ||
      input.timezoneDataVersion !== this.data.timezoneDataVersion
    ) {
      throw new ProfessionalDomainError(
        'CALENDAR_VERSION_MISMATCH',
        'Candidate calendar input does not match its declared data package.',
      );
    }
    const instantMilliseconds = parseIsoInstant(input.isoInstant);
    const timezone = lookupTimeZone(this.data, input.timezone);
    const offset = resolveOffset(timezone, instantMilliseconds);
    const local = new Date(instantMilliseconds + offset.offsetSeconds * 1000);
    const localDate = formatDate(local);
    const localMilliseconds = instantMilliseconds + offset.offsetSeconds * 1000;
    const dayCycleIndex = floorModulo(
      this.data.dayGanzhiAnchor.cycleIndex +
        civilDateNumber(localDate) -
        civilDateNumber(this.data.dayGanzhiAnchor.localDate),
      60,
    );
    const month = resolveMonthContext(this.data, instantMilliseconds);
    const localTime = `${local.getUTCHours().toString().padStart(2, '0')}:${local
      .getUTCMinutes()
      .toString()
      .padStart(2, '0')}:${local.getUTCSeconds().toString().padStart(2, '0')}`;
    const xunIndex = Math.floor(dayCycleIndex / 10);

    return Object.freeze({
      isoInstant: input.isoInstant,
      timezone: input.timezone,
      localDateTime: `${localDate}T${localTime}${formatOffset(offset.offsetSeconds)}`,
      localDate,
      utcOffsetSeconds: offset.offsetSeconds,
      isDst: offset.isDst,
      fold: resolveFold(timezone, instantMilliseconds, localMilliseconds),
      localTimeResolution: 'UNIQUE',
      monthBranchId: month.monthBranchId,
      dayStemId: heavenlyStems[dayCycleIndex % 10] as HeavenlyStemId,
      dayBranchId: earthlyBranches[dayCycleIndex % 12] as EarthlyBranchId,
      dayCycleIndex,
      solarTermId: month.solarTermId,
      solarTermBoundaryInstant: month.solarTermBoundaryInstant,
      previousMonthBoundaryInstant: month.previousMonthBoundaryInstant,
      nextMonthBoundaryInstant: month.nextMonthBoundaryInstant,
      xunId: `xun-${xunIndex}`,
      voidBranches: voidPairs[xunIndex] as readonly [EarthlyBranchId, EarthlyBranchId],
      calendarPolicyId: this.data.policyId,
      calendarAlgorithmVersion: this.data.calendarAlgorithmVersion,
      solarTermDataVersion: this.data.solarTermDataVersion,
      timezoneDataVersion: this.data.timezoneDataVersion,
      dayBoundaryPolicy: input.dayBoundaryPolicy,
      trueSolarTimeEnabled: input.trueSolarTime.enabled,
      sourceIds: this.data.sourceIds,
      verificationStatus: 'production_candidate',
    });
  }
}

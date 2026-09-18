import { describe, expect, it } from 'vitest';

import type { CalendarInput } from '../../src/domain/professional';
import {
  CandidateCalendarProvider,
  type CandidateCalendarData,
} from '../../src/infrastructure/professional/CandidateCalendarProvider';

const data: CandidateCalendarData = {
  policyId: 'civil_midnight_solar_terms_tzdb2026c',
  calendarAlgorithmVersion: '1.0.0-candidate.1',
  solarTermDataVersion: 'hko-2026-candidate.1',
  timezoneDataVersion: 'tzdb-2026c-candidate',
  sourceIds: [
    'SOURCE-HKO-TERMS',
    'SOURCE-HKO-ALMANAC-2026',
    'SOURCE-HKO-GANZHI',
    'SOURCE-IANA-TZDB',
  ],
  dayGanzhiAnchor: { localDate: '2026-01-01', cycleIndex: 11 },
  coverageEndInclusiveInstant: '2026-02-18T15:52:00Z',
  solarTerms: [
    {
      id: 'solar-term-xiaohan-2026',
      instant: '2026-01-05T08:23:00Z',
      monthBranchId: 'branch-chou',
      changesMonthBranch: true,
    },
    {
      id: 'solar-term-lichun-2026',
      instant: '2026-02-03T20:02:00Z',
      monthBranchId: 'branch-yin',
      changesMonthBranch: true,
    },
    {
      id: 'solar-term-yushui-2026',
      instant: '2026-02-18T15:52:00Z',
      monthBranchId: 'branch-yin',
      changesMonthBranch: false,
    },
  ],
  timezones: [
    {
      timezone: 'Asia/Hong_Kong',
      initialOffsetSeconds: 28800,
      initialIsDst: false,
      transitions: [],
    },
    {
      timezone: 'Asia/Shanghai',
      initialOffsetSeconds: 28800,
      initialIsDst: false,
      transitions: [],
    },
    {
      timezone: 'America/Los_Angeles',
      initialOffsetSeconds: -28800,
      initialIsDst: false,
      transitions: [
        { instant: '2026-03-08T10:00:00Z', offsetSecondsAfter: -25200, isDstAfter: true },
        { instant: '2026-11-01T09:00:00Z', offsetSecondsAfter: -28800, isDstAfter: false },
      ],
    },
    {
      timezone: 'Europe/London',
      initialOffsetSeconds: 0,
      initialIsDst: false,
      transitions: [
        { instant: '2026-03-29T01:00:00Z', offsetSecondsAfter: 3600, isDstAfter: true },
        { instant: '2026-10-25T01:00:00Z', offsetSecondsAfter: 0, isDstAfter: false },
      ],
    },
  ],
};

const baseInput: Omit<CalendarInput, 'isoInstant' | 'timezone'> = {
  calendarPolicyId: data.policyId,
  calendarAlgorithmVersion: data.calendarAlgorithmVersion,
  timezoneDataVersion: data.timezoneDataVersion,
  dayBoundaryPolicy: 'civil-midnight',
  trueSolarTime: { enabled: false },
};

describe('CandidateCalendarProvider', () => {
  const provider = new CandidateCalendarProvider(data);

  it('uses the supplied HKO anchor and solar-term instant, not a Gregorian month', async () => {
    const before = await provider.resolve({
      ...baseInput,
      isoInstant: '2026-02-03T20:01:59Z',
      timezone: 'Asia/Hong_Kong',
    });
    const after = await provider.resolve({
      ...baseInput,
      isoInstant: '2026-02-03T20:02:00Z',
      timezone: 'Asia/Hong_Kong',
    });

    expect(before.localDateTime).toBe('2026-02-04T04:01:59+08:00');
    expect(before.dayCycleIndex).toBe(45);
    expect(before.monthBranchId).toBe('branch-chou');
    expect(after.monthBranchId).toBe('branch-yin');
    expect(after.solarTermId).toBe('solar-term-lichun-2026');
  });

  it('keeps 雨水 within the already-confirmed 寅 month and returns absent future boundaries as null', async () => {
    const context = await provider.resolve({
      ...baseInput,
      isoInstant: '2026-02-18T15:52:00Z',
      timezone: 'Asia/Hong_Kong',
    });
    expect(context.monthBranchId).toBe('branch-yin');
    expect(context.dayCycleIndex).toBe(59);
    expect(context.voidBranches).toEqual(['branch-zi', 'branch-chou']);
    expect(context.nextMonthBoundaryInstant).toBeNull();
  });

  it.each([
    ['America/Los_Angeles', '2026-03-08T02:30:00', 'NONEXISTENT', []],
    [
      'America/Los_Angeles',
      '2026-11-01T01:30:00',
      'AMBIGUOUS',
      ['2026-11-01T08:30:00Z', '2026-11-01T09:30:00Z'],
    ],
    ['Europe/London', '2026-03-29T01:30:00', 'NONEXISTENT', []],
    [
      'Europe/London',
      '2026-10-25T01:30:00',
      'AMBIGUOUS',
      ['2026-10-25T00:30:00Z', '2026-10-25T01:30:00Z'],
    ],
    ['Asia/Shanghai', '2026-03-08T02:30:00', 'UNIQUE', ['2026-03-07T18:30:00Z']],
  ] as const)(
    'resolves DST local-time case %s %s',
    (timezone, localDateTime, resolution, instants) => {
      expect(provider.resolveLocalDateTime(timezone, localDateTime)).toEqual({
        resolution,
        instants,
      });
    },
  );

  it('rejects a mismatched candidate policy instead of silently falling back', async () => {
    await expect(
      provider.resolve({
        ...baseInput,
        calendarPolicyId: 'wrong-policy',
        isoInstant: '2026-01-05T08:23:00Z',
        timezone: 'Asia/Hong_Kong',
      }),
    ).rejects.toMatchObject({ code: 'CALENDAR_VERSION_MISMATCH' });
  });

  it('refuses to extrapolate month construction past the confirmed candidate range', async () => {
    await expect(
      provider.resolve({
        ...baseInput,
        isoInstant: '2026-02-18T15:52:01Z',
        timezone: 'Asia/Hong_Kong',
      }),
    ).rejects.toMatchObject({ code: 'CALENDAR_VERSION_MISMATCH' });
  });
});

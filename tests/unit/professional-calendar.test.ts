import { describe, expect, it } from 'vitest';
import {
  ProfessionalDomainError,
  resolveCalendarContext,
  type CalendarInput,
  type CalendarProvider,
} from '../../src/domain/professional';
import {
  calendarContextFixture,
  createProfessionalRulesetFixture,
} from '../fixtures/professional-ruleset.fixture';

const input: CalendarInput = {
  isoInstant: '2026-07-20T08:00:00Z',
  timezone: 'Asia/Shanghai',
  calendarPolicyId: 'synthetic-calendar-policy',
  calendarAlgorithmVersion: 'fixed-calendar-test.1',
  timezoneDataVersion: 'synthetic-tzdb-test.1',
  dayBoundaryPolicy: 'civil-midnight',
  trueSolarTime: { enabled: false },
};

describe('calendar provider boundary', () => {
  const ruleset = createProfessionalRulesetFixture();

  it('accepts an explicit, verified and version-compatible calendar result', async () => {
    const provider: CalendarProvider = { resolve: async () => calendarContextFixture };
    await expect(resolveCalendarContext(provider, input, ruleset)).resolves.toEqual(
      calendarContextFixture,
    );
  });

  it('rejects implicit offsets and incompatible calendar versions', async () => {
    const provider: CalendarProvider = { resolve: async () => calendarContextFixture };
    await expect(
      resolveCalendarContext(provider, { ...input, timezone: 'UTC+8' }, ruleset),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' } satisfies Partial<ProfessionalDomainError>);
    await expect(
      resolveCalendarContext(
        provider,
        { ...input, calendarAlgorithmVersion: 'another-calendar' },
        ruleset,
      ),
    ).rejects.toMatchObject({
      code: 'CALENDAR_VERSION_MISMATCH',
    } satisfies Partial<ProfessionalDomainError>);
  });
});

import { describe, expect, it } from 'vitest';
import { buildSixYaoChart, selectUsefulGodCandidates } from '../../src/domain/professional';
import {
  calendarContextFixture,
  createProfessionalRulesetFixture,
  questionContextFixture,
} from '../fixtures/professional-ruleset.fixture';

describe('professional chart aggregation', () => {
  const ruleset = createProfessionalRulesetFixture();

  it('builds a versioned, bottom-to-top chart with structured evidence only', () => {
    const chart = buildSixYaoChart(
      {
        primaryHexagramId: 'hex-primary',
        changedHexagramId: 'hex-changed',
        primaryLowerTrigramId: 'trigram-lower',
        primaryUpperTrigramId: 'trigram-upper',
        changedLowerTrigramId: 'trigram-lower',
        changedUpperTrigramId: 'trigram-upper',
        lineValues: [7, 8, 9, 8, 7, 6],
        calendar: calendarContextFixture,
        question: questionContextFixture,
        calculatedAt: '2026-07-20T08:00:01Z',
      },
      ruleset,
    );

    expect(chart).toMatchObject({
      rulesetId: 'synthetic-professional-test',
      rulesetVersion: '0.0.0-test.1',
      contentVersion: 'synthetic-content-test.1',
      calendarAlgorithmVersion: 'fixed-calendar-test.1',
      timezone: 'Asia/Shanghai',
      calculatedAt: '2026-07-20T08:00:01Z',
      verificationStatus: 'test-only',
    });
    expect(chart.lines.map((line) => line.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chart.lines.filter((line) => line.isMoving).map((line) => line.position)).toEqual([
      3, 6,
    ]);
    expect(chart.lines.find((line) => line.position === 6)).toMatchObject({ isWorld: true });
    expect(chart.lines.find((line) => line.position === 3)).toMatchObject({ isResponse: true });
    expect(chart.lines.find((line) => line.position === 4)?.hiddenSpirits).toHaveLength(1);
    expect(chart.lines.find((line) => line.position === 1)?.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ factType: 'MONTH_BREAK' })]),
    );
    expect(chart.lines.find((line) => line.position === 5)?.facts).toEqual(
      expect.arrayContaining([expect.objectContaining({ factType: 'VOID' })]),
    );
    expect(chart.usefulGod.selected).toMatchObject({ relative: 'official', role: 'primary' });
    expect(chart.relatedGodRoles).toMatchObject({ supportingGod: 'wealth' });
    expect(chart).not.toHaveProperty('interpretationText');
  });

  it('reports useful-god insufficiency instead of inventing a unique answer', () => {
    const result = selectUsefulGodCandidates(
      { ...questionContextFixture, questionCategory: 'unknown', contextTags: [] },
      ruleset,
    );
    expect(result).toMatchObject({
      selected: null,
      confidence: 'insufficient-context',
    });
  });
});

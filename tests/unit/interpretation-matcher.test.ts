import { describe, expect, it } from 'vitest';

import {
  matchInterpretationRules,
  parseInterpretationInput,
  parseInterpretationRuleset,
  runDeterministicInterpretation,
} from '../../src/domain/interpretation';
import {
  createSyntheticInterpretationInput,
  createSyntheticInterpretationRuleset,
  syntheticRule,
} from '../fixtures/interpretation-ruleset.fixture';

describe('deterministic interpretation matcher', () => {
  it('returns matches, misses, evidence and a stable execution order', () => {
    const input = parseInterpretationInput(createSyntheticInterpretationInput());
    const ruleset = parseInterpretationRuleset(createSyntheticInterpretationRuleset());
    const result = matchInterpretationRules(input, ruleset);

    expect(result.executionOrder).toEqual([
      'synthetic-current-regret',
      'synthetic-later-auspicious',
      'synthetic-low-inauspicious',
    ]);
    expect(result.matchedRules).toHaveLength(3);
    expect(result.unmatchedRules).toHaveLength(0);
    expect(result.matchedRules[0]?.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'question.category',
          operator: 'equals',
          actual: 'career',
          satisfied: true,
        }),
      ]),
    );

    const health = matchInterpretationRules(
      parseInterpretationInput(createSyntheticInterpretationInput('health')),
      ruleset,
    );
    expect(health.matchedRules).toHaveLength(0);
    expect(health.unmatchedRules.every((rule) => rule.status === 'not-matched')).toBe(true);
    expect(health.unmatchedRules[0]?.evidence.some((evidence) => !evidence.satisfied)).toBe(true);
  });

  it('implements every whitelisted predicate without dynamic code execution', () => {
    const inputValue = createSyntheticInterpretationInput();
    const input = parseInterpretationInput({
      ...inputValue,
      professionalChart: {
        ...inputValue.professionalChart,
        score: 8,
        tags: ['reviewed', 'bounded'],
      },
      calendarContext: { ...inputValue.calendarContext, dayCycleIndex: 12 },
    });
    const base = createSyntheticInterpretationRuleset();
    const rule = syntheticRule('operator-coverage', 1, [
      {
        effectId: 'operator-fact',
        slot: 'operator-fact',
        kind: 'fact',
        factType: 'operator-coverage',
        value: true,
        polarity: 'neutral',
      },
    ]);
    const ruleset = parseInterpretationRuleset({
      ...base,
      availableFields: [
        ...base.availableFields,
        'professional.score',
        'professional.tags',
        'calendar.dayCycleIndex',
      ],
      rules: [
        {
          ...rule,
          requiredFields: [
            'question.category',
            'question.subject',
            'casting.movingPositions',
            'professional.score',
            'professional.tags',
            'calendar.dayCycleIndex',
          ],
          conditions: {
            kind: 'group',
            combinator: 'all',
            conditions: [
              {
                kind: 'group',
                combinator: 'any',
                conditions: [
                  {
                    kind: 'predicate',
                    field: 'question.category',
                    operator: 'equals',
                    value: 'study',
                  },
                  {
                    kind: 'predicate',
                    field: 'question.category',
                    operator: 'equals',
                    value: 'career',
                  },
                ],
              },
              { kind: 'predicate', field: 'question.subject', operator: 'contains', value: 'sel' },
              {
                kind: 'predicate',
                field: 'casting.movingPositions',
                operator: 'contains',
                value: 3,
              },
              {
                kind: 'predicate',
                field: 'professional.score',
                operator: 'greater-than',
                value: 7,
              },
              {
                kind: 'predicate',
                field: 'professional.score',
                operator: 'greater-than-or-equal',
                value: 8,
              },
              {
                kind: 'predicate',
                field: 'calendar.dayCycleIndex',
                operator: 'less-than',
                value: 13,
              },
              {
                kind: 'predicate',
                field: 'calendar.dayCycleIndex',
                operator: 'less-than-or-equal',
                value: 12,
              },
              {
                kind: 'predicate',
                field: 'professional.tags',
                operator: 'intersects',
                value: ['missing', 'bounded'],
              },
              { kind: 'predicate', field: 'question.subject', operator: 'exists' },
              { kind: 'predicate', field: 'question.optionalMarker', operator: 'not-exists' },
            ],
          },
        },
      ],
    });
    const result = matchInterpretationRules(input, ruleset);
    expect(result.matchedRules).toHaveLength(1);
    expect(result.matchedRules[0]?.evidence).toHaveLength(12);
    expect(result.matchedRules[0]?.evidence.filter((evidence) => evidence.satisfied)).toHaveLength(
      11,
    );
  });

  it('reports disabled rules and missing required fields as unmet states', () => {
    const input = parseInterpretationInput(createSyntheticInterpretationInput());
    const base = createSyntheticInterpretationRuleset();
    const enabled = base.rules[0];
    expect(enabled).toBeDefined();
    if (enabled === undefined) return;
    const ruleset = parseInterpretationRuleset({
      ...base,
      rules: [
        { ...enabled, ruleId: 'disabled-rule', status: 'disabled' },
        {
          ...enabled,
          ruleId: 'missing-field-rule',
          preconditions: {
            kind: 'group',
            combinator: 'all',
            conditions: [
              { kind: 'predicate', field: 'question.optionalMarker', operator: 'exists' },
            ],
          },
          conditions: {
            kind: 'group',
            combinator: 'all',
            conditions: [
              {
                kind: 'predicate',
                field: 'question.category',
                operator: 'equals',
                value: 'career',
              },
            ],
          },
          requiredFields: ['question.optionalMarker', 'question.category'],
        },
      ],
    });
    const result = matchInterpretationRules(input, ruleset);
    expect(result.unmatchedRules.map(({ status }) => status).sort()).toEqual([
      'disabled',
      'missing-required-field',
    ]);
    expect(result.unmatchedRules.find(({ rule }) => rule.ruleId === 'missing-field-rule')).toEqual(
      expect.objectContaining({ missingFields: ['question.optionalMarker'] }),
    );
  });

  it('produces deeply equal output for the same input and ruleset version', () => {
    const request = {
      input: createSyntheticInterpretationInput(),
      ruleset: createSyntheticInterpretationRuleset(),
    };
    expect(runDeterministicInterpretation(request)).toEqual(
      runDeterministicInterpretation(request),
    );
  });
});

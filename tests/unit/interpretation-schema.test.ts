import { describe, expect, it } from 'vitest';

import {
  interpretationRulesetSchema,
  parseInterpretationRuleset,
} from '../../src/domain/interpretation';
import {
  createSyntheticInterpretationRuleset,
  syntheticRule,
} from '../fixtures/interpretation-ruleset.fixture';

describe('interpretation rule DSL schema', () => {
  it('accepts the versioned synthetic ruleset', () => {
    const ruleset = createSyntheticInterpretationRuleset();
    expect(parseInterpretationRuleset(ruleset)).toEqual(ruleset);
  });

  it('rejects operators outside the whitelist instead of executing expressions', () => {
    const ruleset = createSyntheticInterpretationRuleset();
    const first = ruleset.rules[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const unsafe = {
      ...ruleset,
      rules: [
        {
          ...first,
          conditions: {
            kind: 'group',
            combinator: 'all',
            conditions: [
              {
                kind: 'predicate',
                field: 'question.category',
                operator: 'eval',
                value: 'process.exit(1)',
              },
            ],
          },
        },
      ],
    };
    expect(interpretationRulesetSchema.safeParse(unsafe).success).toBe(false);
  });

  it('rejects unsafe paths, mixed versions and duplicate conflict declarations', () => {
    const ruleset = createSyntheticInterpretationRuleset();
    expect(
      interpretationRulesetSchema.safeParse({
        ...ruleset,
        availableFields: [...ruleset.availableFields, 'question.__proto__.polluted'],
      }).success,
    ).toBe(false);

    const left = syntheticRule('conflict-left', 10, [
      {
        effectId: 'left-fact',
        slot: 'fact-slot',
        kind: 'fact',
        factType: 'left',
        value: true,
        polarity: 'neutral',
      },
    ]);
    const right = syntheticRule('conflict-right', 9, [
      {
        effectId: 'right-fact',
        slot: 'fact-slot',
        kind: 'fact',
        factType: 'right',
        value: true,
        polarity: 'neutral',
      },
    ]);
    const duplicated = {
      ...ruleset,
      rules: [
        {
          ...left,
          conflictRules: [
            { withRuleId: right.ruleId, resolution: 'coexist', reason: 'Synthetic coexist.' },
          ],
        },
        {
          ...right,
          conflictRules: [
            { withRuleId: left.ruleId, resolution: 'coexist', reason: 'Duplicated pair.' },
          ],
        },
      ],
    };
    expect(interpretationRulesetSchema.safeParse(duplicated).success).toBe(false);
    expect(
      interpretationRulesetSchema.safeParse({
        ...ruleset,
        rules: [{ ...ruleset.rules[0], rulesetVersion: 'another-version' }],
      }).success,
    ).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { runDeterministicInterpretation } from '../../src/domain/interpretation';
import {
  createSyntheticInterpretationInput,
  createSyntheticInterpretationRuleset,
  outcome,
  syntheticRule,
} from '../fixtures/interpretation-ruleset.fixture';

describe('interpretation priority and conflict semantics', () => {
  it('uses priority and the declared same-priority weight strategy for exclusive groups', () => {
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: createSyntheticInterpretationRuleset(),
    });
    expect(output.analysis.resolution.acceptedRules.map(({ rule }) => rule.ruleId)).toEqual([
      'synthetic-current-regret',
      'synthetic-later-auspicious',
    ]);
    expect(output.analysis.resolution.excludedRules).toContainEqual(
      expect.objectContaining({
        ruleId: 'synthetic-low-inauspicious',
        reason: 'exclusive-group',
        byRuleId: 'synthetic-current-regret',
      }),
    );

    const base = createSyntheticInterpretationRuleset();
    const light = syntheticRule(
      'same-priority-a-light',
      10,
      [outcome('light-outcome', 'same-slot', 'regret', 'overall', 0)],
      { exclusiveGroup: 'same-priority-group', weight: 1 },
    );
    const heavy = syntheticRule(
      'same-priority-z-heavy',
      10,
      [outcome('heavy-outcome', 'same-slot', 'auspicious', 'overall', 0)],
      { exclusiveGroup: 'same-priority-group', weight: 10 },
    );
    const weighted = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: { ...base, rules: [light, heavy] },
    });
    expect(weighted.analysis.match.executionOrder).toEqual([
      'same-priority-z-heavy',
      'same-priority-a-light',
    ]);
    expect(weighted.analysis.resolution.acceptedRules[0]?.rule.ruleId).toBe(
      'same-priority-z-heavy',
    );
  });

  it('records an explicit lower-priority override instead of silently dropping either rule', () => {
    const base = createSyntheticInterpretationRuleset();
    const high = syntheticRule('explicit-high', 100, [
      outcome('explicit-high-outcome', 'explicit-slot', 'inauspicious', 'overall', 0),
    ]);
    const override = syntheticRule('explicit-override', 10, [
      outcome('explicit-override-outcome', 'explicit-slot', 'danger', 'overall', 0, [
        'without-blame',
      ]),
    ]);
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: {
        ...base,
        rules: [
          high,
          {
            ...override,
            conflictRules: [
              {
                withRuleId: high.ruleId,
                resolution: 'override-target',
                reason: 'Synthetic exception is explicitly scoped to override the general rule.',
              },
            ],
          },
        ],
      },
    });

    expect(output.analysis.resolution.acceptedRules[0]?.rule.ruleId).toBe('explicit-override');
    expect(output.analysis.resolution.excludedRules).toContainEqual(
      expect.objectContaining({ ruleId: 'explicit-high', byRuleId: 'explicit-override' }),
    );
    expect(output.analysis.resolution.conflicts).toContainEqual(
      expect.objectContaining({
        kind: 'explicit',
        resolution: 'override-target',
        winnerRuleId: 'explicit-override',
      }),
    );
  });

  it('preserves an undeclared semantic conflict and makes the final slot undetermined', () => {
    const base = createSyntheticInterpretationRuleset();
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: {
        ...base,
        rules: [
          syntheticRule('semantic-a', 10, [
            outcome('semantic-a-outcome', 'semantic-slot', 'auspicious', 'overall', 0),
          ]),
          syntheticRule('semantic-b', 10, [
            outcome('semantic-b-outcome', 'semantic-slot', 'inauspicious', 'overall', 0),
          ]),
        ],
      },
    });

    expect(output.analysis.resolution.acceptedRules).toHaveLength(2);
    expect(output.analysis.resolution.conflicts).toContainEqual(
      expect.objectContaining({
        kind: 'semantic-slot',
        resolution: 'unresolved-preserved',
        winnerRuleId: null,
      }),
    );
    expect(output.analysis.outcome[0]).toEqual(
      expect.objectContaining({
        primarySymbol: 'undetermined',
        ruleIds: ['semantic-a', 'semantic-b'],
      }),
    );
  });

  it('turns conflicting trend facts into information-insufficient with a conflict record', () => {
    const base = createSyntheticInterpretationRuleset();
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: {
        ...base,
        rules: [
          syntheticRule('trend-a', 10, [
            {
              effectId: 'trend-a-effect',
              slot: 'trend-current',
              kind: 'trend',
              trend: 'gradual',
            },
          ]),
          syntheticRule('trend-b', 9, [
            {
              effectId: 'trend-b-effect',
              slot: 'trend-later',
              kind: 'trend',
              trend: 'prosperity-to-decline',
            },
          ]),
        ],
      },
    });

    expect(output.analysis.trend.value).toBe('insufficient-information');
    expect(output.analysis.trend.conflictIds).toHaveLength(1);
    expect(output.analysis.resolution.conflicts[0]).toEqual(
      expect.objectContaining({ kind: 'semantic-slot', resolution: 'unresolved-preserved' }),
    );
  });
});

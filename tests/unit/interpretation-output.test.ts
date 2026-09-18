import { describe, expect, it } from 'vitest';

import {
  categoryTemplateSchema,
  getBuiltinCategoryTemplate,
  runDeterministicInterpretation,
} from '../../src/domain/interpretation';
import {
  createSyntheticInterpretationInput,
  createSyntheticInterpretationRuleset,
  outcome,
  syntheticRule,
} from '../fixtures/interpretation-ruleset.fixture';

describe('interpretation outcomes, trends, templates and rationale', () => {
  it('provides local templates for every required category', () => {
    const categories = [
      'career',
      'job-search',
      'study',
      'wealth',
      'cooperation',
      'relationship',
      'marriage',
      'travel',
      'lost-property',
      'health',
      'dispute',
      'general-decision',
    ] as const;
    expect(categories.map((category) => getBuiltinCategoryTemplate(category).category)).toEqual(
      categories,
    );
  });

  it('keeps staged symbols non-linear and produces the synthetic golden snapshot', () => {
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(),
      ruleset: createSyntheticInterpretationRuleset(),
    });

    expect({
      capability: output.analysis.capability,
      outcomes: output.analysis.outcome.map((assessment) => ({
        primary: assessment.primarySymbol,
        auxiliary: assessment.auxiliarySymbols,
        phase: assessment.phase,
        sequence: assessment.sequence,
        rules: assessment.ruleIds,
      })),
      trend: output.analysis.trend.value,
      excluded: output.analysis.resolution.excludedRules.map((rule) => ({
        ruleId: rule.ruleId,
        reason: rule.reason,
        by: rule.byRuleId,
      })),
      brief: output.presentation.brief,
    }).toMatchInlineSnapshot(`
      {
        "brief": "事业：先吝，后吉，兼见利；趋势：先难后易。本结果是基于版本化规则的文化解释与决策参考，不构成结果保证；重要决定请结合现实证据和专业意见。",
        "capability": "available",
        "excluded": [
          {
            "by": "synthetic-current-regret",
            "reason": "exclusive-group",
            "ruleId": "synthetic-low-inauspicious",
          },
        ],
        "outcomes": [
          {
            "auxiliary": [],
            "phase": "current",
            "primary": "regret",
            "rules": [
              "synthetic-current-regret",
            ],
            "sequence": 1,
          },
          {
            "auxiliary": [
              "beneficial",
            ],
            "phase": "later",
            "primary": "auspicious",
            "rules": [
              "synthetic-later-auspicious",
            ],
            "sequence": 2,
          },
        ],
        "trend": "hard-then-easy",
      }
    `);
    expect(output.presentation.classicalStyle.disclaimer).toContain('不是古籍原文');
  });

  it('expresses danger-without-blame and conditional results without a linear score', () => {
    const base = createSyntheticInterpretationRuleset();
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput('travel'),
      ruleset: {
        ...base,
        rules: [
          syntheticRule(
            'danger-without-blame',
            100,
            [
              outcome('danger-without-blame-effect', 'outcome-overall', 'danger', 'overall', 0, [
                'without-blame',
              ]),
              {
                effectId: 'danger-to-safety-trend',
                slot: 'trend-overall',
                kind: 'trend',
                trend: 'danger-to-safety',
              },
            ],
            { category: 'travel' },
          ),
          syntheticRule(
            'conditional-auspicious',
            90,
            [outcome('conditional-effect', 'outcome-condition', 'auspicious', 'condition', 1)],
            { category: 'travel' },
          ),
        ],
      },
    });

    expect(output.analysis.outcome).toEqual([
      expect.objectContaining({
        primarySymbol: 'danger',
        auxiliarySymbols: ['without-blame'],
        phase: 'overall',
      }),
      expect.objectContaining({
        primarySymbol: 'auspicious',
        phase: 'condition',
        conditionLabel: 'synthetic-condition',
      }),
    ]);
    expect(output.analysis.trend.value).toBe('danger-to-safety');
    expect(output.presentation.detailed).toContain('厉而无咎');
    expect(output.analysis).not.toHaveProperty('score');
  });

  it('validates template variables and reliably falls back for missing or invalid templates', () => {
    const request = {
      input: createSyntheticInterpretationInput(),
      ruleset: createSyntheticInterpretationRuleset(),
    };
    const customTemplate = {
      templateId: 'synthetic-custom-template',
      templateVersion: '0.0.0-test.1',
      category: 'career',
      locale: 'zh-Hans',
      variables: ['conclusion', 'risk'],
      sections: {
        oneLineConclusion: '定制重点：{{conclusion}}',
        overallAnalysis: '仅改变表达重点。',
        favorableFactors: '见结构化有利因素。',
        unfavorableFactors: '见结构化不利因素。',
        trend: '见结构化趋势。',
        actionAdvice: '见结构化建议。',
        rationale: '见结构化依据。',
        riskStatement: '{{risk}}',
      },
    };
    expect(categoryTemplateSchema.safeParse(customTemplate).success).toBe(true);
    const custom = runDeterministicInterpretation({ ...request, template: customTemplate });
    expect(custom.presentation.usedFallback).toBe(false);
    expect(custom.presentation.brief).toContain('定制重点');

    const invalidTemplate = {
      ...customTemplate,
      sections: { ...customTemplate.sections, overallAnalysis: '{{missingVariable}}' },
    };
    expect(categoryTemplateSchema.safeParse(invalidTemplate).success).toBe(false);
    const invalid = runDeterministicInterpretation({ ...request, template: invalidTemplate });
    const missing = runDeterministicInterpretation(request);
    expect(invalid.presentation.usedFallback).toBe(true);
    expect(missing.presentation.usedFallback).toBe(true);
    expect(invalid.presentation.templateVersion).toBe('builtin-local-template-v1');
    expect(invalid.presentation.brief).not.toContain('{{');
  });

  it.each([
    ['health', '不构成医疗诊断'],
    ['investment', '不构成投资建议'],
    ['wealth', '不构成投资建议'],
    ['legal', '不构成法律意见'],
    ['dispute', '不构成法律意见'],
  ] as const)('adds the required %s risk statement', (category, expected) => {
    const output = runDeterministicInterpretation({
      input: createSyntheticInterpretationInput(category),
      ruleset: createSyntheticInterpretationRuleset(),
    });
    expect(output.analysis.capability).toBe('insufficient-rules');
    expect(output.analysis.outcome[0]?.primarySymbol).toBe('undetermined');
    expect(output.presentation.riskStatement).toContain(expected);
  });

  it('exposes UI rationale and does not mutate professional chart facts', () => {
    const input = createSyntheticInterpretationInput();
    const originalFacts = JSON.parse(JSON.stringify(input.professionalChart)) as unknown;
    const output = runDeterministicInterpretation({
      input,
      ruleset: createSyntheticInterpretationRuleset(),
    });

    expect(input.professionalChart).toEqual(originalFacts);
    expect(output.analysis.facts.professionalChart).toEqual(originalFacts);
    expect(output.analysis.rationale).toContainEqual(
      expect.objectContaining({
        ruleId: 'synthetic-current-regret',
        ruleName: 'Synthetic rule synthetic-current-regret',
        priority: 100,
        linePositions: [3],
        overridden: false,
        source: expect.objectContaining({ verificationStatus: 'test-only' }),
        rulesetVersion: '0.0.0-test.1',
      }),
    );
    expect(output.analysis.rationale).toContainEqual(
      expect.objectContaining({
        ruleId: 'synthetic-low-inauspicious',
        overridden: true,
        overriddenByRuleId: 'synthetic-current-regret',
      }),
    );
    expect(output.analysis.rationale[0]?.evidence.length).toBeGreaterThan(0);
  });
});

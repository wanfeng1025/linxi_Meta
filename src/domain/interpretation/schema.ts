import { z } from 'zod';

import { InterpretationDomainError } from './errors';
import type {
  CategoryTemplate,
  InterpretationEngineInput,
  InterpretationRuleset,
  RuleCondition,
} from './types';

const stableIdSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);

const immutableVersionSchema = z
  .string()
  .min(1)
  .max(160)
  .refine((value) => value.toLowerCase() !== 'latest', 'Version cannot be "latest".');

const fieldPathSchema = z
  .string()
  .min(1)
  .max(240)
  .regex(/^(?:[A-Za-z][A-Za-z0-9_-]*|[0-9]+)(?:\.(?:[A-Za-z][A-Za-z0-9_-]*|[0-9]+))*$/)
  .refine(
    (value) =>
      value
        .split('.')
        .every((segment) => !['__proto__', 'prototype', 'constructor'].includes(segment)),
    'Unsafe field path segment.',
  );

const valuePredicateSchema = z
  .object({
    kind: z.literal('predicate'),
    field: fieldPathSchema,
    operator: z.enum([
      'equals',
      'contains',
      'greater-than',
      'greater-than-or-equal',
      'less-than',
      'less-than-or-equal',
      'intersects',
    ]),
    value: z.json(),
  })
  .strict();

const existencePredicateSchema = z
  .object({
    kind: z.literal('predicate'),
    field: fieldPathSchema,
    operator: z.enum(['exists', 'not-exists']),
  })
  .strict();

export const ruleConditionSchema: z.ZodType<RuleCondition> = z.lazy(() =>
  z.union([
    valuePredicateSchema,
    existencePredicateSchema,
    z
      .object({
        kind: z.literal('group'),
        combinator: z.enum(['all', 'any']),
        conditions: z.array(ruleConditionSchema).min(1).readonly(),
      })
      .strict(),
  ]),
);

const conditionGroupSchema = z
  .object({
    kind: z.literal('group'),
    combinator: z.enum(['all', 'any']),
    conditions: z.array(ruleConditionSchema).min(1).readonly(),
  })
  .strict();

const sourceSchema = z
  .object({
    sourceId: stableIdSchema,
    sourceVersion: immutableVersionSchema,
    sourceLocator: z.string().min(1).max(500),
    verificationStatus: z.enum(['verified', 'test-only']),
  })
  .strict();

const effectBase = {
  effectId: stableIdSchema,
  slot: stableIdSchema,
} as const;

const outcomeEffectSchema = z
  .object({
    ...effectBase,
    kind: z.literal('outcome'),
    primarySymbol: z.enum(['auspicious', 'inauspicious', 'remorse', 'regret', 'danger', 'blame']),
    auxiliarySymbols: z
      .array(
        z.enum(['without-blame', 'remorse-disappears', 'prosperous', 'beneficial', 'unfavorable']),
      )
      .readonly(),
    phase: z.enum(['overall', 'current', 'later', 'condition']),
    sequence: z.number().int().min(0).max(100),
    conditionLabel: z.string().min(1).max(120).nullable(),
  })
  .strict()
  .superRefine((effect, context) => {
    if ((effect.phase === 'condition') !== (effect.conditionLabel !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['conditionLabel'],
        message: 'conditionLabel is required only for conditional outcomes.',
      });
    }
  });

const trendEffectSchema = z
  .object({
    ...effectBase,
    kind: z.literal('trend'),
    trend: z.enum([
      'stable',
      'gradual',
      'recurring',
      'stalled',
      'hard-then-easy',
      'easy-then-hard',
      'danger-to-safety',
      'prosperity-to-decline',
      'condition-not-met',
    ]),
  })
  .strict();

const factorEffectSchema = z
  .object({
    ...effectBase,
    kind: z.literal('factor'),
    polarity: z.enum(['favorable', 'unfavorable']),
    messageKey: stableIdSchema,
    subjectIds: z.array(stableIdSchema).readonly(),
  })
  .strict();

const actionEffectSchema = z
  .object({
    ...effectBase,
    kind: z.literal('action'),
    messageKey: stableIdSchema,
    safetyTag: z.enum(['general', 'health', 'financial', 'legal', 'emergency']),
    actionPriority: z.number().int().min(0).max(1000),
  })
  .strict();

const factEffectSchema = z
  .object({
    ...effectBase,
    kind: z.literal('fact'),
    factType: stableIdSchema,
    value: z.json(),
    polarity: z.enum(['positive', 'negative', 'neutral', 'context-dependent']),
  })
  .strict();

export const interpretationRuleSchema = z
  .object({
    ruleId: stableIdSchema,
    name: z.string().min(1).max(200),
    rulesetId: stableIdSchema,
    rulesetVersion: immutableVersionSchema,
    preconditions: conditionGroupSchema,
    conditions: conditionGroupSchema,
    target: z
      .object({
        scope: z.enum(['overall', 'category', 'line', 'professional-fact']),
        ids: z.array(stableIdSchema).readonly(),
        linePositions: z
          .array(
            z.union([
              z.literal(1),
              z.literal(2),
              z.literal(3),
              z.literal(4),
              z.literal(5),
              z.literal(6),
            ]),
          )
          .readonly(),
      })
      .strict(),
    effects: z
      .array(
        z.union([
          outcomeEffectSchema,
          trendEffectSchema,
          factorEffectSchema,
          actionEffectSchema,
          factEffectSchema,
        ]),
      )
      .min(1)
      .readonly(),
    priority: z.number().int().min(-100000).max(100000),
    weight: z.number().finite().min(0).max(1000),
    exclusiveGroup: stableIdSchema.nullable(),
    conflictRules: z
      .array(
        z
          .object({
            withRuleId: stableIdSchema,
            resolution: z.enum(['override-target', 'yield-to-target', 'coexist', 'block-both']),
            reason: z.string().min(1).max(500),
          })
          .strict(),
      )
      .readonly(),
    requiredFields: z.array(fieldPathSchema).readonly(),
    source: sourceSchema,
    status: z.enum(['enabled', 'disabled']),
  })
  .strict()
  .superRefine((rule, context) => {
    const effectIds = new Set<string>();
    for (const [index, effect] of rule.effects.entries()) {
      if (effectIds.has(effect.effectId)) {
        context.addIssue({
          code: 'custom',
          path: ['effects', index, 'effectId'],
          message: `Duplicate effectId ${effect.effectId}.`,
        });
      }
      effectIds.add(effect.effectId);
    }
    const conflicts = new Set<string>();
    for (const [index, conflict] of rule.conflictRules.entries()) {
      if (conflict.withRuleId === rule.ruleId || conflicts.has(conflict.withRuleId)) {
        context.addIssue({
          code: 'custom',
          path: ['conflictRules', index, 'withRuleId'],
          message: 'Conflict targets must be unique and cannot reference the same rule.',
        });
      }
      conflicts.add(conflict.withRuleId);
    }
  });

function conditionFields(condition: RuleCondition): readonly string[] {
  if (condition.kind === 'predicate') return [condition.field];
  return condition.conditions.flatMap(conditionFields);
}

export const interpretationRulesetSchema = z
  .object({
    schemaVersion: immutableVersionSchema,
    rulesetId: stableIdSchema,
    rulesetVersion: immutableVersionSchema,
    contentVersion: immutableVersionSchema,
    verificationStatus: z.enum(['verified', 'test-only']),
    availableFields: z.array(fieldPathSchema).readonly(),
    samePriorityStrategy: z.enum(['rule-id-ascending', 'higher-weight-then-rule-id']),
    defaultConflictStrategy: z.literal('preserve-unresolved'),
    rules: z.array(interpretationRuleSchema).readonly(),
  })
  .strict()
  .superRefine((ruleset, context) => {
    const ruleIds = new Set<string>();
    const availableFields = new Set(ruleset.availableFields);
    const declaredPairs = new Set<string>();
    for (const [index, rule] of ruleset.rules.entries()) {
      if (ruleIds.has(rule.ruleId)) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'ruleId'],
          message: `Duplicate ruleId ${rule.ruleId}.`,
        });
      }
      ruleIds.add(rule.ruleId);
      if (rule.rulesetId !== ruleset.rulesetId || rule.rulesetVersion !== ruleset.rulesetVersion) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'rulesetVersion'],
          message: 'Rule version must exactly match its containing ruleset.',
        });
      }
      if (
        ruleset.verificationStatus === 'verified' &&
        rule.source.verificationStatus !== 'verified'
      ) {
        context.addIssue({
          code: 'custom',
          path: ['rules', index, 'source', 'verificationStatus'],
          message: 'A verified ruleset cannot contain test-only sources.',
        });
      }
      const required = new Set(rule.requiredFields);
      for (const field of [
        ...conditionFields(rule.preconditions as RuleCondition),
        ...conditionFields(rule.conditions as RuleCondition),
      ]) {
        if (!availableFields.has(field)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', index, 'conditions'],
            message: `Condition field ${field} is not declared by availableFields.`,
          });
        }
      }
      for (const field of required) {
        if (!availableFields.has(field)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', index, 'requiredFields'],
            message: `Field ${field} is not declared by availableFields.`,
          });
        }
      }
    }
    for (const [index, rule] of ruleset.rules.entries()) {
      for (const [conflictIndex, conflict] of rule.conflictRules.entries()) {
        if (!ruleIds.has(conflict.withRuleId)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', index, 'conflictRules', conflictIndex, 'withRuleId'],
            message: `Unknown conflict target ${conflict.withRuleId}.`,
          });
        }
        const pair = [rule.ruleId, conflict.withRuleId].sort().join('|');
        if (declaredPairs.has(pair)) {
          context.addIssue({
            code: 'custom',
            path: ['rules', index, 'conflictRules', conflictIndex],
            message: `Conflict pair ${pair} must be declared exactly once.`,
          });
        }
        declaredPairs.add(pair);
      }
    }
  });

const jsonObjectSchema = z.record(z.string(), z.json());

export const interpretationEngineInputSchema = z
  .object({
    schemaVersion: immutableVersionSchema,
    divinationRecordId: stableIdSchema,
    rulesetVersion: immutableVersionSchema,
    contentVersion: immutableVersionSchema,
    category: z.enum([
      'career',
      'job-search',
      'study',
      'wealth',
      'investment',
      'cooperation',
      'relationship',
      'marriage',
      'travel',
      'lost-property',
      'health',
      'dispute',
      'legal',
      'general-decision',
    ]),
    questionContext: jsonObjectSchema,
    castingResult: jsonObjectSchema,
    professionalChart: jsonObjectSchema.nullable(),
    usefulGodCandidates: z.array(jsonObjectSchema).readonly(),
    calendarContext: jsonObjectSchema.nullable(),
  })
  .strict();

const templateVariableSchema = z.enum([
  'categoryLabel',
  'conclusion',
  'overall',
  'favorable',
  'unfavorable',
  'trend',
  'actions',
  'basis',
  'risk',
]);

const templateSectionsSchema = z
  .object({
    oneLineConclusion: z.string().min(1),
    overallAnalysis: z.string().min(1),
    favorableFactors: z.string().min(1),
    unfavorableFactors: z.string().min(1),
    trend: z.string().min(1),
    actionAdvice: z.string().min(1),
    rationale: z.string().min(1),
    riskStatement: z.string().min(1),
  })
  .strict();

export const categoryTemplateSchema = z
  .object({
    templateId: stableIdSchema,
    templateVersion: immutableVersionSchema,
    category: interpretationEngineInputSchema.shape.category,
    locale: z.literal('zh-Hans'),
    variables: z.array(templateVariableSchema).readonly(),
    sections: templateSectionsSchema,
  })
  .strict()
  .superRefine((template, context) => {
    const declared = new Set(template.variables);
    for (const [sectionName, section] of Object.entries(template.sections)) {
      for (const match of section.matchAll(/\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g)) {
        const variable = match[1];
        if (variable === undefined || !declared.has(variable as never)) {
          context.addIssue({
            code: 'custom',
            path: ['sections', sectionName],
            message: `Template variable ${variable ?? '<missing>'} is not declared.`,
          });
        }
      }
    }
  });

function parseOrThrow<T>(schema: z.ZodType, value: unknown, label: string): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new InterpretationDomainError(
      'INVALID_SCHEMA',
      `${label} failed validation: ${z.prettifyError(parsed.error)}`,
    );
  }
  return parsed.data as T;
}

export function parseInterpretationRuleset(value: unknown): InterpretationRuleset {
  return parseOrThrow<InterpretationRuleset>(interpretationRulesetSchema, value, 'Ruleset');
}

export function parseInterpretationInput(value: unknown): InterpretationEngineInput {
  return parseOrThrow<InterpretationEngineInput>(interpretationEngineInputSchema, value, 'Input');
}

export function parseCategoryTemplate(value: unknown): CategoryTemplate {
  return parseOrThrow<CategoryTemplate>(categoryTemplateSchema, value, 'Template');
}

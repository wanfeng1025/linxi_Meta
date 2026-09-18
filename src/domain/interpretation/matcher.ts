import type {
  InterpretationEngineInput,
  InterpretationRule,
  InterpretationRuleset,
  JsonObject,
  JsonValue,
  PredicateEvidence,
  RuleCondition,
  RuleEvaluation,
  RuleMatchResult,
} from './types';

interface FieldLookup {
  readonly present: boolean;
  readonly value: JsonValue | null;
}

interface ConditionEvaluation {
  readonly satisfied: boolean;
  readonly evidence: readonly PredicateEvidence[];
  readonly nextEvidenceIndex: number;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compareStrings(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareJson(left: JsonValue, right: JsonValue): boolean {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((item, index) => compareJson(item, right[index] as JsonValue))
    );
  }
  if (isJsonObject(left) && isJsonObject(right)) {
    const leftKeys = Object.keys(left).sort(compareStrings);
    const rightKeys = Object.keys(right).sort(compareStrings);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key, index) =>
          key === rightKeys[index] && compareJson(left[key] as JsonValue, right[key] as JsonValue),
      )
    );
  }
  return false;
}

function readField(root: JsonObject, path: string): FieldLookup {
  let current: JsonValue = root;
  for (const segment of path.split('.')) {
    if (Array.isArray(current)) {
      if (!/^\d+$/.test(segment)) return { present: false, value: null };
      const index = Number(segment);
      if (!Object.prototype.hasOwnProperty.call(current, index)) {
        return { present: false, value: null };
      }
      current = current[index] as JsonValue;
      continue;
    }
    if (!isJsonObject(current) || !Object.prototype.hasOwnProperty.call(current, segment)) {
      return { present: false, value: null };
    }
    current = current[segment] as JsonValue;
  }
  return { present: true, value: current };
}

function predicateSatisfied(
  operator: Exclude<RuleCondition, { kind: 'group' }>['operator'],
  actual: FieldLookup,
  expected: JsonValue | null,
): boolean {
  if (operator === 'exists') return actual.present;
  if (operator === 'not-exists') return !actual.present;
  if (!actual.present || (expected === null && actual.value !== null)) {
    if (operator === 'equals') return actual.present && actual.value === null && expected === null;
    return false;
  }
  const actualValue = actual.value;
  if (operator === 'equals') return compareJson(actualValue, expected);
  if (operator === 'contains') {
    if (typeof actualValue === 'string' && typeof expected === 'string') {
      return actualValue.includes(expected);
    }
    return Array.isArray(actualValue) && actualValue.some((item) => compareJson(item, expected));
  }
  if (operator === 'intersects') {
    return (
      Array.isArray(actualValue) &&
      Array.isArray(expected) &&
      actualValue.some((item) => expected.some((candidate) => compareJson(item, candidate)))
    );
  }
  if (typeof actualValue !== 'number' || typeof expected !== 'number') return false;
  if (operator === 'greater-than') return actualValue > expected;
  if (operator === 'greater-than-or-equal') return actualValue >= expected;
  if (operator === 'less-than') return actualValue < expected;
  return actualValue <= expected;
}

function evaluateCondition(
  condition: RuleCondition,
  root: JsonObject,
  ruleId: string,
  evidenceIndex: number,
): ConditionEvaluation {
  if (condition.kind === 'predicate') {
    const actual = readField(root, condition.field);
    const expected = 'value' in condition ? condition.value : null;
    const satisfied = predicateSatisfied(condition.operator, actual, expected);
    return {
      satisfied,
      evidence: [
        Object.freeze({
          evidenceId: `${ruleId}-condition-${evidenceIndex}`,
          field: condition.field,
          operator: condition.operator,
          expected,
          actual: actual.value,
          actualPresent: actual.present,
          satisfied,
        }),
      ],
      nextEvidenceIndex: evidenceIndex + 1,
    };
  }

  let nextEvidenceIndex = evidenceIndex;
  const childResults = condition.conditions.map((child) => {
    const result = evaluateCondition(child, root, ruleId, nextEvidenceIndex);
    nextEvidenceIndex = result.nextEvidenceIndex;
    return result;
  });
  return {
    satisfied:
      condition.combinator === 'all'
        ? childResults.every((result) => result.satisfied)
        : childResults.some((result) => result.satisfied),
    evidence: Object.freeze(childResults.flatMap((result) => result.evidence)),
    nextEvidenceIndex,
  };
}

function buildEvaluationRoot(input: InterpretationEngineInput): JsonObject {
  return Object.freeze({
    question: input.questionContext,
    casting: input.castingResult,
    professional: input.professionalChart,
    usefulGodCandidates: input.usefulGodCandidates,
    calendar: input.calendarContext,
  });
}

export function compareRules(
  left: InterpretationRule,
  right: InterpretationRule,
  strategy: InterpretationRuleset['samePriorityStrategy'],
): number {
  if (left.priority !== right.priority) return right.priority - left.priority;
  if (strategy === 'higher-weight-then-rule-id' && left.weight !== right.weight) {
    return right.weight - left.weight;
  }
  return compareStrings(left.ruleId, right.ruleId);
}

function evaluateRule(rule: InterpretationRule, root: JsonObject): RuleEvaluation {
  if (rule.status === 'disabled') {
    return Object.freeze({ rule, status: 'disabled', evidence: [], missingFields: [] });
  }
  const missingFields = rule.requiredFields.filter((field) => !readField(root, field).present);
  if (missingFields.length > 0) {
    return Object.freeze({
      rule,
      status: 'missing-required-field',
      evidence: [],
      missingFields: Object.freeze(missingFields),
    });
  }
  const preconditions = evaluateCondition(rule.preconditions, root, rule.ruleId, 1);
  const conditions = evaluateCondition(
    rule.conditions,
    root,
    rule.ruleId,
    preconditions.nextEvidenceIndex,
  );
  return Object.freeze({
    rule,
    status: preconditions.satisfied && conditions.satisfied ? 'matched' : 'not-matched',
    evidence: Object.freeze([...preconditions.evidence, ...conditions.evidence]),
    missingFields: [],
  });
}

export function matchInterpretationRules(
  input: InterpretationEngineInput,
  ruleset: InterpretationRuleset,
): RuleMatchResult {
  const root = buildEvaluationRoot(input);
  const orderedRules = [...ruleset.rules].sort((left, right) =>
    compareRules(left, right, ruleset.samePriorityStrategy),
  );
  const evaluations = orderedRules.map((rule) => evaluateRule(rule, root));
  return Object.freeze({
    rulesetId: ruleset.rulesetId,
    rulesetVersion: ruleset.rulesetVersion,
    executionOrder: Object.freeze(orderedRules.map((rule) => rule.ruleId)),
    matchedRules: Object.freeze(evaluations.filter((result) => result.status === 'matched')),
    unmatchedRules: Object.freeze(evaluations.filter((result) => result.status !== 'matched')),
  });
}

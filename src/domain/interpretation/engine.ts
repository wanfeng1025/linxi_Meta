import { buildInterpretationAnalysis } from './analysis';
import { resolveRuleConflicts } from './conflicts';
import { InterpretationDomainError } from './errors';
import { matchInterpretationRules } from './matcher';
import { parseInterpretationInput, parseInterpretationRuleset } from './schema';
import { composeInterpretationText } from './templates';
import type { InterpretationOutput } from './types';

export interface RunInterpretationInput {
  readonly input: unknown;
  readonly ruleset: unknown;
  readonly template?: unknown;
}

export function runDeterministicInterpretation(
  request: RunInterpretationInput,
): InterpretationOutput {
  const input = parseInterpretationInput(request.input);
  const ruleset = parseInterpretationRuleset(request.ruleset);
  if (input.rulesetVersion !== ruleset.rulesetVersion) {
    throw new InterpretationDomainError(
      'VERSION_MISMATCH',
      `Input rulesetVersion ${input.rulesetVersion} does not match ${ruleset.rulesetVersion}.`,
    );
  }
  if (input.contentVersion !== ruleset.contentVersion) {
    throw new InterpretationDomainError(
      'VERSION_MISMATCH',
      `Input contentVersion ${input.contentVersion} does not match ${ruleset.contentVersion}.`,
    );
  }
  const match = matchInterpretationRules(input, ruleset);
  const resolution = resolveRuleConflicts(match, ruleset);
  const analysis = buildInterpretationAnalysis(input, ruleset, match, resolution);
  return Object.freeze({
    analysis,
    presentation: composeInterpretationText(analysis, request.template),
  });
}

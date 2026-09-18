import { ProfessionalDomainError } from './errors';
import type {
  ProfessionalRuleset,
  QuestionContext,
  RelatedGodRoles,
  UsefulGodCandidate,
  UsefulGodMatch,
  UsefulGodSelection,
} from './types';

function optionalMatch(value: string | null, allowed: readonly string[]): boolean {
  return allowed.length === 0 || (value !== null && allowed.includes(value));
}

function matches(context: QuestionContext, rule: UsefulGodMatch): boolean {
  const genderMatches =
    rule.traditionalGenderRule === 'irrelevant' ||
    (rule.traditionalGenderRule === 'required' && context.traditionalGenderRuleEnabled) ||
    (rule.traditionalGenderRule === 'forbidden' && !context.traditionalGenderRuleEnabled);
  return (
    optionalMatch(context.questionCategory, rule.questionCategories) &&
    optionalMatch(context.questionSubcategory, rule.questionSubcategories) &&
    (rule.selfOrProxy.length === 0 || rule.selfOrProxy.includes(context.selfOrProxy)) &&
    optionalMatch(context.subjectRole, rule.subjectRoles) &&
    optionalMatch(context.targetRole, rule.targetRoles) &&
    optionalMatch(context.targetRelationship, rule.targetRelationships) &&
    optionalMatch(context.desiredOutcome, rule.desiredOutcomes) &&
    rule.requiredContextTags.every((tag) => context.contextTags.includes(tag)) &&
    genderMatches
  );
}

export function selectUsefulGodCandidates(
  context: QuestionContext,
  ruleset: ProfessionalRuleset,
): UsefulGodSelection {
  const candidates: UsefulGodCandidate[] = ruleset.usefulGodRules
    .filter((rule) => matches(context, rule.match))
    .map((rule) =>
      Object.freeze({
        relative: rule.relative,
        role: rule.candidateRole,
        priority: rule.priority,
        reasonRuleId: rule.ruleId,
        evidence: rule.evidenceTemplate,
        sourceId: rule.sourceId,
        sourceVersion: rule.sourceVersion,
      }),
    )
    .sort((left, right) => right.priority - left.priority);

  if (candidates.length === 0) {
    return Object.freeze({
      candidates: Object.freeze([]),
      selected: null,
      confidence: 'insufficient-context',
      ambiguityReasons: Object.freeze([
        'No verified useful-god rule matched the supplied context.',
      ]),
    });
  }

  const highestPriority = candidates[0]?.priority;
  const leaders = candidates.filter((candidate) => candidate.priority === highestPriority);
  const distinctLeaderRelations = new Set(leaders.map((candidate) => candidate.relative));
  const ambiguous = distinctLeaderRelations.size > 1;
  return Object.freeze({
    candidates: Object.freeze(candidates),
    selected: ambiguous ? null : (leaders[0] ?? null),
    confidence: ambiguous ? 'ambiguous' : 'resolved',
    ambiguityReasons: Object.freeze(
      ambiguous
        ? ['Multiple verified rules produced different candidates at the same priority.']
        : [],
    ),
  });
}

export function resolveOriginalSupportingAvoidingEnemyGods(
  selection: UsefulGodSelection,
  ruleset: ProfessionalRuleset,
): RelatedGodRoles | null {
  if (selection.selected === null) return null;
  const rule = ruleset.supportingRoleRules.find(
    (candidate) => candidate.usefulGodRelative === selection.selected?.relative,
  );
  if (rule === undefined) {
    throw new ProfessionalDomainError(
      'RULE_NOT_FOUND',
      `No supporting/avoiding/enemy role rule exists for ${selection.selected.relative}.`,
    );
  }
  return Object.freeze({
    usefulGod: rule.usefulGodRelative,
    supportingGod: rule.supportingRelative,
    avoidingGod: rule.avoidingRelative,
    enemyGod: rule.enemyRelative,
    ruleId: rule.ruleId,
  });
}

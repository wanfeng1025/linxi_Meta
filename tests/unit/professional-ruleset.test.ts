import { describe, expect, it } from 'vitest';
import {
  ProfessionalDomainError,
  createProfessionalRuleset,
  createTestProfessionalRuleset,
  resolveBranchRelations,
  resolvePalace,
  resolveSixSpirits,
  resolveVoidBranches,
  resolveWorldAndResponse,
} from '../../src/domain/professional';
import {
  createProfessionalRulesetFixture,
  professionalRulesetInputFixture,
} from '../fixtures/professional-ruleset.fixture';

describe('professional ruleset verification gate', () => {
  it('rejects test-only or incomplete rulesets from the production constructor', () => {
    expect(() => createProfessionalRuleset(professionalRulesetInputFixture())).toThrowError(
      expect.objectContaining<Partial<ProfessionalDomainError>>({ code: 'UNVERIFIED_RULESET' }),
    );
  });

  it('rejects a rule from a different ruleset', () => {
    const input = professionalRulesetInputFixture();
    const first = input.palaceRules[0];
    expect(first).toBeDefined();
    expect(() =>
      createTestProfessionalRuleset({
        ...input,
        palaceRules: [{ ...first!, rulesetVersion: 'another-version' }],
      }),
    ).toThrowError(
      expect.objectContaining<Partial<ProfessionalDomainError>>({ code: 'MIXED_RULESET' }),
    );
  });
});

describe('table-driven professional resolvers', () => {
  const ruleset = createProfessionalRulesetFixture();

  it('resolves palace and legal world/response positions from one rule', () => {
    expect(resolvePalace('hex-primary', ruleset)).toMatchObject({
      palaceElementId: 'metal',
      stage: 'base',
    });
    expect(resolveWorldAndResponse('hex-primary', ruleset)).toMatchObject({
      worldPosition: 6,
      responsePosition: 3,
    });
  });

  it('orders six spirits upward from the configured day-stem start', () => {
    expect(resolveSixSpirits('day-stem-a', ruleset).map((line) => line.spiritId)).toEqual([
      'spirit-3',
      'spirit-4',
      'spirit-5',
      'spirit-6',
      'spirit-1',
      'spirit-2',
    ]);
  });

  it('uses the configured void table and excludes disabled branch relations', () => {
    expect(resolveVoidBranches(9, ruleset)).toEqual(['branch-5', 'branch-6']);
    expect(resolveBranchRelations(['branch-1', 'branch-4'], ruleset)).toHaveLength(1);
    expect(resolveBranchRelations(['branch-2', 'branch-5'], ruleset)).toEqual([]);
    expect(() => resolveVoidBranches(10, ruleset)).toThrowError(
      expect.objectContaining<Partial<ProfessionalDomainError>>({ code: 'RULE_NOT_FOUND' }),
    );
  });
});

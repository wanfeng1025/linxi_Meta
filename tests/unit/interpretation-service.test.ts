import { describe, expect, it } from 'vitest';

import { InterpretationService } from '../../src/application/interpretation';
import { InterpretationDomainError } from '../../src/domain/interpretation';
import {
  createSyntheticInterpretationInput,
  createSyntheticInterpretationRuleset,
} from '../fixtures/interpretation-ruleset.fixture';

describe('InterpretationService', () => {
  it('runs the local rule-to-template pipeline without AI', () => {
    const service = new InterpretationService();
    const output = service.interpret({
      input: createSyntheticInterpretationInput(),
      ruleset: createSyntheticInterpretationRuleset(),
    });
    expect(output.analysis.match.matchedRules).toHaveLength(3);
    expect(output.presentation.professional).toContain('规则集：');
    expect(output).not.toHaveProperty('ai');
  });

  it('rejects ruleset and content version mismatches', () => {
    const service = new InterpretationService();
    expect(() =>
      service.interpret({
        input: { ...createSyntheticInterpretationInput(), rulesetVersion: 'different-version' },
        ruleset: createSyntheticInterpretationRuleset(),
      }),
    ).toThrowError(InterpretationDomainError);
    expect(() =>
      service.interpret({
        input: { ...createSyntheticInterpretationInput(), contentVersion: 'different-content' },
        ruleset: createSyntheticInterpretationRuleset(),
      }),
    ).toThrow(/contentVersion/);
  });
});

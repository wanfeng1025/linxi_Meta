import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { professionalRulesetInputSchema } from '../../scripts/professional-ruleset-schema';
import { professionalRulesetInputFixture } from '../fixtures/professional-ruleset.fixture';

describe('professional ruleset boundary Schema', () => {
  it('accepts the explicit synthetic fixture shape', () => {
    expect(
      professionalRulesetInputSchema.safeParse(professionalRulesetInputFixture()).success,
    ).toBe(true);
  });

  it('rejects mutable latest versions before domain validation', () => {
    const fixture = professionalRulesetInputFixture();
    const result = professionalRulesetInputSchema.safeParse({
      ...fixture,
      metadata: { ...fixture.metadata, rulesetVersion: 'latest' },
    });
    expect(result.success).toBe(false);
  });

  it('generates a stable standalone Draft 2020-12 JSON Schema', () => {
    const schema = JSON.parse(
      readFileSync(resolve(process.cwd(), 'schemas/professional-ruleset.schema.json'), 'utf8'),
    ) as { readonly $schema?: unknown; readonly $id?: unknown; readonly type?: unknown };
    expect(schema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://liuyao.app/schemas/professional-ruleset.schema.json',
      type: 'object',
    });
  });
});

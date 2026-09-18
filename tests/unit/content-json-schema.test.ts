import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const schemaNames = [
  'data-source',
  'rule-version',
  'trigram',
  'hexagram',
  'hexagram-line',
  'special-line-text',
  'content-text',
  'palace',
  'earthly-branch',
  'najia',
  'six-relative-rule',
  'six-spirit',
  'six-spirit-rule',
  'branch-relation',
  'question-category',
  'interpretation-template',
  'content-dataset',
] as const;

describe('generated content JSON Schemas', () => {
  it.each(schemaNames)('%s has a stable Draft 2020-12 identity', (name) => {
    const path = resolve(process.cwd(), 'schemas', `${name}.schema.json`);
    const schema = JSON.parse(readFileSync(path, 'utf8')) as {
      readonly $schema?: unknown;
      readonly $id?: unknown;
      readonly type?: unknown;
    };

    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(schema.$id).toBe(`https://liuyao.app/schemas/${name}.schema.json`);
    expect(schema.type).toBe('object');
  });
});

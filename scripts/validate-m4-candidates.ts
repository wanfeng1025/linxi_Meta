import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import {
  classicalCandidatePackSchema,
  hexagramPageManifestSchema,
  professionalCandidatePackSchema,
  productCandidatePackSchema,
} from './m4-candidate-schema';

const root = resolve(process.cwd(), 'data/draft');
const checks = [
  [
    'classical candidate',
    resolve(root, 'classical/classical-text-units-candidate.json'),
    classicalCandidatePackSchema,
  ],
  [
    'professional candidate',
    resolve(root, 'professional/jingfang-yehe-baseline-candidate.json'),
    professionalCandidatePackSchema,
  ],
  [
    'product editorial candidate',
    resolve(root, 'product/product-editorial-candidate.json'),
    productCandidatePackSchema,
  ],
  [
    'hexagram page manifest',
    resolve(root, 'manifests/hexagram-page-manifest.json'),
    hexagramPageManifestSchema,
  ],
] as const;

let failed = false;
for (const [name, file, schema] of checks) {
  const content = readFileSync(file, 'utf8');
  const parsed = schema.safeParse(JSON.parse(content) as unknown);
  if (!parsed.success) {
    failed = true;
    console.error(`[m4-candidate] ${name} failed`, parsed.error.issues);
    continue;
  }
  const sha256 = createHash('sha256').update(content).digest('hex');
  console.info(`[m4-candidate] ${name} passed sha256=${sha256}`);
}
if (failed) process.exitCode = 1;

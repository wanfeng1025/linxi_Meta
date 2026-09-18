import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { canonicalJson } from '../src/shared/data/canonical-json';
import { validateContentDataset } from './content-data-schema';

const sourceFile = 'data/source/content-dataset.json';
const input = JSON.parse(readFileSync(resolve(process.cwd(), sourceFile), 'utf8')) as unknown;
const validation = validateContentDataset(input, { environment: 'production' });

if (!validation.report.valid || validation.dataset === null) {
  console.error(
    '[content-seed] build stopped because production data is invalid',
    JSON.stringify(validation.report, null, 2),
  );
  process.exitCode = 1;
} else {
  const payload = canonicalJson(validation.dataset);
  console.info(
    JSON.stringify(
      {
        sourceFile,
        contentVersion: validation.dataset.version.contentVersion,
        schemaVersion: validation.dataset.version.schemaVersion,
        sha256: createHash('sha256').update(payload).digest('hex'),
        counts: validation.report.counts,
        missingSourceRefs: validation.report.missingSourceRefs,
        issues: validation.report.issues,
      },
      null,
      2,
    ),
  );
}

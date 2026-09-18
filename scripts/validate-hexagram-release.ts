import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { releaseReadyCatalogSchema } from './data-schema';

const catalogPath = path.join(process.cwd(), 'data', 'catalog', 'index.json');

async function validateHexagramRelease(): Promise<void> {
  const rawCatalog = await readFile(catalogPath, 'utf8');
  const input: unknown = JSON.parse(rawCatalog);
  const result = releaseReadyCatalogSchema.safeParse(input);

  if (!result.success) {
    console.error('[hexagram-release] blocked: production mapping is not release-ready.');
    for (const issue of result.error.issues) {
      const location = issue.path.length === 0 ? '<catalog>' : issue.path.join('.');
      console.error(`- ${location}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('[hexagram-release] complete verified hexagram mapping passed.');
}

void validateHexagramRelease().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[hexagram-release] failed to read or parse ${catalogPath}: ${detail}`);
  process.exitCode = 1;
});

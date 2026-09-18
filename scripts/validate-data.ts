import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

import { canonicalJson } from '../src/shared/data/canonical-json';
import { validateContentDataset } from './content-data-schema';
import { traditionalContentRecordSchema, verifiedCatalogSchema } from './data-schema';
import {
  classicalCandidatePackSchema,
  hexagramPageManifestSchema,
  professionalCandidatePackSchema,
  productCandidatePackSchema,
} from './m4-candidate-schema';
import {
  professionalCalendarCandidateDocumentSchema,
  professionalGoldCasesCandidateDocumentSchema,
  professionalRulesetCandidateDocumentSchema,
  professionalSourceManifestCandidateDocumentSchema,
} from './professional-ruleset-schema';
import { kanripoClassicalSeedManifestSchema } from './classical-seed-schema';
import {
  authorizedClassicalQuoteDatasetSchema,
  validateAuthorizedClassicalQuoteDataset,
} from './classical-quote-source-schema';
import {
  authorizedInterpretationDatasetSchema,
  validateAuthorizedInterpretationDataset,
} from './authorized-interpretation-source-schema';
import {
  draftInterpretationDatasetSchema,
  validateDraftInterpretationDataset,
} from './draft-interpretation-schema';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

const workspaceRoot = process.cwd();
const checks = [
  {
    label: 'verified catalog',
    path: resolve(workspaceRoot, 'data/catalog/index.json'),
    schema: verifiedCatalogSchema,
  },
  {
    label: 'unverified structure example',
    path: resolve(workspaceRoot, 'data/examples/unverified-record.example.json'),
    schema: traditionalContentRecordSchema,
  },
] as const;

let hasErrors = false;

for (const check of checks) {
  const result = check.schema.safeParse(readJson(check.path));
  if (!result.success) {
    hasErrors = true;
    console.error(`[data] ${check.label} failed`, result.error.issues);
  } else {
    console.info(`[data] ${check.label} passed`);
  }
}

const contentChecks = [
  {
    label: 'production content source',
    path: resolve(workspaceRoot, 'data/source/content-dataset.json'),
    environment: 'production',
  },
  {
    label: 'isolated draft content',
    path: resolve(workspaceRoot, 'data/draft/content-dataset.json'),
    environment: 'draft',
  },
] as const;

for (const check of contentChecks) {
  const input = readJson(check.path);
  const result = validateContentDataset(input, { environment: check.environment });
  const hash = createHash('sha256').update(canonicalJson(input)).digest('hex');
  const report = { ...result.report, sha256: hash };

  if (!report.valid) {
    hasErrors = true;
    console.error(`[data] ${check.label} failed`, JSON.stringify(report, null, 2));
  } else {
    console.info(`[data] ${check.label} passed`, JSON.stringify(report, null, 2));
  }
}

const authorizedClassicalQuotePath = resolve(
  workspaceRoot,
  'data/source/classical/liuyao-overview-authorized-v1.json',
);
if (!existsSync(authorizedClassicalQuotePath)) {
  hasErrors = true;
  console.error('[data] authorized classical quote dataset is missing.');
} else {
  const quoteInput = readJson(authorizedClassicalQuotePath);
  const quoteReport = validateAuthorizedClassicalQuoteDataset(quoteInput);
  const quoteDataset = authorizedClassicalQuoteDatasetSchema.safeParse(quoteInput);
  if (!quoteReport.valid || !quoteDataset.success) {
    hasErrors = true;
    console.error('[data] authorized classical quote dataset failed', quoteReport.issues);
  } else {
    const rawSourcePath = resolve(workspaceRoot, quoteDataset.data.sourceFile.path);
    if (!rawSourcePath.startsWith(`${workspaceRoot}${process.platform === 'win32' ? '\\' : '/'}`)) {
      hasErrors = true;
      console.error('[data] authorized classical source path escapes the workspace.');
    } else if (!existsSync(rawSourcePath)) {
      hasErrors = true;
      console.error('[data] authorized classical raw source file is missing.');
    } else {
      const rawBytes = readFileSync(rawSourcePath);
      const rawSha256 = createHash('sha256').update(rawBytes).digest('hex');
      if (
        rawSha256 !== quoteDataset.data.sourceFile.sha256 ||
        rawBytes.length !== quoteDataset.data.sourceFile.byteCount
      ) {
        hasErrors = true;
        console.error('[data] authorized classical raw source integrity mismatch.');
      } else {
        console.info(
          `[data] authorized classical quotes passed (${quoteReport.judgmentCount} judgments, ${quoteReport.lineTextCount} line texts).`,
        );
      }
    }
  }
}

const draftInterpretationPath = resolve(
  workspaceRoot,
  'data/draft/interpretations/hexagram-line-explanations-user-submitted-v1.json',
);
if (!existsSync(draftInterpretationPath)) {
  hasErrors = true;
  console.error('[data] draft interpretation dataset is missing.');
} else {
  const interpretationInput = readJson(draftInterpretationPath);
  const interpretationReport = validateDraftInterpretationDataset(interpretationInput);
  const interpretationDataset = draftInterpretationDatasetSchema.safeParse(interpretationInput);
  if (!interpretationReport.valid || !interpretationDataset.success) {
    hasErrors = true;
    console.error('[data] draft interpretation dataset failed', interpretationReport.issues);
  } else {
    const rawSourcePath = resolve(workspaceRoot, interpretationDataset.data.sourceFile.path);
    if (!rawSourcePath.startsWith(`${workspaceRoot}${process.platform === 'win32' ? '\\' : '/'}`)) {
      hasErrors = true;
      console.error('[data] draft interpretation source path escapes the workspace.');
    } else if (!existsSync(rawSourcePath)) {
      hasErrors = true;
      console.error('[data] draft interpretation raw source file is missing.');
    } else {
      const rawBytes = readFileSync(rawSourcePath);
      const rawSha256 = createHash('sha256').update(rawBytes).digest('hex');
      if (
        rawSha256 !== interpretationDataset.data.sourceFile.sha256 ||
        rawBytes.length !== interpretationDataset.data.sourceFile.byteCount
      ) {
        hasErrors = true;
        console.error('[data] draft interpretation raw source integrity mismatch.');
      } else {
        console.info(
          `[data] draft interpretations passed (${interpretationReport.judgmentCount} judgments, ${interpretationReport.lineExplanationCount} line explanations; publication disabled).`,
        );
      }
    }
  }
}

const authorizedInterpretationPath = resolve(
  workspaceRoot,
  'data/source/interpretations/hexagram-line-explanations-authorized-v1.json',
);
if (!existsSync(authorizedInterpretationPath)) {
  hasErrors = true;
  console.error('[data] authorized interpretation dataset is missing.');
} else {
  const interpretationInput = readJson(authorizedInterpretationPath);
  const interpretationReport = validateAuthorizedInterpretationDataset(interpretationInput);
  const interpretationDataset =
    authorizedInterpretationDatasetSchema.safeParse(interpretationInput);
  if (!interpretationReport.valid || !interpretationDataset.success) {
    hasErrors = true;
    console.error('[data] authorized interpretation dataset failed', interpretationReport.issues);
  } else {
    const rawSourcePath = resolve(workspaceRoot, interpretationDataset.data.sourceFile.path);
    if (!rawSourcePath.startsWith(`${workspaceRoot}${process.platform === 'win32' ? '\\' : '/'}`)) {
      hasErrors = true;
      console.error('[data] authorized interpretation source path escapes the workspace.');
    } else if (!existsSync(rawSourcePath)) {
      hasErrors = true;
      console.error('[data] authorized interpretation raw source file is missing.');
    } else {
      const rawBytes = readFileSync(rawSourcePath);
      const rawSha256 = createHash('sha256').update(rawBytes).digest('hex');
      if (
        rawSha256 !== interpretationDataset.data.sourceFile.sha256 ||
        rawBytes.length !== interpretationDataset.data.sourceFile.byteCount
      ) {
        hasErrors = true;
        console.error('[data] authorized interpretation raw source integrity mismatch.');
      } else {
        console.info(
          `[data] authorized interpretations passed (${interpretationReport.judgmentCount} judgments, ${interpretationReport.lineExplanationCount} line explanations).`,
        );
      }
    }
  }
}

const candidateChecks = [
  [
    'classical candidate',
    resolve(workspaceRoot, 'data/draft/classical/classical-text-units-candidate.json'),
    classicalCandidatePackSchema,
  ],
  [
    'professional candidate',
    resolve(workspaceRoot, 'data/draft/professional/jingfang-yehe-baseline-candidate.json'),
    professionalCandidatePackSchema,
  ],
  [
    'product editorial candidate',
    resolve(workspaceRoot, 'data/draft/product/product-editorial-candidate.json'),
    productCandidatePackSchema,
  ],
  [
    'hexagram page manifest',
    resolve(workspaceRoot, 'data/draft/manifests/hexagram-page-manifest.json'),
    hexagramPageManifestSchema,
  ],
  [
    'module five ruleset candidate',
    resolve(workspaceRoot, 'data/draft/professional/jingfang-yehe-baseline-1.0.0-candidate.1.json'),
    professionalRulesetCandidateDocumentSchema,
  ],
  [
    'module five calendar candidate',
    resolve(workspaceRoot, 'data/draft/professional/calendar-2026-candidate.1.json'),
    professionalCalendarCandidateDocumentSchema,
  ],
  [
    'module five source manifest candidate',
    resolve(workspaceRoot, 'data/draft/professional/source-manifest-candidate.1.json'),
    professionalSourceManifestCandidateDocumentSchema,
  ],
  [
    'module five gold cases candidate',
    resolve(workspaceRoot, 'data/draft/professional/gold-cases-candidate.1.json'),
    professionalGoldCasesCandidateDocumentSchema,
  ],
] as const;

for (const [label, file, schema] of candidateChecks) {
  const result = schema.safeParse(readJson(file));
  if (!result.success) {
    hasErrors = true;
    console.error(`[data] ${label} failed`, result.error.issues);
  } else {
    console.info(`[data] ${label} passed`);
  }
}

const classicalSeedDirectory = resolve(workspaceRoot, 'data/draft/classical/kanripo-kr1a0001');
const classicalSeedManifestPath = resolve(classicalSeedDirectory, 'manifest.json');

if (!existsSync(classicalSeedManifestPath)) {
  hasErrors = true;
  console.error(
    '[data] Kanripo classical seed manifest is missing. Run the reviewed collector first.',
  );
} else {
  const seedManifest = kanripoClassicalSeedManifestSchema.safeParse(
    readJson(classicalSeedManifestPath),
  );
  if (!seedManifest.success) {
    hasErrors = true;
    console.error('[data] Kanripo classical seed manifest failed', seedManifest.error.issues);
  } else {
    const expectedNames = new Set(
      Array.from(
        { length: 69 },
        (_, index) => `files/KR1a0001_${String(index + 1).padStart(3, '0')}.txt`,
      ),
    );
    const manifestNames = new Set(seedManifest.data.files.map((file) => file.path));
    if (
      manifestNames.size !== 69 ||
      expectedNames.size !== manifestNames.size ||
      [...expectedNames].some((name) => !manifestNames.has(name))
    ) {
      hasErrors = true;
      console.error('[data] Kanripo classical seed filenames are incomplete or duplicated.');
    }

    const digestEntries: Record<string, string | number>[] = [];
    for (const file of seedManifest.data.files) {
      const filePath = resolve(classicalSeedDirectory, file.path);
      if (
        !filePath.startsWith(
          `${classicalSeedDirectory}${process.platform === 'win32' ? '\\' : '/'}`,
        )
      ) {
        hasErrors = true;
        console.error(`[data] Kanripo classical seed path escapes its collection: ${file.path}`);
        continue;
      }
      if (!existsSync(filePath)) {
        hasErrors = true;
        console.error(`[data] Kanripo classical seed file is missing: ${file.path}`);
        continue;
      }
      const bytes = readFileSync(filePath);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const gitBlobSha1 = createHash('sha1')
        .update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))
        .digest('hex');
      if (
        sha256 !== file.sha256 ||
        gitBlobSha1 !== file.gitBlobSha1 ||
        bytes.length !== file.byteCount
      ) {
        hasErrors = true;
        console.error(`[data] Kanripo classical seed integrity mismatch: ${file.path}`);
      }
      digestEntries.push({
        path: file.path,
        sourceUrl: file.sourceUrl,
        gitBlobSha1: file.gitBlobSha1,
        sha256: file.sha256,
        byteCount: file.byteCount,
      });
    }
    const collectionSha256 = createHash('sha256')
      .update(
        canonicalJson(
          digestEntries.sort((left, right) => String(left.path).localeCompare(String(right.path))),
        ),
      )
      .digest('hex');
    if (collectionSha256 !== seedManifest.data.collectionSha256) {
      hasErrors = true;
      console.error('[data] Kanripo classical seed collection hash mismatch.');
    }
    if (!hasErrors) {
      console.info('[data] Kanripo classical seed passed');
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
}

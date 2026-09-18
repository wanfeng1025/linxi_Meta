import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { format } from 'prettier';
import { z } from 'zod';

import {
  branchRelationRecordSchema,
  contentDatasetSchema,
  contentTextRecordSchema,
  dataSourceRecordSchema,
  earthlyBranchRecordSchema,
  hexagramLineRecordSchema,
  hexagramRecordSchema,
  interpretationTemplateRecordSchema,
  najiaAssignmentRecordSchema,
  palaceHexagramRecordSchema,
  questionCategoryRecordSchema,
  ruleVersionRecordSchema,
  sixRelativeRuleRecordSchema,
  sixSpiritRecordSchema,
  sixSpiritRuleRecordSchema,
  specialLineTextRecordSchema,
  trigramRecordSchema,
} from './content-data-schema';
import {
  professionalCalendarCandidateDocumentSchema,
  professionalGoldCasesCandidateDocumentSchema,
  professionalRulesetCandidateDocumentSchema,
  professionalRulesetInputSchema,
  professionalSourceManifestCandidateDocumentSchema,
} from './professional-ruleset-schema';
import {
  classicalCandidatePackSchema,
  hexagramPageManifestSchema,
  productCandidatePackSchema,
  professionalCandidatePackSchema,
} from './m4-candidate-schema';
import { authorizedClassicalQuoteDatasetSchema } from './classical-quote-source-schema';
import { authorizedInterpretationDatasetSchema } from './authorized-interpretation-source-schema';
import { draftInterpretationDatasetSchema } from './draft-interpretation-schema';

const schemaBase = 'https://liuyao.app/schemas';
const outputDirectory = resolve(process.cwd(), 'schemas');
const schemas = {
  'data-source': dataSourceRecordSchema,
  'rule-version': ruleVersionRecordSchema,
  trigram: trigramRecordSchema,
  hexagram: hexagramRecordSchema,
  'hexagram-line': hexagramLineRecordSchema,
  'special-line-text': specialLineTextRecordSchema,
  'content-text': contentTextRecordSchema,
  palace: palaceHexagramRecordSchema,
  'earthly-branch': earthlyBranchRecordSchema,
  najia: najiaAssignmentRecordSchema,
  'six-relative-rule': sixRelativeRuleRecordSchema,
  'six-spirit': sixSpiritRecordSchema,
  'six-spirit-rule': sixSpiritRuleRecordSchema,
  'branch-relation': branchRelationRecordSchema,
  'question-category': questionCategoryRecordSchema,
  'interpretation-template': interpretationTemplateRecordSchema,
  'content-dataset': contentDatasetSchema,
  'professional-ruleset': professionalRulesetInputSchema,
  'professional-ruleset-candidate-document': professionalRulesetCandidateDocumentSchema,
  'professional-calendar-candidate-document': professionalCalendarCandidateDocumentSchema,
  'professional-source-manifest-candidate-document':
    professionalSourceManifestCandidateDocumentSchema,
  'professional-gold-cases-candidate-document': professionalGoldCasesCandidateDocumentSchema,
  'classical-candidate-pack': classicalCandidatePackSchema,
  'professional-candidate-pack': professionalCandidatePackSchema,
  'product-candidate-pack': productCandidatePackSchema,
  'hexagram-page-manifest': hexagramPageManifestSchema,
  'authorized-classical-quote-dataset': authorizedClassicalQuoteDatasetSchema,
  'authorized-interpretation-dataset': authorizedInterpretationDatasetSchema,
  'draft-interpretation-dataset': draftInterpretationDatasetSchema,
} as const;

async function main(): Promise<void> {
  mkdirSync(outputDirectory, { recursive: true });
  const checkOnly = process.argv.includes('--check');
  let driftDetected = false;
  for (const [name, schema] of Object.entries(schemas)) {
    const generated = z.toJSONSchema(schema, {
      target: 'draft-2020-12',
      io: 'input',
      reused: 'ref',
    });
    const document = {
      ...generated,
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: `${schemaBase}/${name}.schema.json`,
      $comment:
        'Generated from scripts/content-data-schema.ts. Cross-record and release-gate rules are enforced by validateContentDataset.',
    };
    const path = resolve(outputDirectory, `${name}.schema.json`);
    const rendered = await format(JSON.stringify(document), {
      parser: 'json',
      printWidth: 100,
    });
    if (checkOnly) {
      if (!existsSync(path) || readFileSync(path, 'utf8') !== rendered) {
        driftDetected = true;
        console.error(`[content-schema] ${name}.schema.json is missing or stale`);
      }
    } else {
      writeFileSync(path, rendered, 'utf8');
    }
  }

  if (driftDetected) {
    process.exitCode = 1;
  } else {
    console.info(
      `[content-schema] ${checkOnly ? 'verified' : 'generated'} ${Object.keys(schemas).length} JSON Schema files`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error('[content-schema] generation failed', error);
  process.exitCode = 1;
});

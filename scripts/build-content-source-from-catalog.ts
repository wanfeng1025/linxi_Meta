import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { format } from 'prettier';

import { canonicalJson } from '../src/shared/data/canonical-json';
import { validateContentDataset, type ContentDataset } from './content-data-schema';
import {
  hexagramContentSchema,
  trigramContentSchema,
  verifiedCatalogSchema,
  type TraditionalContentRecord,
} from './data-schema';

const catalogPath = resolve(process.cwd(), 'data/catalog/index.json');
const outputPath = resolve(process.cwd(), 'data/source/content-dataset.json');
const checkOnly = process.argv.includes('--check');

function checksum(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function sourceVersion(record: TraditionalContentRecord): string {
  return record.source.contentVersion;
}

function audit(record: TraditionalContentRecord) {
  return {
    sourceId: record.source.sourceId,
    sourceVersion: sourceVersion(record),
    contentVersion: record.source.contentVersion,
    status: 'verified' as const,
    sourceLocator: `六爻App模块四内容数据库详细说明.txt sections 3-4; ${record.recordId}`,
    originalScript: 'simplified' as const,
    normalizationNotes:
      'Simplified names follow the approved project table; Unicode symbols are unchanged; bits remain bottom-to-top.',
    editorialChanges: 'Converted verified catalog field names to ContentDataset v2 only.',
    verifiedBy: record.source.verifiedBy,
    verifiedAt: record.source.verifiedAt,
    checksum: checksum(record),
  };
}

function makeDataset(records: readonly TraditionalContentRecord[]): ContentDataset {
  const versions = new Set(records.map((record) => record.source.contentVersion));
  if (versions.size !== 1) {
    throw new Error('Production content source requires exactly one catalog contentVersion.');
  }
  const contentVersion = [...versions][0];
  if (contentVersion === undefined) throw new Error('Verified catalog is empty.');

  const sourceRecords = new Map<string, TraditionalContentRecord>();
  for (const record of records) {
    sourceRecords.set(`${record.source.sourceId}@${sourceVersion(record)}`, record);
  }
  const dataSources: ContentDataset['dataSources'] = [...sourceRecords.values()].map((record) => ({
    sourceId: record.source.sourceId,
    sourceVersion: sourceVersion(record),
    title: record.source.sourceTitle,
    authorOrEditor: 'Project owner and repository reviewers',
    dynastyOrYear: '2026',
    edition: record.source.edition,
    publisherOrPlatform: 'Local project source; Unicode 17.0; Wikisource revision 7907208',
    locator: '六爻App模块四内容数据库详细说明.txt sections 3-4',
    sourceType: record.source.sourceType,
    url: null,
    licenseStatus: record.source.licenseStatus,
    publicDomainStatus: 'not-applicable',
    transcriptionStatus: 'not-applicable',
    proofreadingStatus: 'single-reviewed',
    accessedAt: record.source.verifiedAt,
    reliabilityGrade: 'C',
    status: 'verified',
    verifiedBy: record.source.verifiedBy,
    verifiedAt: record.source.verifiedAt,
    notes: record.source.notes,
  }));

  const trigrams: ContentDataset['trigrams'] = records
    .filter((record) => record.recordType === 'trigram')
    .map((record) => {
      const content = trigramContentSchema.parse(record.content);
      return {
        id: content.id,
        contentLayer: 'classical' as const,
        ...audit(record),
        nameSimplified: content.name,
        nameTraditional: null,
        unicodeSymbol: content.symbol,
        code: content.code,
        lineBits: content.lineBits,
        elementId: content.element,
        yinYangClass: null,
        familyRoleId: null,
        laterHeavenDirectionId: content.direction,
        naturalImages: [],
        virtues: [],
        aliases: [],
      };
    });
  const hexagrams: ContentDataset['hexagrams'] = records
    .filter((record) => record.recordType === 'hexagram')
    .map((record) => {
      const content = hexagramContentSchema.parse(record.content);
      return {
        id: content.id,
        contentLayer: 'classical' as const,
        ...audit(record),
        kingWenSequence: content.kingWenSequence,
        nameSimplified: content.name,
        nameTraditional: null,
        unicodeSymbol: content.symbol,
        aliases: [],
        upperTrigramId: content.upperTrigramId,
        lowerTrigramId: content.lowerTrigramId,
        code: content.code,
        lineBits: content.lineBits,
        sequenceNote:
          'Approved project table cross-checked with Unicode 17.0 and Wikisource revision 7907208.',
      };
    });

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://liuyao.app/schemas/content-dataset.schema.json',
    version: {
      contentVersion,
      schemaVersion: 'content-dataset-v2',
      status: 'verified',
      completenessMode: 'partial',
      createdAt: records[0]?.source.verifiedAt ?? '2026-07-20T00:00:00+08:00',
      notes:
        'Verified 8-trigram and 64-hexagram structural mapping only; no canonical prose, line text, professional rules, or modern explanation.',
    },
    dataSources,
    ruleVersions: [],
    trigrams,
    hexagrams,
    hexagramLines: [],
    specialLineTexts: [],
    contentTexts: [],
    palaceHexagrams: [],
    earthlyBranches: [],
    najiaAssignments: [],
    sixRelativeRules: [],
    sixSpirits: [],
    sixSpiritRules: [],
    branchRelations: [],
    questionCategories: [],
    interpretationTemplates: [],
    ruleDefinitions: [],
  };
}

async function main(): Promise<void> {
  const catalogInput = JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown;
  const catalog = verifiedCatalogSchema.parse(catalogInput);
  const dataset = makeDataset(catalog);
  const validation = validateContentDataset(dataset, { environment: 'production' });
  if (!validation.report.valid) {
    throw new Error(`Generated content source is invalid: ${JSON.stringify(validation.report)}`);
  }
  const rendered = await format(JSON.stringify(dataset), { parser: 'json', printWidth: 100 });
  if (checkOnly) {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
      console.error('[content-source] data/source/content-dataset.json is missing or stale');
      process.exitCode = 1;
      return;
    }
    console.info('[content-source] verified production source matches the approved catalog');
    return;
  }
  writeFileSync(outputPath, rendered, 'utf8');
  console.info(
    `[content-source] generated ${validation.report.counts.trigrams} trigrams and ${validation.report.counts.hexagrams} hexagrams`,
  );
}

void main().catch((error: unknown) => {
  console.error('[content-source] build failed', error);
  process.exitCode = 1;
});

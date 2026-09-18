import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { format } from 'prettier';

import {
  authorizedInterpretationChecksum,
  validateAuthorizedInterpretationDataset,
  type AuthorizedInterpretationDataset,
  type AuthorizedInterpretationRecord,
} from './authorized-interpretation-source-schema';
import { verifiedCatalogSchema } from './data-schema';
import { parseDraftInterpretationSource } from './import-draft-hexagram-line-explanations';

const workspaceRoot = process.cwd();
const rawSourcePath = resolve(
  workspaceRoot,
  'data/source/interpretations/hexagram-line-explanations-authorized-v1.txt',
);
const outputPath = resolve(
  workspaceRoot,
  'data/source/interpretations/hexagram-line-explanations-authorized-v1.json',
);
const catalogPath = resolve(workspaceRoot, 'data/catalog/index.json');
const checkOnly = process.argv.includes('--check');
const inputIndex = process.argv.indexOf('--input');
const inputPath =
  inputIndex >= 0 && process.argv[inputIndex + 1] !== undefined
    ? resolve(workspaceRoot, process.argv[inputIndex + 1] as string)
    : rawSourcePath;

const sourceId = 'hexagram-line-explanations-authorized-dataset-2026-07-26';
const contentVersion = 'hexagram-line-explanations-authorized-v1';
const verifiedAt = '2026-07-26T17:30:00+08:00';
const verifiedBy = 'project-owner-authorized-dataset-approval';

interface CatalogHexagram {
  readonly id: string;
  readonly name: string;
  readonly kingWenSequence: number;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function makeRecord(
  record: Omit<AuthorizedInterpretationRecord, 'checksum'>,
): AuthorizedInterpretationRecord {
  return { ...record, checksum: authorizedInterpretationChecksum(record) };
}

async function main(): Promise<void> {
  if (!existsSync(inputPath)) throw new Error(`Source file does not exist: ${inputPath}`);
  mkdirSync(resolve(workspaceRoot, 'data/source/interpretations'), { recursive: true });
  if (!checkOnly && inputPath !== rawSourcePath) copyFileSync(inputPath, rawSourcePath);
  if (!existsSync(rawSourcePath)) {
    throw new Error(`Repository source file does not exist: ${rawSourcePath}`);
  }

  const rawBytes = readFileSync(rawSourcePath);
  const raw = rawBytes.toString('utf8');
  const catalog = verifiedCatalogSchema.parse(
    JSON.parse(readFileSync(catalogPath, 'utf8')) as unknown,
  );
  const catalogBySequence = new Map<number, CatalogHexagram>(
    catalog
      .filter((record) => record.recordType === 'hexagram')
      .map((record) => {
        const content = record.content as unknown as CatalogHexagram;
        return [content.kingWenSequence, content] as const;
      }),
  );
  const candidateRecords = parseDraftInterpretationSource(raw, catalogBySequence);
  const records = candidateRecords.map(({ checksum: _checksum, ...candidate }) =>
    makeRecord({
      ...candidate,
      id: candidate.id.replace('draft-interpretation-', 'authorized-interpretation-'),
      sourceId,
      sourceVersion: contentVersion,
      contentVersion,
      status: 'verified',
      editorialNotes:
        '按项目负责人已确认的授权数据集逐条抽取；不改写、不补充解释。它仅作为原文学习参考，不生成或替代任何吉凶判断。',
    }),
  );
  const dataset: AuthorizedInterpretationDataset = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://liuyao.app/schemas/authorized-interpretation-dataset.schema.json',
    schemaVersion: 'authorized-interpretation-dataset-v1',
    contentVersion,
    source: {
      sourceId,
      sourceVersion: contentVersion,
      title: '六十四卦卦辞爻辞逐条解释_按顺序.txt（项目负责人授权学习参考数据集）',
      authorOrEditor: '项目负责人确认的授权数据集',
      dynastyOrYear: '2026',
      edition: '项目负责人于 2026-07-26 确认可公开发布的白话解读稿；简体字、现代标点版本',
      publisherOrPlatform: '项目本地已授权数据集',
      locator: '项目负责人提供的六十四卦卦辞爻辞逐条解释_按顺序.txt；以本仓库固定 SHA-256 文件为准',
      sourceType: 'authorized-dataset',
      url: null,
      licenseStatus: 'cleared',
      publicDomainStatus: 'not-applicable',
      transcriptionStatus: 'raw',
      proofreadingStatus: 'single-reviewed',
      accessedAt: verifiedAt,
      reliabilityGrade: 'C',
      status: 'verified',
      verifiedBy,
      verifiedAt,
      notes:
        '项目负责人于 2026-07-26 确认有权公开发布此白话解读稿，并批准其作为学习参考数据集。发布范围仅限 64 卦卦辞和 384 条普通爻辞的逐条释义；不发布为专业六爻规则、AI 提示词或任何针对用户问题的吉凶判断。',
    },
    sourceFile: {
      path: 'data/source/interpretations/hexagram-line-explanations-authorized-v1.txt',
      sha256: sha256(rawBytes),
      byteCount: rawBytes.length,
    },
    publication: {
      status: 'published',
      displayPurpose: 'educational-reference',
      usableForWebResult: true,
      usableForProfessionalRules: false,
      usableForAiPrompting: false,
      nonPredictionNotice:
        '本数据集是对已授权卦辞与爻辞的学习参考释义，不构成对用户问题的吉凶、医疗、法律或投资判断。',
    },
    records,
  };
  const validation = validateAuthorizedInterpretationDataset(dataset);
  if (!validation.valid) {
    throw new Error(`Generated interpretation data is invalid: ${validation.issues.join('; ')}`);
  }

  const rendered = await format(JSON.stringify(dataset), { parser: 'json', printWidth: 100 });
  if (checkOnly) {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
      throw new Error('Authorized interpretation dataset is missing or stale.');
    }
    console.info(
      `[authorized-interpretations] ${validation.judgmentCount} judgment explanations and ${validation.lineExplanationCount} line explanations match the authorized source.`,
    );
    return;
  }
  writeFileSync(outputPath, rendered, 'utf8');
  console.info(
    `[authorized-interpretations] generated ${validation.judgmentCount} judgment explanations and ${validation.lineExplanationCount} line explanations.`,
  );
}

void main().catch((error: unknown) => {
  console.error('[authorized-interpretations] import failed', error);
  process.exitCode = 1;
});

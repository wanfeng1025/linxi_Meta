import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { format } from 'prettier';

import { verifiedCatalogSchema } from './data-schema';
import {
  draftInterpretationChecksum,
  validateDraftInterpretationDataset,
  type DraftInterpretationDataset,
  type DraftInterpretationRecord,
} from './draft-interpretation-schema';

const workspaceRoot = process.cwd();
const rawSourcePath = resolve(
  workspaceRoot,
  'data/draft/interpretations/hexagram-line-explanations-user-submitted-v1.txt',
);
const outputPath = resolve(
  workspaceRoot,
  'data/draft/interpretations/hexagram-line-explanations-user-submitted-v1.json',
);
const catalogPath = resolve(workspaceRoot, 'data/catalog/index.json');
const checkOnly = process.argv.includes('--check');
const inputIndex = process.argv.indexOf('--input');
const inputPath =
  inputIndex >= 0 && process.argv[inputIndex + 1] !== undefined
    ? resolve(workspaceRoot, process.argv[inputIndex + 1] as string)
    : rawSourcePath;

const sourceId = 'hexagram-line-explanations-user-submitted-2026-07-26';
const contentVersion = 'draft-hexagram-line-explanations-user-submitted-v1';

interface CatalogHexagram {
  readonly id: string;
  readonly name: string;
  readonly kingWenSequence: number;
}

interface ParsedHeader {
  readonly sequence: number;
  readonly name: string;
  readonly start: number;
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function positionForLabel(label: string): number {
  const marker =
    label.startsWith('初') || label.startsWith('上') ? label.slice(0, 1) : label.slice(1, 2);
  const position = { 初: 1, 二: 2, 三: 3, 四: 4, 五: 5, 上: 6 }[marker];
  if (position === undefined) throw new Error(`Unsupported line label: ${label}`);
  return position;
}

function makeRecord(
  record: Omit<DraftInterpretationRecord, 'checksum'>,
): DraftInterpretationRecord {
  return { ...record, checksum: draftInterpretationChecksum(record) };
}

function parseHeaders(raw: string): readonly ParsedHeader[] {
  const matches = [...raw.matchAll(/^\s*(\d{2})\s+([^\s]+)卦\s+.+$/gm)];
  return matches.map((match) => ({
    sequence: Number(match[1]),
    name: match[2] as string,
    start: match.index ?? 0,
  }));
}

export function parseDraftInterpretationSource(
  raw: string,
  catalogBySequence: ReadonlyMap<number, CatalogHexagram>,
): readonly DraftInterpretationRecord[] {
  const headers = parseHeaders(raw);
  if (headers.length !== 64 || new Set(headers.map((header) => header.sequence)).size !== 64) {
    throw new Error(`Expected 64 unique hexagram headers, found ${headers.length}.`);
  }

  const records: DraftInterpretationRecord[] = [];
  for (const [index, header] of headers.entries()) {
    const end = headers[index + 1]?.start ?? raw.length;
    const block = raw.slice(header.start, end);
    const catalogHexagram = catalogBySequence.get(header.sequence);
    if (catalogHexagram === undefined) {
      throw new Error(
        `No verified catalog hexagram exists for King Wen sequence ${header.sequence}.`,
      );
    }
    if (catalogHexagram.name !== header.name) {
      throw new Error(
        `Header ${header.sequence} is ${header.name}, but the verified catalog expects ${catalogHexagram.name}.`,
      );
    }

    const sequence = String(header.sequence).padStart(2, '0');
    const quotePrefix = `classical-quote-hexagram-kw-${sequence}`;
    const judgmentMatch = block.match(/^卦辞：([^\r\n]+)\r?\n含义：([^\r\n]+)$/m);
    if (judgmentMatch?.[2] === undefined) {
      throw new Error(`Could not locate the judgment explanation for ${sequence} ${header.name}.`);
    }
    records.push(
      makeRecord({
        id: `draft-interpretation-hexagram-kw-${sequence}-judgment`,
        contentLayer: 'modern-interpretation',
        interpretationKind: 'judgment-explanation',
        hexagramId: catalogHexagram.id,
        kingWenSequence: header.sequence,
        hexagramName: header.name,
        linePosition: null,
        lineLabel: null,
        canonicalQuoteId: `${quotePrefix}-judgment`,
        locale: 'zh-Hans',
        interpretation: judgmentMatch[2].trim(),
        sourceId,
        sourceVersion: contentVersion,
        contentVersion,
        status: 'pending',
        sourceLocator: `六十四卦卦辞爻辞逐条解释_按顺序.txt：第 ${sequence} 卦 ${header.name} · 卦辞解释`,
        editorialNotes:
          '逐条抽取用户提供的白话解读；不改写其内容。原文引用在运行时必须由独立的已授权古籍引用数据集提供。',
      }),
    );

    const foundPositions = new Set<number>();
    const linePattern = /^((?:初|上)[六九]|[六九][二三四五])：([^\r\n]+)\r?\n含义：([^\r\n]+)$/gm;
    for (const match of block.matchAll(linePattern)) {
      const lineLabel = match[1];
      const interpretation = match[3];
      if (lineLabel === undefined || interpretation === undefined) continue;
      const linePosition = positionForLabel(lineLabel);
      if (foundPositions.has(linePosition)) {
        throw new Error(`Duplicate line position ${linePosition} for ${sequence} ${header.name}.`);
      }
      foundPositions.add(linePosition);
      records.push(
        makeRecord({
          id: `draft-interpretation-hexagram-kw-${sequence}-line-${linePosition}`,
          contentLayer: 'modern-interpretation',
          interpretationKind: 'line-explanation',
          hexagramId: catalogHexagram.id,
          kingWenSequence: header.sequence,
          hexagramName: header.name,
          linePosition,
          lineLabel,
          canonicalQuoteId: `${quotePrefix}-line-${linePosition}`,
          locale: 'zh-Hans',
          interpretation: interpretation.trim(),
          sourceId,
          sourceVersion: contentVersion,
          contentVersion,
          status: 'pending',
          sourceLocator: `六十四卦卦辞爻辞逐条解释_按顺序.txt：第 ${sequence} 卦 ${header.name} · ${lineLabel} 解释`,
          editorialNotes:
            '逐条抽取用户提供的白话解读；不改写其内容。原文引用在运行时必须由独立的已授权古籍引用数据集提供。',
        }),
      );
    }
    if (
      foundPositions.size !== 6 ||
      [1, 2, 3, 4, 5, 6].some((position) => !foundPositions.has(position))
    ) {
      throw new Error(`Expected six line explanations for ${sequence} ${header.name}.`);
    }
  }
  return records;
}

async function main(): Promise<void> {
  if (!existsSync(inputPath)) throw new Error(`Source file does not exist: ${inputPath}`);
  mkdirSync(resolve(workspaceRoot, 'data/draft/interpretations'), { recursive: true });
  if (!checkOnly && inputPath !== rawSourcePath) copyFileSync(inputPath, rawSourcePath);
  if (!existsSync(rawSourcePath)) {
    throw new Error(`Repository draft source file does not exist: ${rawSourcePath}`);
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
  const records = parseDraftInterpretationSource(raw, catalogBySequence);
  const dataset: DraftInterpretationDataset = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://liuyao.app/schemas/draft-interpretation-dataset.schema.json',
    schemaVersion: 'draft-interpretation-dataset-v1',
    contentVersion,
    source: {
      sourceId,
      sourceVersion: contentVersion,
      title: '六十四卦卦辞爻辞逐条解释_按顺序.txt（用户提交的白话解读稿）',
      authorOrEditor: null,
      dynastyOrYear: null,
      edition: null,
      publisherOrPlatform: '用户本地提供文件',
      locator: '项目负责人提供的本地文本；以本仓库固定 SHA-256 文件为准',
      sourceType: 'pending',
      url: null,
      licenseStatus: 'pending',
      publicDomainStatus: 'not-applicable',
      transcriptionStatus: 'raw',
      proofreadingStatus: 'pending',
      accessedAt: null,
      reliabilityGrade: 'P',
      status: 'draft',
      verifiedBy: null,
      verifiedAt: null,
      notes:
        '文件自述为依据六爻大概.txt整理的白话解读稿，不是正式校勘本。当前未收到该解读稿的可公开发布授权、作者/版本信息或逐条人工审核记录；仅作为隔离候选数据，绝不供网站、起卦结果、专业规则或 AI 使用。',
    },
    sourceFile: {
      path: 'data/draft/interpretations/hexagram-line-explanations-user-submitted-v1.txt',
      sha256: sha256(rawBytes),
      byteCount: rawBytes.length,
    },
    releaseGate: {
      status: 'pending',
      publicationEligible: false,
      usableForCastingResult: false,
      usableForProfessionalRules: false,
      usableForAiPrompting: false,
      outstandingRequirements: [
        '确认作者、版本和可公开再发布授权范围。',
        '逐条核对其关联的卦辞、爻辞与已授权古籍引用版本。',
        '由两位具名审核人完成解释边界、风险表述和文本质量复核。',
        '经产品负责人显式批准后新建发布版本，且保持与候选版本并存。',
      ],
    },
    records,
  };
  const validation = validateDraftInterpretationDataset(dataset);
  if (!validation.valid) {
    throw new Error(`Generated interpretation data is invalid: ${validation.issues.join('; ')}`);
  }

  const rendered = await format(JSON.stringify(dataset), { parser: 'json', printWidth: 100 });
  if (checkOnly) {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
      throw new Error('Draft interpretation dataset is missing or stale.');
    }
    console.info(
      `[draft-interpretations] ${validation.judgmentCount} judgment explanations and ${validation.lineExplanationCount} line explanations are isolated as pending candidates.`,
    );
    return;
  }
  writeFileSync(outputPath, rendered, 'utf8');
  console.info(
    `[draft-interpretations] generated ${validation.judgmentCount} judgment explanations and ${validation.lineExplanationCount} line explanations as pending candidates.`,
  );
}

if (process.argv[1]?.endsWith('import-draft-hexagram-line-explanations.ts')) {
  void main().catch((error: unknown) => {
    console.error('[draft-interpretations] import failed', error);
    process.exitCode = 1;
  });
}

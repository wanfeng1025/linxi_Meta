import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { format } from 'prettier';

import { verifiedCatalogSchema } from './data-schema';
import {
  quoteChecksum,
  validateAuthorizedClassicalQuoteDataset,
  type AuthorizedClassicalQuoteDataset,
  type ClassicalQuoteRecord,
} from './classical-quote-source-schema';

const workspaceRoot = process.cwd();
const rawSourcePath = resolve(
  workspaceRoot,
  'data/source/classical/liuyao-overview-authorized-v1.txt',
);
const outputPath = resolve(
  workspaceRoot,
  'data/source/classical/liuyao-overview-authorized-v1.json',
);
const catalogPath = resolve(workspaceRoot, 'data/catalog/index.json');
const checkOnly = process.argv.includes('--check');
const inputIndex = process.argv.indexOf('--input');
const inputPath =
  inputIndex >= 0 && process.argv[inputIndex + 1] !== undefined
    ? resolve(workspaceRoot, process.argv[inputIndex + 1] as string)
    : rawSourcePath;

const sourceId = 'liuyao-overview-authorized-dataset-2026-07-26';
const contentVersion = 'liuyao-overview-authorized-v1';
const verifiedAt = '2026-07-26T12:00:00+08:00';
const verifiedBy = 'project-owner-authorized-dataset-approval';

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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function positionForLabel(label: string): number {
  const marker =
    label.startsWith('初') || label.startsWith('上') ? label.slice(0, 1) : label.slice(1, 2);
  const position = { 初: 1, 二: 2, 三: 3, 四: 4, 五: 5, 上: 6 }[marker];
  if (position === undefined) throw new Error(`Unsupported line label: ${label}`);
  return position;
}

function parseHeaders(raw: string): readonly ParsedHeader[] {
  const matches = [...raw.matchAll(/^\s*(\d{1,2})\s*卦?\s+([^\s]+)卦.*$/gm)];
  return matches.map((match) => ({
    sequence: Number(match[1]),
    name: match[2] as string,
    start: match.index ?? 0,
  }));
}

function makeQuote(record: Omit<ClassicalQuoteRecord, 'checksum'>): ClassicalQuoteRecord {
  return { ...record, checksum: quoteChecksum(record) };
}

function parseQuotes(raw: string, catalogBySequence: ReadonlyMap<number, CatalogHexagram>) {
  const headers = parseHeaders(raw);
  if (headers.length !== 64 || new Set(headers.map((header) => header.sequence)).size !== 64) {
    throw new Error(`Expected 64 unique hexagram headers, found ${headers.length}.`);
  }

  const records: ClassicalQuoteRecord[] = [];
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

    const judgmentMatch = block.match(
      new RegExp(`^\\s*${escapeRegex(header.name)}：([^\\r\\n]+)$`, 'm'),
    );
    if (judgmentMatch?.[1] === undefined) {
      throw new Error(`Could not locate the judgment text for ${header.sequence} ${header.name}.`);
    }
    const judgmentText = `${header.name}：${judgmentMatch[1].trim()}`;
    records.push(
      makeQuote({
        id: `classical-quote-hexagram-kw-${String(header.sequence).padStart(2, '0')}-judgment`,
        contentLayer: 'classical',
        quoteKind: 'judgment',
        hexagramId: catalogHexagram.id,
        kingWenSequence: header.sequence,
        hexagramName: header.name,
        linePosition: null,
        lineLabel: null,
        textClass: 'canonical',
        locale: 'zh-Hans',
        text: judgmentText,
        sourceId,
        sourceVersion: contentVersion,
        contentVersion,
        status: 'verified',
        sourceLocator: `六爻大概.txt：第 ${String(header.sequence).padStart(2, '0')} 卦 ${header.name} · 卦辞`,
        originalScript: 'simplified',
        normalizationNotes: '保留授权文件中的简体字和现代标点；不改写、不补字、不以其他版本校勘。',
        editorialChanges: '仅从标题与条目标记中提取为可查询记录；原文内容不作解释或改写。',
        verifiedBy,
        verifiedAt,
      }),
    );

    const foundPositions = new Set<number>();
    for (const line of block.split(/\r?\n/)) {
      const lineMatch = line.match(
        /^\s*(初[九六]|[九六][二三四五]|上[九六])\s*(?:：|:|，|,)\s*(.+?)\s*(?:\t| {2,})《象》\s*[曰日]：/,
      );
      if (lineMatch?.[1] === undefined || lineMatch[2] === undefined) continue;
      const lineLabel = lineMatch[1];
      const linePosition = positionForLabel(lineLabel);
      if (foundPositions.has(linePosition)) {
        throw new Error(
          `Duplicate line position ${linePosition} for ${header.sequence} ${header.name}.`,
        );
      }
      foundPositions.add(linePosition);
      records.push(
        makeQuote({
          id: `classical-quote-hexagram-kw-${String(header.sequence).padStart(2, '0')}-line-${linePosition}`,
          contentLayer: 'classical',
          quoteKind: 'line-text',
          hexagramId: catalogHexagram.id,
          kingWenSequence: header.sequence,
          hexagramName: header.name,
          linePosition,
          lineLabel,
          textClass: 'canonical',
          locale: 'zh-Hans',
          text: `${lineLabel}：${lineMatch[2].trim()}`,
          sourceId,
          sourceVersion: contentVersion,
          contentVersion,
          status: 'verified',
          sourceLocator: `六爻大概.txt：第 ${String(header.sequence).padStart(2, '0')} 卦 ${header.name} · ${lineLabel}`,
          originalScript: 'simplified',
          normalizationNotes:
            '保留授权文件中的简体字和现代标点；不改写、不补字、不以其他版本校勘。',
          editorialChanges: '仅剥离同一行的《象》曰标记与后续文本，保留爻辞原文；不作解释或改写。',
          verifiedBy,
          verifiedAt,
        }),
      );
    }
    if (
      foundPositions.size !== 6 ||
      [1, 2, 3, 4, 5, 6].some((position) => !foundPositions.has(position))
    ) {
      throw new Error(`Expected six ordinary line texts for ${header.sequence} ${header.name}.`);
    }
  }
  return records;
}

async function main(): Promise<void> {
  if (!existsSync(inputPath)) throw new Error(`Source file does not exist: ${inputPath}`);
  if (!checkOnly && inputPath !== rawSourcePath) copyFileSync(inputPath, rawSourcePath);
  if (!existsSync(rawSourcePath))
    throw new Error(`Repository source file does not exist: ${rawSourcePath}`);

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
  const records = parseQuotes(raw, catalogBySequence);
  const dataset: AuthorizedClassicalQuoteDataset = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    schemaId: 'https://liuyao.app/schemas/authorized-classical-quote-dataset.schema.json',
    schemaVersion: 'authorized-classical-quote-dataset-v1',
    contentVersion,
    source: {
      sourceId,
      sourceVersion: contentVersion,
      title: '六爻大概.txt（项目负责人授权数据集）',
      authorOrEditor: '项目负责人授权数据集',
      dynastyOrYear: '2026',
      edition: '项目负责人授权的六爻大概.txt；简体字、现代标点版本',
      publisherOrPlatform: '项目本地已授权数据集',
      locator: '项目负责人提供的六爻大概.txt；以本仓库固定 SHA-256 文件为准',
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
        '项目负责人于 2026-07-26 明确确认有权公开发布此文件，并批准其作为授权数据集。当前发布范围仅为 64 卦卦辞和 384 条普通爻辞原文引用；彖传、象传和专业六爻规则不在本数据集内。白话学习释义由独立、单独授权的数据集管理。',
    },
    sourceFile: {
      path: 'data/source/classical/liuyao-overview-authorized-v1.txt',
      sha256: sha256(rawBytes),
      byteCount: rawBytes.length,
    },
    records,
  };
  const validation = validateAuthorizedClassicalQuoteDataset(dataset);
  if (!validation.valid)
    throw new Error(`Generated quote data is invalid: ${validation.issues.join('; ')}`);

  const rendered = await format(JSON.stringify(dataset), { parser: 'json', printWidth: 100 });
  if (checkOnly) {
    if (!existsSync(outputPath) || readFileSync(outputPath, 'utf8') !== rendered) {
      throw new Error('Authorized classical quote dataset is missing or stale.');
    }
    console.info(
      `[classical-quotes] ${validation.judgmentCount} judgments and ${validation.lineTextCount} line texts match the authorized source.`,
    );
    return;
  }
  writeFileSync(outputPath, rendered, 'utf8');
  console.info(
    `[classical-quotes] generated ${validation.judgmentCount} judgments and ${validation.lineTextCount} line texts.`,
  );
}

void main().catch((error: unknown) => {
  console.error('[classical-quotes] import failed', error);
  process.exitCode = 1;
});

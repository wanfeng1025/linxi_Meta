import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type {
  EarthlyBranchRule,
  NajiaRule,
  PalaceRule,
  ProfessionalRulesetInput,
  SixRelativeRule,
  SixSpiritDefinition,
  SixSpiritStartRule,
  VoidRule,
} from '@/domain/professional';
import { canonicalJson } from '@/shared/data/canonical-json';

type CatalogRecord = {
  readonly recordType: 'trigram' | 'hexagram';
  readonly content: {
    readonly id: string;
    readonly name: string;
  };
};

const RULESET_ID = 'jingfang_yehe_baseline';
const RULESET_VERSION = '1.0.0-candidate.1';
const CONTENT_VERSION = 'professional-candidate-2026-07-20-v1';
const SOURCE_VERSION = 'candidate-manifest-2026-07-20-v1';
const ACCEPTANCE_PACKAGE_SHA256 =
  '8F5118AB2DE1ED04D2CFF14977CC2C10BF22E90E7390ECB1DCD73FCFB429DFEB';

const palaceDefinitions = [
  ['trigram-qian', 'metal', ['乾', '姤', '遁', '否', '观', '剥', '晋', '大有']],
  ['trigram-zhen', 'wood', ['震', '豫', '解', '恒', '升', '井', '大过', '随']],
  ['trigram-kan', 'water', ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师']],
  ['trigram-gen', 'earth', ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐']],
  ['trigram-kun', 'earth', ['坤', '复', '临', '泰', '大壮', '夬', '需', '比']],
  ['trigram-xun', 'wood', ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊']],
  ['trigram-li', 'fire', ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人']],
  ['trigram-dui', 'metal', ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹']],
] as const;

const stages = [
  'base',
  'first-change',
  'second-change',
  'third-change',
  'fourth-change',
  'fifth-change',
  'wandering-soul',
  'returning-soul',
] as const;

const worldResponse = [
  [6, 3],
  [1, 4],
  [2, 5],
  [3, 6],
  [4, 1],
  [5, 2],
  [4, 1],
  [3, 6],
] as const;

const trigramNajia = [
  [
    'trigram-qian',
    ['stem-jia', 'branch-zi'],
    ['stem-jia', 'branch-yin'],
    ['stem-jia', 'branch-chen'],
    ['stem-ren', 'branch-wu'],
    ['stem-ren', 'branch-shen'],
    ['stem-ren', 'branch-xu'],
  ],
  [
    'trigram-zhen',
    ['stem-geng', 'branch-zi'],
    ['stem-geng', 'branch-yin'],
    ['stem-geng', 'branch-chen'],
    ['stem-geng', 'branch-wu'],
    ['stem-geng', 'branch-shen'],
    ['stem-geng', 'branch-xu'],
  ],
  [
    'trigram-kan',
    ['stem-wu', 'branch-yin'],
    ['stem-wu', 'branch-chen'],
    ['stem-wu', 'branch-wu'],
    ['stem-wu', 'branch-shen'],
    ['stem-wu', 'branch-xu'],
    ['stem-wu', 'branch-zi'],
  ],
  [
    'trigram-gen',
    ['stem-bing', 'branch-chen'],
    ['stem-bing', 'branch-wu'],
    ['stem-bing', 'branch-shen'],
    ['stem-bing', 'branch-xu'],
    ['stem-bing', 'branch-zi'],
    ['stem-bing', 'branch-yin'],
  ],
  [
    'trigram-kun',
    ['stem-yi', 'branch-wei'],
    ['stem-yi', 'branch-si'],
    ['stem-yi', 'branch-mao'],
    ['stem-gui', 'branch-chou'],
    ['stem-gui', 'branch-hai'],
    ['stem-gui', 'branch-you'],
  ],
  [
    'trigram-xun',
    ['stem-xin', 'branch-chou'],
    ['stem-xin', 'branch-hai'],
    ['stem-xin', 'branch-you'],
    ['stem-xin', 'branch-wei'],
    ['stem-xin', 'branch-si'],
    ['stem-xin', 'branch-mao'],
  ],
  [
    'trigram-li',
    ['stem-ji', 'branch-mao'],
    ['stem-ji', 'branch-chou'],
    ['stem-ji', 'branch-hai'],
    ['stem-ji', 'branch-you'],
    ['stem-ji', 'branch-wei'],
    ['stem-ji', 'branch-si'],
  ],
  [
    'trigram-dui',
    ['stem-ding', 'branch-si'],
    ['stem-ding', 'branch-mao'],
    ['stem-ding', 'branch-chou'],
    ['stem-ding', 'branch-hai'],
    ['stem-ding', 'branch-you'],
    ['stem-ding', 'branch-wei'],
  ],
] as const;

const branchDefinitions = [
  ['branch-zi', 'water'],
  ['branch-chou', 'earth'],
  ['branch-yin', 'wood'],
  ['branch-mao', 'wood'],
  ['branch-chen', 'earth'],
  ['branch-si', 'fire'],
  ['branch-wu', 'fire'],
  ['branch-wei', 'earth'],
  ['branch-shen', 'metal'],
  ['branch-you', 'metal'],
  ['branch-xu', 'earth'],
  ['branch-hai', 'water'],
] as const;

const elements = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
const relatives: Readonly<Record<(typeof elements)[number], readonly string[]>> = {
  metal: ['wealth', 'official', 'parent', 'sibling', 'offspring'],
  water: ['offspring', 'wealth', 'official', 'parent', 'sibling'],
  earth: ['official', 'parent', 'sibling', 'offspring', 'wealth'],
  fire: ['parent', 'sibling', 'offspring', 'wealth', 'official'],
  wood: ['sibling', 'offspring', 'wealth', 'official', 'parent'],
};

const spiritDefinitions = [
  'spirit-qing-long',
  'spirit-zhu-que',
  'spirit-gou-chen',
  'spirit-teng-she',
  'spirit-bai-hu',
  'spirit-xuan-wu',
] as const;

const spiritStarts = [
  ['stem-jia', 'spirit-qing-long'],
  ['stem-yi', 'spirit-qing-long'],
  ['stem-bing', 'spirit-zhu-que'],
  ['stem-ding', 'spirit-zhu-que'],
  ['stem-wu', 'spirit-gou-chen'],
  ['stem-ji', 'spirit-teng-she'],
  ['stem-geng', 'spirit-bai-hu'],
  ['stem-xin', 'spirit-bai-hu'],
  ['stem-ren', 'spirit-xuan-wu'],
  ['stem-gui', 'spirit-xuan-wu'],
] as const;

const voidDefinitions = [
  [0, ['branch-xu', 'branch-hai']],
  [10, ['branch-shen', 'branch-you']],
  [20, ['branch-wu', 'branch-wei']],
  [30, ['branch-chen', 'branch-si']],
  [40, ['branch-yin', 'branch-mao']],
  [50, ['branch-zi', 'branch-chou']],
] as const;

const candidateSourceManifest = [
  {
    sourceId: 'SOURCE-JFYT-SIKU',
    title: '京氏易传（四库全书候选定位）',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-ZSBY-WIKI',
    title: '增删卜易（候选整理定位）',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-ZSBY-PRINT',
    title: '增删卜易（待双人定位的印刷本）',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-HKO-TERMS',
    title: '香港天文台二十四节气资料',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-HKO-ALMANAC-2026',
    title: '香港天文台 2026 年公农历对照表',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-HKO-GANZHI',
    title: '香港天文台干支日候选锚点',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-IANA-TZDB',
    title: 'IANA time zone database',
    sourceVersion: '2026c',
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-NIST-DST',
    title: 'NIST daylight-saving-time reference',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
  {
    sourceId: 'SOURCE-GOVUK-DST',
    title: 'GOV.UK daylight-saving-time reference',
    sourceVersion: SOURCE_VERSION,
    verificationStatus: 'production_candidate',
  },
] as const;

export const candidateCalendarData = {
  policyId: 'civil_midnight_solar_terms_tzdb2026c',
  calendarAlgorithmVersion: '1.0.0-candidate.1',
  solarTermDataVersion: 'hko-2026-candidate.1',
  timezoneDataVersion: 'tzdb-2026c-candidate',
  sourceIds: [
    'SOURCE-HKO-TERMS',
    'SOURCE-HKO-ALMANAC-2026',
    'SOURCE-HKO-GANZHI',
    'SOURCE-IANA-TZDB',
  ],
  dayGanzhiAnchor: { localDate: '2026-01-01', cycleIndex: 11 },
  coverageEndInclusiveInstant: '2026-02-18T15:52:00Z',
  solarTerms: [
    {
      id: 'solar-term-xiaohan-2026',
      instant: '2026-01-05T08:23:00Z',
      monthBranchId: 'branch-chou',
      changesMonthBranch: true,
    },
    {
      id: 'solar-term-lichun-2026',
      instant: '2026-02-03T20:02:00Z',
      monthBranchId: 'branch-yin',
      changesMonthBranch: true,
    },
    {
      id: 'solar-term-yushui-2026',
      instant: '2026-02-18T15:52:00Z',
      monthBranchId: 'branch-yin',
      changesMonthBranch: false,
    },
  ],
  timezones: [
    {
      timezone: 'Asia/Hong_Kong',
      initialOffsetSeconds: 28800,
      initialIsDst: false,
      transitions: [],
    },
    {
      timezone: 'Asia/Shanghai',
      initialOffsetSeconds: 28800,
      initialIsDst: false,
      transitions: [],
    },
    {
      timezone: 'America/Los_Angeles',
      initialOffsetSeconds: -28800,
      initialIsDst: false,
      transitions: [
        { instant: '2026-03-08T10:00:00Z', offsetSecondsAfter: -25200, isDstAfter: true },
        { instant: '2026-11-01T09:00:00Z', offsetSecondsAfter: -28800, isDstAfter: false },
      ],
    },
    {
      timezone: 'America/New_York',
      initialOffsetSeconds: -18000,
      initialIsDst: false,
      transitions: [
        { instant: '2026-03-08T07:00:00Z', offsetSecondsAfter: -14400, isDstAfter: true },
        { instant: '2026-11-01T06:00:00Z', offsetSecondsAfter: -18000, isDstAfter: false },
      ],
    },
    {
      timezone: 'Europe/London',
      initialOffsetSeconds: 0,
      initialIsDst: false,
      transitions: [
        { instant: '2026-03-29T01:00:00Z', offsetSecondsAfter: 3600, isDstAfter: true },
        { instant: '2026-10-25T01:00:00Z', offsetSecondsAfter: 0, isDstAfter: false },
      ],
    },
  ],
} as const;

const candidateGoldCases = [
  'CASE-CAL-001',
  'CASE-CAL-002',
  'CASE-CAL-003',
  'CASE-CAL-004',
  'CASE-CAL-005',
  'CASE-CAL-006',
  'CASE-DST-001',
  'CASE-DST-002',
  'CASE-DST-003',
  'CASE-PAN-001',
  'CASE-PAN-002',
  'CASE-PAN-003',
  'CASE-PAN-004',
  'CASE-PAN-005',
  'CASE-RULE-001',
  'CASE-RULE-002',
] as const;

function source(ruleId: string, sourceId: string, sourceLocator: string) {
  return {
    ruleId,
    rulesetId: RULESET_ID,
    rulesetVersion: RULESET_VERSION,
    contentVersion: CONTENT_VERSION,
    sourceId,
    sourceVersion: SOURCE_VERSION,
    sourceLocator,
  };
}

function loadHexagramIds(): ReadonlyMap<string, string> {
  const catalogPath = resolve(process.cwd(), 'data/catalog/index.json');
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8')) as readonly CatalogRecord[];
  const entries = catalog
    .filter((record) => record.recordType === 'hexagram')
    .map((record) => [record.content.name, record.content.id] as const);
  return new Map(entries);
}

function requiredHexagramId(ids: ReadonlyMap<string, string>, name: string): string {
  const id = ids.get(name);
  if (id === undefined)
    throw new Error(`Candidate palace mapping references unknown hexagram ${name}.`);
  return id;
}

export function buildProfessionalCandidateRuleset(): ProfessionalRulesetInput {
  const hexagramIds = loadHexagramIds();
  const palaceRules: PalaceRule[] = palaceDefinitions.flatMap(
    ([palaceTrigramId, palaceElementId, names]) =>
      names.map((name, index) => {
        const [worldPosition, responsePosition] = worldResponse[index] ?? [];
        const stage = stages[index];
        if (worldPosition === undefined || responsePosition === undefined || stage === undefined) {
          throw new Error(`Candidate palace sequence ${index} is invalid.`);
        }
        return {
          ...source(
            `PALACE-${palaceTrigramId}-${index}`,
            'SOURCE-JFYT-SIKU',
            `八宫候选表；${name}；${stage}`,
          ),
          hexagramId: requiredHexagramId(hexagramIds, name),
          palaceTrigramId,
          palaceElementId,
          palaceSequence: index as PalaceRule['palaceSequence'],
          stage,
          worldPosition: worldPosition as PalaceRule['worldPosition'],
          responsePosition: responsePosition as PalaceRule['responsePosition'],
        };
      }),
  );

  const najiaRules: NajiaRule[] = trigramNajia.flatMap(([trigramId, ...lines]) =>
    lines.map((entry, index) => {
      const heavenlyStemId = entry[0];
      const earthlyBranchId = entry[1];
      if (!heavenlyStemId || !earthlyBranchId) {
        throw new Error(`Invalid Najia entry for ${trigramId} at line ${index}.`);
      }
      const scope = index < 3 ? 'inner' : 'outer';
      const localLine = (index % 3) + 1;
      return {
        ...source(
          `NAJIA-${trigramId}-${scope}-${localLine}`,
          'SOURCE-ZSBY-WIKI',
          '浑天甲子章；模块五候选表',
        ),
        trigramId,
        scope,
        localLine: localLine as NajiaRule['localLine'],
        heavenlyStemId,
        earthlyBranchId,
      };
    }),
  );

  const earthlyBranches: EarthlyBranchRule[] = branchDefinitions.map(
    ([branchId, elementId], index) => ({
      ...source(`BRANCH-${branchId}`, 'SOURCE-ZSBY-WIKI', '地支五行候选表'),
      branchId,
      order: (index + 1) as EarthlyBranchRule['order'],
      elementId,
    }),
  );

  const sixRelativeRules: SixRelativeRule[] = elements.flatMap((palaceElementId) =>
    elements.map((lineElementId, index) => ({
      ...source(
        `RELATIVE-${palaceElementId}-${lineElementId}`,
        'SOURCE-ZSBY-WIKI',
        '六亲歌；以卦宫五行为基准的候选矩阵',
      ),
      palaceElementId,
      lineElementId,
      relative: relatives[palaceElementId][index] as SixRelativeRule['relative'],
      formulaCode: `PALACE_${palaceElementId.toUpperCase()}_LINE_${lineElementId.toUpperCase()}`,
    })),
  );

  const sixSpirits: SixSpiritDefinition[] = spiritDefinitions.map((spiritId, index) => ({
    ...source(`SIX-SPIRIT-${spiritId}`, 'SOURCE-ZSBY-WIKI', '六神章；固定顺序候选表'),
    spiritId,
    order: (index + 1) as SixSpiritDefinition['order'],
  }));
  const sixSpiritStartRules: SixSpiritStartRule[] = spiritStarts.map(
    ([dayStemId, startSpiritId]) => ({
      ...source(`SIX-SPIRIT-START-${dayStemId}`, 'SOURCE-ZSBY-WIKI', '六神章；日干起例候选表'),
      dayStemId,
      startSpiritId,
    }),
  );
  const voidRules: VoidRule[] = voidDefinitions.map(([cycleStartIndex, voidBranches]) => ({
    ...source(`VOID-${cycleStartIndex}`, 'SOURCE-ZSBY-WIKI', '旬空章；六旬候选表'),
    cycleStartIndex: cycleStartIndex as VoidRule['cycleStartIndex'],
    voidBranches: voidBranches as VoidRule['voidBranches'],
  }));

  if (
    palaceRules.length !== 64 ||
    new Set(palaceRules.map((rule) => rule.hexagramId)).size !== 64
  ) {
    throw new Error('Candidate palace table must explicitly cover 64 unique hexagrams.');
  }
  if (
    najiaRules.length !== 48 ||
    sixRelativeRules.length !== 25 ||
    sixSpiritStartRules.length !== 10
  ) {
    throw new Error('Candidate professional table has an unexpected mandatory record count.');
  }

  return {
    metadata: {
      rulesetId: RULESET_ID,
      rulesetVersion: RULESET_VERSION,
      contentVersion: CONTENT_VERSION,
      calendarAlgorithmVersion: '1.0.0-candidate.1',
      timezoneDataVersion: 'tzdb-2026c-candidate',
      compatibilityGroup: 'jingfang-yehe-candidate-civil-midnight',
      verificationStatus: 'production_candidate',
      sourceManifestHash: ACCEPTANCE_PACKAGE_SHA256,
      rulesHash: null,
      verifiedBy: [],
      verifiedAt: null,
      sources: [
        ...candidateSourceManifest.map((entry) => ({
          sourceId: entry.sourceId,
          sourceVersion: entry.sourceVersion,
          sourceLocator: '六爻App模块五生产不足补全与验收包.txt；候选来源清单',
          verificationStatus: entry.verificationStatus,
        })),
      ],
      dayBoundaryPolicy: 'civil-midnight',
      trueSolarTimeEnabled: false,
    },
    palaceRules,
    najiaRules,
    earthlyBranches,
    sixRelativeRules,
    sixSpirits,
    sixSpiritStartRules,
    voidRules,
    branchRelationRules: [],
    usefulGodRules: [],
    supportingRoleRules: [],
    hiddenSpiritRules: [],
  };
}

function writeJson(path: string, value: unknown, checkOnly: boolean): void {
  const rendered = `${JSON.stringify(value, null, 2)}\n`;
  if (checkOnly) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== rendered) {
      throw new Error(`Candidate output is missing or stale: ${path}`);
    }
    return;
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rendered, 'utf8');
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const ruleset = buildProfessionalCandidateRuleset();
  const payloadHash = createHash('sha256').update(canonicalJson(ruleset)).digest('hex');
  const document = {
    recordType: 'professional-ruleset-candidate',
    status: 'production_candidate',
    generatedFrom: '六爻App模块五生产不足补全与验收包.txt',
    generatedFromSha256: ACCEPTANCE_PACKAGE_SHA256,
    payloadSha256: payloadHash,
    ruleset,
  };
  const output = resolve(
    process.cwd(),
    'data/draft/professional/jingfang-yehe-baseline-1.0.0-candidate.1.json',
  );
  writeJson(output, document, checkOnly);
  writeJson(
    resolve(process.cwd(), 'data/draft/professional/calendar-2026-candidate.1.json'),
    {
      recordType: 'professional-calendar-candidate',
      status: 'production_candidate',
      generatedFromSha256: ACCEPTANCE_PACKAGE_SHA256,
      calendar: candidateCalendarData,
    },
    checkOnly,
  );
  writeJson(
    resolve(process.cwd(), 'data/draft/professional/source-manifest-candidate.1.json'),
    {
      recordType: 'professional-source-manifest-candidate',
      status: 'production_candidate',
      generatedFromSha256: ACCEPTANCE_PACKAGE_SHA256,
      sources: candidateSourceManifest,
    },
    checkOnly,
  );
  writeJson(
    resolve(process.cwd(), 'data/draft/professional/gold-cases-candidate.1.json'),
    {
      recordType: 'professional-gold-cases-candidate',
      status: 'candidate_for_human_review',
      generatedFromSha256: ACCEPTANCE_PACKAGE_SHA256,
      cases: candidateGoldCases.map((caseId) => ({
        caseId,
        status: 'candidate_for_human_review',
        reviewerSignoffsRequired: 2,
        reviewerSignoffsPresent: 0,
      })),
    },
    checkOnly,
  );
  process.stdout.write(
    `[professional-candidate] ${checkOnly ? 'verified' : 'generated'} ${output}\n`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

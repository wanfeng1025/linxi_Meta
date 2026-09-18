import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';
import productionDataset from '../data/source/content-dataset.json';
import {
  classicalCandidatePackSchema,
  hexagramPageManifestSchema,
  professionalCandidatePackSchema,
  productCandidatePackSchema,
  draftSourceSchema,
} from './m4-candidate-schema';

type DraftSource = z.output<typeof draftSourceSchema>;

const source: DraftSource = {
  sourceId: 'module-four-acceptance-pack',
  sourceVersion: '2026-07-25-candidate-v1',
  sourceLocator: '六爻App模块四内容数据库缺失数据补全与生产验收包.txt',
  revision: null,
  sourceSha256: '537d3ec190263166c1a3f541c962c44ce12bec47ba30b5c8cdc2a8841c8953a4',
  verificationStatus: 'production_candidate',
};
const root = path.resolve('data/draft');
const pretty = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const textUnits = [
  ['hexagram-kw-01', null, 'hexagram_judgment', '乾：元亨利貞。'],
  [
    'hexagram-kw-01',
    null,
    'tuan_commentary',
    '彖曰：大哉乾元，萬物資始，乃統天。雲行雨施，品物流形。大明終始，六位時成，時乘六龍以御天。乾道變化，各正性命，保合大和，乃利貞。首出庶物，萬國咸寧。',
  ],
  ['hexagram-kw-01', null, 'great_image', '象曰：天行健，君子以自強不息。'],
  ['hexagram-kw-01', 1, 'line_statement', '初九：潛龍，勿用。'],
  ['hexagram-kw-01', 2, 'line_statement', '九二：見龍在田，利見大人。'],
  ['hexagram-kw-01', 3, 'line_statement', '九三：君子終日乾乾，夕惕若，厲無咎。'],
  ['hexagram-kw-01', 4, 'line_statement', '九四：或躍在淵，無咎。'],
  ['hexagram-kw-01', 5, 'line_statement', '九五：飛龍在天，利見大人。'],
  ['hexagram-kw-01', 6, 'line_statement', '上九：亢龍有悔。'],
  ['hexagram-kw-01', 1, 'line_image', '象曰：潛龍勿用，陽在下也。'],
  ['hexagram-kw-01', 2, 'line_image', '象曰：見龍在田，德施普也。'],
  ['hexagram-kw-01', 3, 'line_image', '象曰：終日乾乾，反復道也。'],
  ['hexagram-kw-01', 4, 'line_image', '象曰：或躍在淵，進無咎也。'],
  ['hexagram-kw-01', 5, 'line_image', '象曰：飛龍在天，大人造也。'],
  ['hexagram-kw-01', 6, 'line_image', '象曰：亢龍有悔，盈不可久也。'],
  ['hexagram-kw-01', null, 'special_use_statement', '用九：見群龍無首，吉。'],
  ['hexagram-kw-01', null, 'special_use_image', '象曰：用九，天德不可為首也。'],
  [
    'hexagram-kw-02',
    null,
    'hexagram_judgment',
    '坤：元亨，利牝馬之貞。君子有攸往，先迷後得主，利。西南得朋，東北喪朋。安貞吉。',
  ],
  [
    'hexagram-kw-02',
    null,
    'tuan_commentary',
    '彖曰：至哉坤元，萬物資生，乃順承天。坤厚載物，德合無疆。含弘光大，品物咸亨。牝馬地類，行地無疆，柔順利貞。君子攸行，先迷失道，後順得常。西南得朋，乃與類行；東北喪朋，乃終有慶。安貞之吉，應地無疆。',
  ],
  ['hexagram-kw-02', null, 'great_image', '象曰：地勢坤，君子以厚德載物。'],
  ['hexagram-kw-02', 1, 'line_statement', '初六：履霜，堅冰至。'],
  ['hexagram-kw-02', 2, 'line_statement', '六二：直方大，不習無不利。'],
  ['hexagram-kw-02', 3, 'line_statement', '六三：含章可貞。或從王事，無成有終。'],
  ['hexagram-kw-02', 4, 'line_statement', '六四：括囊，無咎無譽。'],
  ['hexagram-kw-02', 5, 'line_statement', '六五：黃裳，元吉。'],
  ['hexagram-kw-02', 6, 'line_statement', '上六：龍戰于野，其血玄黃。'],
  ['hexagram-kw-02', 1, 'line_image', '象曰：履霜堅冰，陰始凝也。馴致其道，至堅冰也。'],
  ['hexagram-kw-02', 2, 'line_image', '象曰：六二之動，直以方也。不習無不利，地道光也。'],
  ['hexagram-kw-02', 3, 'line_image', '象曰：含章可貞，以時發也。或從王事，知光大也。'],
  ['hexagram-kw-02', 4, 'line_image', '象曰：括囊無咎，慎不害也。'],
  ['hexagram-kw-02', 5, 'line_image', '象曰：黃裳元吉，文在中也。'],
  ['hexagram-kw-02', 6, 'line_image', '象曰：龍戰于野，其道窮也。'],
  ['hexagram-kw-02', null, 'special_use_statement', '用六：利永貞。'],
  ['hexagram-kw-02', null, 'special_use_image', '象曰：用六永貞，以大終也。'],
] as const;

const trigramFields = [
  [
    'trigram-qian',
    '金',
    '西北',
    '父',
    '天',
    '首',
    '馬',
    '健',
    ['天', '圜', '君', '父', '玉', '金', '寒', '冰', '大赤', '木果'],
  ],
  [
    'trigram-kun',
    '土',
    '西南',
    '母',
    '地',
    '腹',
    '牛',
    '順',
    ['地', '母', '布', '釜', '吝嗇', '均', '文', '眾', '輿'],
  ],
  [
    'trigram-zhen',
    '木',
    '東',
    '長男',
    '雷',
    '足',
    '龍',
    '動',
    ['雷', '龍', '玄黃', '旉', '大塗', '長子', '決躁', '蒼筤竹'],
  ],
  [
    'trigram-xun',
    '木',
    '東南',
    '長女',
    '風/木',
    '股',
    '雞',
    '入',
    ['木', '風', '長女', '繩直', '工', '白', '長', '高', '進退', '不果', '臭'],
  ],
  [
    'trigram-kan',
    '水',
    '北',
    '中男',
    '水',
    '耳',
    '豕',
    '陷/險',
    ['水', '溝瀆', '隱伏', '矯輮', '弓輪', '加憂', '心病', '耳痛', '血卦', '赤'],
  ],
  [
    'trigram-li',
    '火',
    '南',
    '中女',
    '火/日',
    '目',
    '雉',
    '麗/明',
    ['火', '日', '電', '中女', '甲胄', '戈兵', '大腹', '乾卦', '鱉蟹螺蚌龜'],
  ],
  [
    'trigram-gen',
    '土',
    '東北',
    '少男',
    '山',
    '手',
    '狗',
    '止',
    ['山', '徑路', '小石', '門闕', '果蓏', '閽寺', '狗鼠', '黔喙之屬'],
  ],
  [
    'trigram-dui',
    '金',
    '西',
    '少女',
    '澤',
    '口',
    '羊',
    '說/悅',
    ['澤', '少女', '巫', '口舌', '毀折', '附決', '剛鹵', '妾', '羊'],
  ],
] as const;

const palaceNames = [
  ['trigram-qian', ['乾', '姤', '遯', '否', '观', '剥', '晋', '大有']],
  ['trigram-zhen', ['震', '豫', '解', '恒', '升', '井', '大过', '随']],
  ['trigram-kan', ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师']],
  ['trigram-gen', ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐']],
  ['trigram-kun', ['坤', '复', '临', '泰', '大壮', '夬', '需', '比']],
  ['trigram-xun', ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊']],
  ['trigram-li', ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人']],
  ['trigram-dui', ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹']],
] as const;
const stageInfo = [
  ['base', 6, 3],
  ['first-change', 1, 4],
  ['second-change', 2, 5],
  ['third-change', 3, 6],
  ['fourth-change', 4, 1],
  ['fifth-change', 5, 2],
  ['wandering-soul', 4, 1],
  ['returning-soul', 3, 6],
] as const;
const najia = {
  'trigram-qian': [
    ['inner', '甲', ['子', '寅', '辰']],
    ['outer', '壬', ['午', '申', '戌']],
  ],
  'trigram-kun': [
    ['inner', '乙', ['未', '巳', '卯']],
    ['outer', '癸', ['丑', '亥', '酉']],
  ],
  'trigram-zhen': [
    ['inner', '庚', ['子', '寅', '辰']],
    ['outer', '庚', ['午', '申', '戌']],
  ],
  'trigram-xun': [
    ['inner', '辛', ['丑', '亥', '酉']],
    ['outer', '辛', ['未', '巳', '卯']],
  ],
  'trigram-kan': [
    ['inner', '戊', ['寅', '辰', '午']],
    ['outer', '戊', ['申', '戌', '子']],
  ],
  'trigram-li': [
    ['inner', '己', ['卯', '丑', '亥']],
    ['outer', '己', ['酉', '未', '巳']],
  ],
  'trigram-gen': [
    ['inner', '丙', ['辰', '午', '申']],
    ['outer', '丙', ['戌', '子', '寅']],
  ],
  'trigram-dui': [
    ['inner', '丁', ['巳', '卯', '丑']],
    ['outer', '丁', ['亥', '酉', '未']],
  ],
} as const;
const categories = [
  ['general-decision', '綜合決策', '世爻', ['應爻', '用神候選'], '先明確選項、時限與可控因素'],
  ['career', '事業發展', '官鬼', ['世爻', '父母'], '職位、責任、組織關係與發展路徑'],
  [
    'job-search',
    '求職錄用',
    '官鬼',
    ['父母', '世爻', '應爻'],
    '職位為主，通知、合同為父母，招聘方看應爻',
  ],
  ['promotion', '升職任命', '官鬼', ['父母', '世爻'], '職位、批文與本人承擔能力'],
  ['study', '學業學習', '父母', ['世爻', '子孫'], '課程、知識、材料與學習狀態'],
  ['exam', '考試證書', '父母', ['官鬼', '世爻'], '試卷證書、名次職稱和本人'],
  ['wealth', '收入財運', '妻財', ['世爻', '兄弟'], '收入資源、成本競爭與可得性'],
  [
    'investment',
    '投資交易',
    '妻財',
    ['兄弟', '父母', '應爻'],
    '標的、成本、合同、對手方；必須顯示投資免責',
  ],
  ['business', '買賣合作', '妻財', ['應爻', '父母', '兄弟'], '貨款、合作方、合同與競爭'],
  ['love', '感情關係', '依上下文配置', ['世爻', '應爻'], '禁止僅按性別硬編碼妻財/官鬼'],
  [
    'marriage',
    '婚姻承諾',
    '依規則集與關係角色',
    ['世爻', '應爻', '父母'],
    '關係主體、承諾與制度性安排',
  ],
  ['family', '家庭親屬', '按親屬關係', ['世爻', '應爻'], '父母、兄弟、子孫等依實際關係'],
  ['health', '健康狀態', '世爻/相關親屬爻', ['官鬼', '子孫'], '只作文化反思，不得診斷或延誤就醫'],
  ['travel', '出行遷移', '世爻', ['應爻', '父母'], '目的地、交通工具、文件與安全條件'],
  ['lost-item', '失物尋找', '按物品類型/妻財', ['世爻', '應爻'], '需記錄物品類型、最後位置和時間'],
  ['legal', '訴訟糾紛', '官鬼', ['父母', '世應'], '法律文書、責任、雙方；必須顯示法律免責'],
  ['property', '房屋車輛', '父母', ['妻財', '世應'], '房產車輛、價格、合同與交易對方'],
  ['creation', '作品技術產出', '子孫', ['父母', '世爻'], '作品、產品、技術輸出與發佈條件'],
] as const;

async function main(): Promise<void> {
  const byName = new Map(productionDataset.hexagrams.map((item) => [item.nameSimplified, item.id]));
  const candidateNameAliases: Readonly<Record<string, string>> = {
    遯: '遁',
    观: '观',
    剥: '剥',
    贲: '贲',
    损: '损',
    复: '复',
    临: '临',
    无妄: '无妄',
    噬嗑: '噬嗑',
    颐: '颐',
    萃: '萃',
    咸: '咸',
    蹇: '蹇',
    谦: '谦',
    归妹: '归妹',
  };
  const classical = {
    schemaVersion: 'classical-text-units-v2' as const,
    source,
    units: textUnits.map(([hexagramId, linePosition, textKind, text], index) => ({
      id: `candidate-text-${String(index + 1).padStart(3, '0')}`,
      hexagramId,
      linePosition,
      textKind,
      text,
      source,
    })),
  };
  const manifest = {
    schemaVersion: 'hexagram-page-manifest-v1' as const,
    source,
    entries: productionDataset.hexagrams.map((record) => ({
      hexagramId: record.id,
      kingWenSequence: record.kingWenSequence,
      name: record.nameSimplified,
      unicodeSymbol: record.unicodeSymbol,
      upperTrigramId: record.upperTrigramId,
      lowerTrigramId: record.lowerTrigramId,
    })),
  };
  const palaceMemberships = palaceNames.flatMap(([palaceTrigramId, names]) =>
    names.map((name, index) => ({
      hexagramId:
        byName.get(candidateNameAliases[name] ?? name) ??
        (() => {
          throw new Error(`Missing hexagram ${name}`);
        })(),
      palaceTrigramId,
      stage: stageInfo[index]?.[0] ?? 'unknown',
      shiPosition: stageInfo[index]?.[1] ?? 0,
      yingPosition: stageInfo[index]?.[2] ?? 0,
    })),
  );
  const najiaAssignments = Object.entries(najia).flatMap(([trigramId, groups]) =>
    groups.flatMap(([scope, heavenlyStem, branches]) =>
      branches.map((earthlyBranch, index) => ({
        trigramId,
        scope,
        localLine: index + 1,
        heavenlyStem,
        earthlyBranch,
      })),
    ),
  );
  const elements = ['金', '木', '水', '火', '土'];
  const produces: Record<string, string> = { 金: '水', 水: '木', 木: '火', 火: '土', 土: '金' };
  const controls: Record<string, string> = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
  const sixRelativeRules = elements.flatMap((palaceElement) =>
    elements.map((lineElement) => ({
      palaceElement,
      lineElement,
      relative:
        lineElement === palaceElement
          ? '兄弟'
          : produces[lineElement] === palaceElement
            ? '父母'
            : produces[palaceElement] === lineElement
              ? '子孫'
              : controls[palaceElement] === lineElement
                ? '妻財'
                : '官鬼',
    })),
  );
  const spirits = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
  const starts: Record<string, number> = {
    甲: 0,
    乙: 0,
    丙: 1,
    丁: 1,
    戊: 2,
    己: 3,
    庚: 4,
    辛: 4,
    壬: 5,
    癸: 5,
  };
  const sixSpiritAssignments = Object.entries(starts).flatMap(([dayStem, start]) =>
    spirits.map((_, index) => ({
      dayStem,
      linePosition: index + 1,
      spirit: spirits[(start + index) % 6] ?? '',
    })),
  );
  const professional = {
    schemaVersion: 'professional-candidate-v1' as const,
    source,
    ruleset: { id: 'jingfang-yehe-baseline' as const, version: '1.0.0-candidate.1' },
    trigrams: trigramFields.map(
      ([
        id,
        palaceElement,
        houtianDirection,
        familyRole,
        naturalImage,
        bodyPart,
        animal,
        virtue,
        extendedImages,
      ]) => ({
        id,
        fields: {
          palaceElement,
          houtianDirection,
          familyRole,
          naturalImage,
          bodyPart,
          animal,
          virtue,
          extendedImages,
          sourceLocator: '《易传·说卦》第七至第十一章及验收包第九节；待双人复核。',
        },
      }),
    ),
    palaceMemberships,
    najiaAssignments,
    sixRelativeRules,
    sixSpiritAssignments,
    branchRelations: [
      ['combine', ['子', '丑'], null],
      ['combine', ['寅', '亥'], null],
      ['combine', ['卯', '戌'], null],
      ['combine', ['辰', '酉'], null],
      ['combine', ['巳', '申'], null],
      ['combine', ['午', '未'], null],
      ['clash', ['子', '午'], null],
      ['clash', ['丑', '未'], null],
      ['clash', ['寅', '申'], null],
      ['clash', ['卯', '酉'], null],
      ['clash', ['辰', '戌'], null],
      ['clash', ['巳', '亥'], null],
      ['three-combine', ['申', '子', '辰'], '水'],
      ['three-combine', ['亥', '卯', '未'], '木'],
      ['three-combine', ['寅', '午', '戌'], '火'],
      ['three-combine', ['巳', '酉', '丑'], '金'],
      ['harm', ['子', '未'], null],
      ['harm', ['丑', '午'], null],
      ['harm', ['寅', '巳'], null],
      ['harm', ['卯', '辰'], null],
      ['harm', ['申', '亥'], null],
      ['harm', ['酉', '戌'], null],
      ['break-candidate', ['子', '酉'], null],
      ['break-candidate', ['午', '卯'], null],
      ['break-candidate', ['辰', '丑'], null],
      ['break-candidate', ['戌', '未'], null],
      ['break-candidate', ['寅', '亥'], null],
      ['break-candidate', ['巳', '申'], null],
    ].map(([relationType, branchIds, resultElement]) => ({
      relationType,
      branchIds,
      resultElement,
    })),
  };
  const product = {
    schemaVersion: 'product-editorial-candidate-v1' as const,
    source: { ...source, verificationStatus: 'editorial_original' as const },
    categories: categories.map(
      ([id, name, primaryCandidate, secondaryCandidates, clarificationHint]) => ({
        id,
        name,
        primaryCandidate,
        secondaryCandidates: [...secondaryCandidates],
        clarificationHint,
      }),
    ),
    templates: [
      {
        id: 'template-general-brief',
        text: '{{hexagramName}}显示当前主题偏向“{{theme}}”。综合已确认的{{evidenceCount}}项依据，主象为{{primarySymbol}}，趋势为{{trend}}。当前最值得重视的是{{topFactor}}。建议：{{topAction}}。',
        variables: [
          'hexagramName',
          'theme',
          'evidenceCount',
          'primarySymbol',
          'trend',
          'topFactor',
          'topAction',
        ],
      },
      {
        id: 'template-general-detailed',
        text: '当前状态：{{stateSummary}}。规则集 {{rulesetVersion}}，内容版本 {{contentVersion}}。',
        variables: ['stateSummary', 'rulesetVersion', 'contentVersion'],
      },
    ],
    disclaimers: [
      [
        'disclaimer-general',
        '本应用以《周易》与传统六爻文化为内容基础，用于文化学习、娱乐和个人反思。起卦与解释不属于科学预测，不保证准确，也不应作为现实决策的唯一依据。请结合事实、证据、专业意见和自身责任作出决定。',
      ],
      [
        'disclaimer-medical',
        '本应用不提供医学诊断、治疗方案、用药建议或急救服务。出现严重疼痛、呼吸困难、意识异常、自伤风险或其他紧急情况时，请立即联系当地急救机构或合格医疗人员。',
      ],
      [
        'disclaimer-legal',
        '本应用不提供法律意见，不建立律师与客户关系。法律结果取决于司法管辖区、事实、证据、时限和适用法律。请咨询所在地具备执业资格的法律专业人士。',
      ],
      [
        'disclaimer-financial',
        '本应用不提供投资、证券、税务、保险或信贷建议。任何资产都可能亏损，历史表现不代表未来结果。请评估自身承受能力并咨询合格专业人士。',
      ],
      [
        'disclaimer-relationship',
        '本应用不能读取或证明他人的真实想法、感情、忠诚或行为。涉及关系的问题，应以尊重、明确沟通、同意和现实证据为准。',
      ],
      [
        'disclaimer-ai',
        'AI 仅负责把已经确定的结构化规则结果改写为较易理解的文字。AI 不参与起卦，不得修改本卦、变卦、动爻、日月、世应、用神或命中规则。AI 输出异常时，应用将回退到本地模板。',
      ],
    ].map(([id, text]) => ({ id, text })),
  };
  classicalCandidatePackSchema.parse(classical);
  hexagramPageManifestSchema.parse(manifest);
  professionalCandidatePackSchema.parse(professional);
  productCandidatePackSchema.parse(product);
  await Promise.all([
    mkdir(path.join(root, 'classical'), { recursive: true }),
    mkdir(path.join(root, 'professional'), { recursive: true }),
    mkdir(path.join(root, 'product'), { recursive: true }),
    mkdir(path.join(root, 'manifests'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(
      path.join(root, 'classical', 'classical-text-units-candidate.json'),
      pretty(classical),
      'utf8',
    ),
    writeFile(
      path.join(root, 'professional', 'jingfang-yehe-baseline-candidate.json'),
      pretty(professional),
      'utf8',
    ),
    writeFile(
      path.join(root, 'product', 'product-editorial-candidate.json'),
      pretty(product),
      'utf8',
    ),
    writeFile(
      path.join(root, 'manifests', 'hexagram-page-manifest.json'),
      pretty(manifest),
      'utf8',
    ),
  ]);
}

void main();

/**
 * Public editorial documentation for the anonymous web experience. It holds
 * no classical prose, professional rule tables, or automated interpretation.
 */
export interface MethodologyPrinciple {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface PublicationLayer {
  readonly id: string;
  readonly title: string;
  readonly status: 'published' | 'not-published';
  readonly description: string;
}

export interface CandidateCollectionStatus {
  readonly title: string;
  readonly description: string;
  readonly safeguards: readonly string[];
}

export const publicMethodologyVersion = 'anonymous-web-methodology-2026-07-26-v4';

export const publicMethodology = {
  version: publicMethodologyVersion,
  principles: [
    {
      id: 'independent-coins',
      title: '三枚独立铜钱',
      description:
        '每次起爻均独立抽取三枚 2/3 铜钱值，再求和得到 6、7、8 或 9；网站不会把四种爻值当作等概率结果。',
    },
    {
      id: 'line-order',
      title: '从初爻到上爻记录',
      description:
        '六次点击的内部顺序始终是初爻至上爻。结果图为方便阅读自上而下显示，但不会改变已保存的原始位置。',
    },
    {
      id: 'reproducible-facts',
      title: '事实可复算',
      description:
        '锁定前保存每一爻的三枚原始铜钱；本卦、变卦与动爻始终由这些原始值、规则版本和已核验结构映射重新计算。',
    },
    {
      id: 'local-session',
      title: '匿名且只保存在会话中',
      description:
        '问题、草稿与锁定结果只写入当前浏览器的 sessionStorage，不上传服务器，也不能跨设备同步。',
    },
  ],
  layers: [
    {
      id: 'casting-facts',
      title: '起卦事实与卦象结构',
      status: 'published',
      description: '三币原始值、六爻顺序、本卦、变卦、动爻，以及八卦/六十四卦显式结构映射。',
    },
    {
      id: 'classical-content',
      title: '已授权卦辞与爻辞引用',
      status: 'published',
      description:
        '项目负责人授权的《六爻大概.txt》已发布 64 卦卦辞和 384 条普通爻辞，并保留逐条定位、哈希、版本和审核记录；彖传与象传仍未发布。',
    },
    {
      id: 'modern-interpretation-reference',
      title: '已授权白话学习参考释义',
      status: 'published',
      description:
        '项目负责人授权的逐条白话释义已发布 64 条卦辞解释与 384 条爻辞解释。它只帮助阅读已授权原文，不是针对用户问题的吉凶判断，也不参与专业六爻或 AI。',
    },
    {
      id: 'professional-rules',
      title: '专业六爻排盘',
      status: 'not-published',
      description:
        '八宫、世应、纳甲、六亲、六神、历法与用神规则仍在候选复核流程中，当前不输出专业字段或吉凶。',
    },
    {
      id: 'interpretation-ai',
      title: '解卦与 AI 表达',
      status: 'not-published',
      description: '解卦规则与 AI 均未启用；AI 不参与起卦、结构映射或任何确定性事实。',
    },
  ],
  classicalCandidateCollection: {
    title: '经传候选采集：不等于发布',
    description:
      '内部候选转录种子固定到 Kanripo《周易》仓库的具体提交，并保留文件哈希、CC BY-SA 4.0 署名信息与来源链接。它只用于逐条比对项目指定的 1815 年《周易正义》扫描底本。',
    safeguards: [
      '候选文件只保存在隔离的 draft 目录，不进入网站查询、运行时 SQLite 或公开 API。',
      '每一条拟发布经传仍须补齐底本卷次、扫描页/叶码/栏行定位、权利证据与内容哈希。',
      '未经两位不同审核人独立复核和权利审核，不显示候选正文，也不标记为已发布。',
    ],
  },
  reviewRequirements: [
    '传统文本和专业规则必须有固定底本或可定位来源、版本、授权状态与内容哈希。',
    '候选数据需由两位不同人员完成独立复核与差异处理，不能由自动化或模型代填审核。',
    '专业规则还必须绑定规则体系、适用边界、金标准案例、日历/时区版本与可追溯证据。',
  ],
  decisionSafety: [
    '本工具用于传统文化学习、娱乐与个人反思，不是科学预测。',
    '不提供医疗诊断、法律意见、投资建议或收益保证。',
    '涉及健康、法律、投资或紧急风险时，应以事实、证据和合格专业人士的意见为准。',
  ],
} as const satisfies {
  readonly version: string;
  readonly principles: readonly MethodologyPrinciple[];
  readonly layers: readonly PublicationLayer[];
  readonly classicalCandidateCollection: CandidateCollectionStatus;
  readonly reviewRequirements: readonly string[];
  readonly decisionSafety: readonly string[];
};

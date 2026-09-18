import { auxiliaryLabels, primaryLabels } from './analysis';
import { categoryTemplateSchema } from './schema';
import type {
  CategoryTemplate,
  ComposedInterpretationText,
  InterpretationAnalysis,
  InterpretationCategory,
  OutcomeAssessment,
  TemplateVariableName,
} from './types';

interface CategoryPolicy {
  readonly label: string;
  readonly focus: string;
  readonly risk: string;
}

const generalRisk =
  '本结果是基于版本化规则的文化解释与决策参考，不构成结果保证；重要决定请结合现实证据和专业意见。';

const categoryPolicies: Readonly<Record<InterpretationCategory, CategoryPolicy>> = {
  career: {
    label: '事业',
    focus: '重点关注职责、资源、协作条件与可控步骤',
    risk: generalRisk,
  },
  'job-search': {
    label: '求职',
    focus: '重点关注岗位匹配、材料准备、沟通反馈与备选路径',
    risk: generalRisk,
  },
  study: {
    label: '学业',
    focus: '重点关注学习节奏、基础薄弱处、反馈与复盘',
    risk: generalRisk,
  },
  wealth: {
    label: '财运',
    focus: '重点关注现金流、信息质量、损失边界与风险承受能力',
    risk: '本结果不构成投资建议、收益承诺或买卖指令。涉及资金时请独立核验信息，评估损失承受能力，并咨询具备资质的专业人士。',
  },
  investment: {
    label: '投资',
    focus: '重点关注信息来源、仓位与损失边界，不以卦象代替尽职调查',
    risk: '本结果不构成投资建议、收益承诺或买卖指令。投资可能损失本金，请独立尽调，并咨询具备资质的专业人士。',
  },
  cooperation: {
    label: '合作',
    focus: '重点关注目标一致性、责任边界、书面约定与退出机制',
    risk: generalRisk,
  },
  relationship: {
    label: '感情',
    focus: '重点关注双方意愿、沟通边界与现实行为',
    risk: generalRisk,
  },
  marriage: {
    label: '婚姻',
    focus: '重点关注长期承诺、沟通方式、家庭边界与共同决策',
    risk: generalRisk,
  },
  travel: {
    label: '出行',
    focus: '重点关注行程确认、天气交通、证件与安全预案',
    risk: '本结果不能替代实时天气、交通、公共安全或官方出行信息；存在人身风险时应以官方指引和现场专业人员意见为准。',
  },
  'lost-property': {
    label: '失物',
    focus: '重点关注最后确认位置、时间线、权限范围与可验证线索',
    risk: '请优先使用监控、定位、交易记录、失物招领和报警等现实渠道；不要据此指认、跟踪或对抗他人。',
  },
  health: {
    label: '健康',
    focus: '重点关注已观察到的症状、持续时间和就医条件，不从卦象推断诊断',
    risk: '本结果不构成医疗诊断、治疗方案或用药建议。若症状持续、加重或出现紧急情况，请及时联系正规医疗机构或当地急救服务。',
  },
  dispute: {
    label: '纠纷',
    focus: '重点关注证据保存、沟通记录、时限与程序选择',
    risk: '本结果不构成法律意见或案件结论。请保存证据、关注法定时限，并就具体事项咨询具备资质的法律专业人士。',
  },
  legal: {
    label: '法律',
    focus: '重点关注事实、证据、管辖、程序与法定时限',
    risk: '本结果不构成法律意见、权利义务判断或诉讼结果保证。请就具体法域和事实咨询具备资质的法律专业人士。',
  },
  'general-decision': {
    label: '综合决策',
    focus: '重点关注目标、约束、可逆性、验证节点与备选方案',
    risk: generalRisk,
  },
};

const allVariables: readonly TemplateVariableName[] = Object.freeze([
  'categoryLabel',
  'conclusion',
  'overall',
  'favorable',
  'unfavorable',
  'trend',
  'actions',
  'basis',
  'risk',
]);

function fallbackTemplate(category: InterpretationCategory): CategoryTemplate {
  return Object.freeze({
    templateId: `builtin-${category}`,
    templateVersion: 'builtin-local-template-v1',
    category,
    locale: 'zh-Hans',
    variables: allVariables,
    sections: Object.freeze({
      oneLineConclusion: '{{categoryLabel}}：{{conclusion}}',
      overallAnalysis: '{{overall}}',
      favorableFactors: '{{favorable}}',
      unfavorableFactors: '{{unfavorable}}',
      trend: '{{trend}}',
      actionAdvice: '{{actions}}',
      rationale: '{{basis}}',
      riskStatement: '{{risk}}',
    }),
  });
}

function symbolText(assessment: OutcomeAssessment): string {
  if (assessment.primarySymbol === 'undetermined') return '未定';
  const primary = primaryLabels[assessment.primarySymbol];
  const auxiliaries = assessment.auxiliarySymbols.map((symbol) => auxiliaryLabels[symbol]);
  if (assessment.primarySymbol === 'danger' && auxiliaries.includes('无咎')) return '厉而无咎';
  if (assessment.primarySymbol === 'remorse' && auxiliaries.includes('悔亡')) return '有悔而悔亡';
  return auxiliaries.length === 0 ? primary : `${primary}，兼见${auxiliaries.join('、')}`;
}

function conclusionText(outcome: readonly OutcomeAssessment[]): string {
  if (outcome.length === 2 && outcome[0]?.phase === 'current' && outcome[1]?.phase === 'later') {
    return `先${symbolText(outcome[0])}，后${symbolText(outcome[1])}`;
  }
  return outcome
    .map((assessment) => {
      const value = symbolText(assessment);
      if (assessment.phase === 'current') return `当前${value}`;
      if (assessment.phase === 'later') return `后续${value}`;
      if (assessment.phase === 'condition')
        return `若${assessment.conditionLabel ?? '条件成立'}，则${value}`;
      return value;
    })
    .join('；');
}

const trendLabels: Readonly<Record<InterpretationAnalysis['trend']['value'], string>> = {
  stable: '稳定',
  gradual: '渐进',
  recurring: '反复',
  stalled: '停滞',
  'hard-then-easy': '先难后易',
  'easy-then-hard': '先易后难',
  'danger-to-safety': '由危转安',
  'prosperity-to-decline': '由盛转衰',
  'condition-not-met': '条件未成',
  'insufficient-information': '信息不足',
};

function variableValues(
  analysis: InterpretationAnalysis,
): Readonly<Record<TemplateVariableName, string>> {
  const policy = categoryPolicies[analysis.category];
  const conclusion = conclusionText(analysis.outcome);
  const favorable =
    analysis.favorableFactors.length === 0
      ? '暂无经过规则确认的有利因素。'
      : analysis.favorableFactors
          .map((factor, index) => `${index + 1}. ${factor.messageKey}`)
          .join('；');
  const unfavorable =
    analysis.unfavorableFactors.length === 0
      ? '暂无经过规则确认的不利因素。'
      : analysis.unfavorableFactors
          .map((factor, index) => `${index + 1}. ${factor.messageKey}`)
          .join('；');
  const actions =
    analysis.actions.length === 0
      ? '先核验现实信息，设置可逆的小步骤和复盘节点；规则不足时不据此作高风险决定。'
      : analysis.actions.map((action, index) => `${index + 1}. ${action.messageKey}`).join('；');
  const basis =
    analysis.rationale.length === 0
      ? '当前没有命中可形成结论的已启用规则。'
      : analysis.rationale
          .map(
            (item) =>
              `${item.ruleName}（${item.ruleId}，优先级 ${item.priority}${item.overridden ? '，已被覆盖' : ''}）`,
          )
          .join('；');
  return Object.freeze({
    categoryLabel: policy.label,
    conclusion,
    overall: `${policy.focus}。结构化主象为“${conclusion}”；文本仅重述规则结果，不改变排盘事实。`,
    favorable,
    unfavorable,
    trend: trendLabels[analysis.trend.value],
    actions,
    basis,
    risk: policy.risk,
  });
}

function render(text: string, values: Readonly<Record<TemplateVariableName, string>>): string {
  return text.replace(
    /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g,
    (_match, variable: string) => values[variable as TemplateVariableName],
  );
}

function renderTemplate(
  template: CategoryTemplate,
  values: Readonly<Record<TemplateVariableName, string>>,
): CategoryTemplate['sections'] {
  return Object.freeze({
    oneLineConclusion: render(template.sections.oneLineConclusion, values),
    overallAnalysis: render(template.sections.overallAnalysis, values),
    favorableFactors: render(template.sections.favorableFactors, values),
    unfavorableFactors: render(template.sections.unfavorableFactors, values),
    trend: render(template.sections.trend, values),
    actionAdvice: render(template.sections.actionAdvice, values),
    rationale: render(template.sections.rationale, values),
    riskStatement: render(template.sections.riskStatement, values),
  });
}

export function composeInterpretationText(
  analysis: InterpretationAnalysis,
  templateInput?: unknown,
): ComposedInterpretationText {
  const fallback = fallbackTemplate(analysis.category);
  const parsed =
    templateInput === undefined ? null : categoryTemplateSchema.safeParse(templateInput);
  const custom = parsed?.success === true && parsed.data.category === analysis.category;
  const template = (custom ? parsed.data : fallback) as CategoryTemplate;
  const values = variableValues(analysis);
  let sections: CategoryTemplate['sections'];
  let usedFallback = !custom;
  try {
    sections = renderTemplate(template, values);
    if (Object.values(sections).some((section) => section.includes('{{'))) {
      throw new Error('Unresolved template variable.');
    }
  } catch {
    sections = renderTemplate(fallback, values);
    usedFallback = true;
  }

  const detailed = [
    sections.oneLineConclusion,
    `总体分析：${sections.overallAnalysis}`,
    `有利因素：${sections.favorableFactors}`,
    `不利因素：${sections.unfavorableFactors}`,
    `趋势：${sections.trend}`,
    `行动建议：${sections.actionAdvice}`,
    `判断依据：${sections.rationale}`,
    `风险声明：${sections.riskStatement}`,
  ].join('\n');
  const conflictSummary =
    analysis.resolution.conflicts.length === 0
      ? '无已记录冲突。'
      : analysis.resolution.conflicts
          .map((conflict) => `${conflict.conflictId}: ${conflict.explanation}`)
          .join('；');
  const professional = `${detailed}\n规则集：${analysis.rulesetId}@${analysis.rulesetVersion}\n冲突记录：${conflictSummary}`;
  return Object.freeze({
    templateVersion: usedFallback ? fallback.templateVersion : template.templateVersion,
    usedFallback,
    brief: `${sections.oneLineConclusion}；趋势：${sections.trend}。${sections.riskStatement}`,
    detailed,
    professional,
    classicalStyle: Object.freeze({
      label: '古风表达',
      disclaimer: '以下为现代拟写，仅重述结构化结果，不是古籍原文或引文。',
      text: `观其势：${values.conclusion}；宜据实审慎而行。`,
    }),
    sections,
    riskStatement: sections.riskStatement,
  });
}

export function getBuiltinCategoryTemplate(category: InterpretationCategory): CategoryTemplate {
  return fallbackTemplate(category);
}

export { categoryPolicies };

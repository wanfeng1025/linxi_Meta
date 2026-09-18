# 解卦结构规格

- 状态：模块六确定性引擎已实现；传统规则与经审核分类模板尚未导入
- 版本：`interpretation-result-v1`
- 原则：事实先于文本、确定性先于 AI、结论必须可追溯

## 1. 边界

解卦系统接收已确定的本卦、变卦、动爻和版本化规则事实，输出结构化结果。自由文本是结构化结果的派生展示，不能作为后续规则计算的输入。

“简易《周易》解释”“专业六爻事实”和“表达文本”使用独立字段与来源。专业规则未实现时返回明确的 `notAvailable` 能力状态，而不是伪造空盘。

## 2. 结构化结果

建议顶层契约：

```ts
interface InterpretationResult {
  schemaVersion: string;
  rulesetVersion: string;
  contentVersion: string;
  divinationRecordId: string;
  facts: DivinationFacts;
  primarySymbol: PrimarySymbolAssessment;
  auxiliarySymbols: AuxiliarySymbolAssessment[];
  trend: TrendAssessment;
  favorableFactors: EvidenceBackedFactor[];
  unfavorableFactors: EvidenceBackedFactor[];
  actions: ActionRecommendation[];
  evidence: EvidenceReference[];
  categories: CategoryInterpretation[];
  professional: ProfessionalAnalysisAvailability;
  presentation: PresentationFields;
}
```

每个判断类对象至少含 `value`、`ruleId`、`evidenceIds`、`confidenceKind`。`confidenceKind` 表示规则是否确定命中或信息不足，不表达预测概率。

## 3. 事实字段

`DivinationFacts` 至少包含：本卦稳定 ID、变卦稳定 ID、按初爻到上爻的六爻编码、动爻位置、原始铜钱引用、规则版本和内容版本。专业模式后续可增加用神、世应、月建、日辰、旬空、旺衰和生克冲合事实，但不得在未实现时伪造。

## 4. 主象

主象 `PrimarySymbol` 使用受控枚举：

- `吉`；
- `凶`；
- `悔`；
- `吝`；
- `厉`；
- `咎`；
- `未定`（没有足够规则依据时必须使用）。

结构同时记录原文术语、规则编号和证据引用。不得为了“给用户一个答案”把 `未定` 随机映射为其他值。

## 5. 辅助象

辅助象为可重复的受控条目，例如 `无咎`、`悔亡`、`亨`、`利`。正式枚举和语义必须从经核验内容与规则中建立；当前仅预留类型，不批量填充词表。每项包含极性、作用域、规则编号和证据。

## 6. 趋势

趋势不等同吉凶，建议使用以下结构维度：

- `direction`：改善、走弱、稳定、反复、转折、未定；
- `phase`：当前、近期、后续或规则定义的阶段；
- `summaryKey`：本地模板键；
- `ruleId` / `evidenceIds`。

时间尺度不得由 AI 猜测。专业时序规则必须有单独来源和版本。

## 7. 有利与不利因素

每个因素必须是结构化事实或规则推论：

```ts
interface EvidenceBackedFactor {
  factorId: string;
  kind: string;
  subjectIds: readonly string[];
  descriptionKey: string;
  ruleId: string;
  evidenceIds: readonly string[];
}
```

同一事实不能仅通过不同文案重复计权。冲突因素并存时保留双方和冲突处理记录，不用文本覆盖。

## 8. 行动建议

行动建议应为低风险、可执行、非保证性的反思提示，包含：

- `actionId`；
- `category`；
- `priority`；
- `messageKey`；
- `basedOnRuleIds`；
- `safetyTag`。

禁止医疗诊断、投资买卖保证、法律结论、人身安全冒险或“必然成功/失败”。涉及高风险主题时只能提示寻求合格专业人士或紧急支持。

## 9. 判断依据

`EvidenceReference` 必须能追溯到以下一种：

- 经核验文化内容：`sourceId + recordId + contentVersion`；
- 规则命中：`ruleId + rulesetVersion + inputFactIds`；
- 用户原始输入：只引用记录内稳定 ID，不把问题原文写日志；
- 系统推导：记录纯函数版本和上游事实。

展示层应允许用户从结论展开查看依据。任何无依据结论都是校验错误。

## 10. 分类解释

分类（如通用、事业、关系、学习、出行）使用稳定 `categoryId`。分类模板只能选择或重述已存在的结构化事实，不改变主象，不产生新卦象事实。分类集合、适用条件和模板也必须版本化并有内容审核。

用户问题分类是解释筛选条件，不影响随机起卦与卦象计算。

## 11. AI 可修改字段

AI 只可生成或改写 `presentation` 下的表现字段：

- `plainLanguage`：结构化结论的白话改写；
- `summary`：摘要；
- `termExplanations`：术语解释；
- `toneVariant`：不改变语义的语气变体。

AI 输出必须引用输入字段 ID，经 Zod Schema 校验、长度/安全策略检查，并在失败、离线或超时时回退本地模板。AI 生成内容标记来源，不冒充古籍原文。

## 12. AI 不可修改字段

除 `presentation` 白名单外均不可修改，特别包括：

- 原始铜钱、爻序、爻值；
- 本卦、变卦、动爻；
- 日期、时区、干支、月建、日辰、旬空；
- 世应、纳甲、六亲、六神、用神；
- 旺衰、生克冲合与动变事实；
- 主象、辅助象、趋势枚举；
- 有利/不利因素的结构和权重；
- 规则编号、证据引用、规则/内容版本；
- 安全标签与能力可用状态。

服务端或客户端收到 AI 返回的这些字段时必须拒绝，而不是合并。

## 13. 冲突与缺失

规则按“优先级降序 → 规则集声明的同级策略 → `ruleId` 字典序”执行。排他组先选择排序靠前的规则；显式冲突支持覆盖对方、让位对方、共存和双方阻断；未声明但写入同一语义槽的不同值保留为 `unresolved-preserved`，对应主象置为 `未定`、趋势置为 `信息不足`。所有排除、覆盖、共存和未决冲突均生成记录，不静默丢失。

权重只在规则集明确选择 `higher-weight-then-rule-id` 时用于同优先级排序，不把吉、凶、悔、吝、厉、咎换算为线性总分。来源或规则不足时使用 `未定`、空因素列表和明确缺失原因。禁止用通用吉凶话术掩盖缺失。

## 14. 验收原则

- 相同事实与规则版本得到逐字段一致的结构化结果；
- 每个非 `未定` 判断至少有一个有效规则和证据；
- 文本模板不改变结构化字段；
- 删除/禁用 AI 后，本地解释闭环仍可用；
- 对 AI 越权字段、未知枚举、虚假来源和高风险承诺进行拒绝测试；
- 专业数据未准备时，UI 明确不可用而不是展示假值。

## 15. 模块六实现契约

实现位于 `src/domain/interpretation`，Application 入口为 `src/application/interpretation/InterpretationService.ts`。固定流水线为：

```text
版本化输入与规则 Schema
  → 白名单条件匹配与逐谓词证据
  → 优先级、排他组和显式/语义冲突处理
  → 主象/辅助象/阶段结果、趋势、因素和建议
  → 分类本地模板与通用回退
  → 简洁版、详细版、专业版和现代拟写古风入口
```

DSL 只允许 `equals`、`contains`、数值大小比较、`intersects`、`exists`、`not-exists` 以及 `all`/`any` 条件组。字段必须出现在规则集 `availableFields` 中，字段路径拒绝 `__proto__`、`prototype`、`constructor`；实现不使用 `eval`、动态函数源码或任意表达式执行。

结果允许同一阶段的主象加辅助象（如结构化“厉 + 无咎”）、多阶段结果和条件式结果。模板只能读取分析投影，不回写起卦、卦象、日月、世应、用神或规则命中。模板 Schema 或变量校验失败、分类不符、模板缺失时，统一退回 `builtin-local-template-v1`，不调用网络或随机文案。

内置安全回退覆盖事业、求职、学业、财运、投资、合作、感情、婚姻、出行、失物、健康、纠纷、法律和综合决策。健康、财务/投资和纠纷/法律始终附对应风险声明；古风入口明确标记为现代拟写、非古籍原文。

## 16. 当前数据状态与发布门禁

截至 2026-07-20，`data/source/content-dataset.json` 中 `ruleVersions`、`ruleDefinitions`、`questionCategories`、`interpretationTemplates` 和专业规则均为 0。自动化金标准使用 `tests/fixtures/interpretation-ruleset.fixture.ts` 中明确标记的 synthetic/test-only 数据，只证明工程契约，不证明任何传统断法正确。

生产规则发布前仍须补齐规则体系、可靠来源、适用边界、冲突关系、校对人、校对时间、内容版本和人工金标准。缺少这些材料时不得把测试规则、内置安全回退或模板文案提升为传统六爻结论。

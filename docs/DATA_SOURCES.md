# 传统文化数据来源规范

- 状态：强制基线
- 最后更新：2026-07-19

## 1. 目的

本规范用于防止把模型生成、记忆拼接、版本不明或授权不明的内容当作真实古籍/六爻数据。适用于八卦、64 卦映射、卦辞、爻辞、注疏、八宫、世应、纳甲、六亲、六神、历法、旺衰、用神、动变规则和解释模板。

数据来源不明时，只能标记为待确认、建立 Schema/接口/示例和缺失报告，不能生成看似完整的数据。

## 2. 每条记录的强制来源字段

| 字段             | 类型             | 说明                                                                                     |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| `sourceId`       | 非空稳定字符串   | 来源记录 ID；不可复用表示不同版本                                                        |
| `sourceTitle`    | 非空字符串       | 书名、论文、数据集或内部推导说明；未知写“待确认”且状态为 pending                         |
| `edition`        | 字符串或 null    | 出版/底本/数据库版本；未知为 null，不猜测                                                |
| `sourceType`     | 枚举             | `classical-text`、`modern-study`、`authorized-dataset`、`internal-derivation`、`pending` |
| `licenseStatus`  | 枚举             | `cleared`、`public-domain`、`restricted`、`pending`                                      |
| `verifiedBy`     | 字符串或 null    | 实际校对人/审核角色；机器生成器不能充当审核人                                            |
| `verifiedAt`     | ISO 8601 或 null | 完成核验的时间，含时区                                                                   |
| `notes`          | 字符串           | 页码、章节、异文、适用边界、授权说明和待办                                               |
| `contentVersion` | 非空版本字符串   | 内容集合的不可变版本；修改内容必须升版                                                   |

模块四 v2 还要求来源目录保存 `authorOrEditor`、`dynastyOrYear`、`publisherOrPlatform`、`url`、`publicDomainStatus`、`transcriptionStatus`、`proofreadingStatus`、`accessedAt` 和 `reliabilityGrade`。每条内容自身保存 `sourceLocator`、`originalScript`、规范化/编辑说明、审核信息和 checksum；文件顶部的单一 source 不能替代逐条溯源。

记录另有 `recordId`、`recordType` 和 `status: pending | verified`。只有 `verified` 记录可进入生产目录；它必须同时具备非空 `verifiedBy`/`verifiedAt`，且来源类型和授权状态不能为 `pending`。

## 3. 来源分级

- **A级：原始/权威版本**。可定位到明确底本、出版信息、页码或权威开放数据，授权已确认；
- **B级：可靠现代研究**。作者、出版物、引用链和适用规则体系明确，授权已确认；
- **C级：内部推导**。完全由已核验 A/B 级事实通过有编号的确定性规则产生，记录输入与算法版本；
- **P级：待确认**。网络摘录、口述、模型记忆、版本不清或授权不明，只能进入候选记录/缺失报告。

级别不自动等于“正确”；冲突版本必须并存记录，不静默合并。

## 4. 核验流程

1. 建立候选条目，只录入可定位的书目信息或数据集信息；
2. 确认 `sourceType`、具体版本/底本和所采用规则体系；
3. 确认版权、公版或项目授权边界；“互联网上可见”不等于可再发布；
4. 双人或明确责任人校对文字、标识、次序和异文；
5. 为规则数据补充正例、反例、边界例和适用范围；
6. 赋予不可变 `contentVersion`，填写审核人和时间；
7. 通过 JSON Schema/Zod、引用完整性、唯一性和领域完整性测试；
8. 仅把通过的 `verified` 记录发布到 `data/catalog/`；
9. 变更内容时新建版本并保留旧版本供历史记录回看。

## 5. 不同数据类型的附加要求

### 5.1 卦辞与爻辞

必须记录底本/版本、原文定位、字符规范化策略、异体字处理和是否含现代标点。原文、校勘说明和现代释义使用不同字段，AI 生成文本不得标为原文。

### 5.2 八卦与 64 卦映射

必须显式保存稳定 ID、上下卦位型和传统编号来源。不得以 JSON 数组下标暗示卦序，不得用程序员熟悉的二进制顺序冒充传统次序。

### 5.3 专业六爻规则

每项需额外记录 `rulesetId`、体系/流派名称、适用条件、优先级、冲突策略、引用章节、正反案例。不同体系的数据不能在同一规则集静默混用。

### 5.4 历法数据

必须记录历法库/算法版本、支持年份、时区、日界和历法假设，并用权威日历固定案例校对。不得由通用日期 API 拼凑干支结论。

### 5.5 分类解释模板

模板需记录作者/审核人、适用结构化字段、禁用高风险表述和内容版本。模板不能创造新的规则事实。

## 6. 当前来源状态

截至 2026-07-20，项目负责人已提供并批准 `六爻App模块四内容数据库详细说明.txt` 作为八卦与 64 卦结构映射主源；文件 SHA-256 为 `E44D669F17CD9C90D30FC7481E3F6D741D5E9B40AA4CE4004D04BF1405BE2AD7`。第 3、4 节经 Unicode 17.0.0 UCD NamesList 和维基文库《周易》固定版本 `oldid=7907208` 交叉核验后形成不可变生产版本 `hexagram-mapping-2026-07-20-v1`。Unicode 数据适用 Unicode License v3；维基文库仅用于核对公版原作的名称/结构事实，未复制经文、现代解释或网页排版。

2026-07-26，项目负责人明确确认有权公开发布 `六爻大概.txt`，并批准它作为授权数据集。仓库将原文件固定为 `data/source/classical/liuyao-overview-authorized-v1.txt`（SHA-256 `6b1b6df71dbdcb6b2bced70d1d9235f93a7204297c4378918dd92e44a4b11da4`），通过 `scripts/import-authorized-classical-quotes.ts` 生成不可变版本 `liuyao-overview-authorized-v1`。该版本只发布 64 条卦辞与 384 条普通爻辞，每条均有 `sourceLocator`、审核角色、时间和 SHA-256；授权类型为 `authorized-dataset`、`licenseStatus: cleared`。彖传、象传、用九/用六和专业规则并未随之发布；白话释义由下列独立数据集管理。

同日，项目负责人提供并确认有权公开发布 `六十四卦卦辞爻辞逐条解释_按顺序.txt`。该文本自述为依据前述文件整理的白话解读稿，不是校勘本；仓库将原文件固化为 `data/source/interpretations/hexagram-line-explanations-authorized-v1.txt`（SHA-256 `52a3a654abe3a2fe6360726e5d575a664dcecfef6faae046b4564335256c7f48`），并通过 `scripts/import-authorized-hexagram-line-interpretations.ts` 生成不可变版本 `hexagram-line-explanations-authorized-v1`。该版本发布 64 条卦辞解释和 384 条普通爻辞解释，每条显式关联已授权原文的稳定 ID、文王序号、爻位、定位和 SHA-256。授权类型为 `authorized-dataset`、`licenseStatus: cleared`，由 `project-owner-authorized-dataset-approval` 于 2026-07-26 审核。它只用于网站结果页的学习参考，不能用于自动吉凶判断、专业六爻规则或 AI 提示词。原有 `data/draft/interpretations/` 候选快照保留用于审计，不参与运行时查询。

因此：

- `data/catalog/index.json` 包含 8 条 verified 八卦和 64 条 verified 显式映射；
- `data/examples/` 只含显式 `pending` 的结构示例；
- `data/MISSING_DATA.md` 记录待补数据；
- `data/source/classical/liuyao-overview-authorized-v1.json` 发布 64 条卦辞和 384 条普通爻辞；
- 不导入彖传、象传、经传全文、专业六爻数据，且不把已授权白话学习释义当作自动解卦规则；
- `data/source/` 保存 production 规范源（72 条结构映射 + 独立授权引文数据集），`data/draft/` 保存候选，`data/fixtures/` 只保存 synthetic 测试说明/数据；SQLite 是派生运行时存储。

这是“卦象结构映射完成”状态，不是完整内容数据库完成状态。后续经文和专业规则仍必须由项目负责人提供/确认来源与授权，或明确委托来源研究和审核。

## 7. 技术数据源与传统数据源的区别

Expo、React Native、SQLite 等官方文档只证明技术选型和 API 兼容性，不能证明传统文化内容。技术依赖的依据记录在 `ARCHITECTURE.md` 和 ADR；传统内容仍必须满足本规范。

## 8. 校验门禁

`pnpm run validate:data` 当前校验生产目录与结构示例。后续至少增加：

- 稳定 ID 和来源引用唯一性；
- `verified` 元数据完整性；
- 授权状态门禁；
- 64 卦组合唯一/完整性；
- 每卦六爻引用完整性；
- 规则引用、优先级和冲突图无悬空；
- 内容版本不可变检查；
- 文本哈希和数据库导入前后对账。

模块四已实现以上稳定 ID、逐条溯源/授权、完整模式数量、组合/爻位、八宫/纳甲/六亲/六神/地支覆盖、规则引用、模板变量、hash、JSON Schema 漂移和导入对账门禁。模块三 production catalog 的 72 条结构记录现由 `build:content-source` 确定性同步到模块四 production source 和 SQLite seed；授权引文与授权白话学习释义数据集分别由对应的 `check:*` 命令与 `validate:data` 校验原文件、覆盖和逐条哈希。未核验的经传、专业规则与其他解释规则仍为 0。

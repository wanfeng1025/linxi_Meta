# 专业六爻排盘规则规格与实施状态

- 状态：候选验收包已隔离导入；生产规则仍未发布
- 审计日期：2026-07-25
- 基础需求文件：`六爻App模块五专业六爻数据源与规则说明.txt`
- 补全验收文件：`六爻App模块五生产不足补全与验收包.txt`
- 补全验收文件 SHA-256：`8F5118AB2DE1ED04D2CFF14977CC2C10BF22E90E7390ECB1DCD73FCFB429DFEB`

## 1. 结论与上线门禁

需求文件建议采用 `jingfang_yehe_baseline@1.0.0`：京房八宫/纳甲为结构骨架，以《增删卜易》所代表的野鹤体系处理实占规则，并以《黄金策》交叉核对通则。该选择当前仍是“推荐基线”，不是已发布生产规则集。

仓库没有满足双人复核、固定版本定位、内容哈希和金标准案例要求的专业数据。因此本模块只提供数据驱动的纯函数、严格的生产规则包门禁、历法端口、证据结构和 synthetic/test-only 测试；不含生产八宫表、纳甲表、历法算法、用神表或吉凶文本。

`createProfessionalRuleset` 只接受：

- `verificationStatus: verified`；
- 固定 `rulesetVersion`、`contentVersion`、`calendarAlgorithmVersion`、`timezoneDataVersion`；
- 来源清单全部 verified；
- `sourceManifestHash` 与 `rulesHash`；
- 至少两名复核者和复核时间；
- 八宫 64、纳甲 48、地支 12、六亲五行矩阵 25、六神 6/日干起例 10、六旬空亡 6、相关神角色 5 的完整覆盖；
- 至少一条用神规则。

小型自动化测试只能调用明确命名的 `createTestProfessionalRuleset`，结果保留 `verificationStatus: test-only`，不得进入产品组合根或 production seed。

候选包只能由 `createCandidateProfessionalRuleset` 加载，状态固定为
`production_candidate`。它可以进行结构校验、人工复核、差异比对和快照留存，
但 `ProfessionalRulesetRepository.getRuleset()` 不会返回它，页面也不会据此开放专业排盘。

## 1.1 候选验收包（2026-07-25）

隔离文件位于 `data/draft/professional/`，均由
`pnpm run build:professional-candidate` 再生，并由
`pnpm run check:professional-candidate` 检查漂移：

- `jingfang-yehe-baseline-1.0.0-candidate.1.json`：京房/野鹤候选规则表；
- `calendar-2026-candidate.1.json`：HKO 2026 节气、干支锚点与 tzdb 2026c 候选夹具；
- `source-manifest-candidate.1.json`：来源清单；
- `gold-cases-candidate.1.json`：17 个 `candidate_for_human_review` 金标准案例编号。

候选规则集为 `jingfang_yehe_baseline@1.0.0-candidate.1`，使用
`civil_midnight_solar_terms_tzdb2026c@1.0.0-candidate.1`。表中八宫 64、世应、纳甲
48、地支五行 12、六亲矩阵 25、六神 6/日干起例 10、旬空 6 均有来源 ID；没有与其他
流派的表混算。候选包中的 `verifiedBy` 固定为空，不能由自动化填写。

## 1.2 历法候选实现边界

`CandidateCalendarProvider` 是离线、注入式 Provider：输入必须是 UTC ISO 瞬间、IANA
时区、策略 ID、历法/tzdb 版本和真太阳时配置；它不读取 JavaScript 主机本地时区。

- 日柱按验收包给出的香港 2026-01-01（乙亥、序号 11）民用日期锚点逐日模 60 计算；
- 月建只在提供的“小寒”和“立春”节切换，雨水不切换；不会以公历月份代替月建；
- DST 仅覆盖候选包列出的 2026 香港/上海、洛杉矶、纽约、伦敦边界；本地不存在时间和
  重复时间分别返回 `NONEXISTENT`、`AMBIGUOUS`；
- 未提供的前后节气边界在输出中为 `null`，不作猜测或外推。

香港天文台的二十四节气页面以香港时间（UTC+8）呈现节气时刻，且说明其资料基础；2026
年公农历对照表也由天文台发布。候选数据仍须按项目流程双人复核后才可升级。

## 1.3 审阅、差异与快照

迁移 `007_create_professional_candidate_staging` 新增独立的候选暂存表：候选规则包、来源、
人工签署、差异、历法策略/边界、金标准案例及排盘快照。它们与既有 verified 内容表分离。
候选包只能添加 `accepted`、`rejected` 或 `needs_changes` 的人工签署；签署本身不执行升级。
图表快照同时保存规则三元组、历法策略/版本、时区、计算时刻、结构化图表和哈希。

## 2. 规则集与来源审计

| 项目                           | 建议体系/来源                       | 当前状态 | 生产前缺口                                                     |
| ------------------------------ | ----------------------------------- | -------- | -------------------------------------------------------------- |
| 八宫、世应、游魂归魂、纳甲     | 京房体系；《京氏易传》              | pending  | 固定底本/页码、完整表、双人逐项复核、64/48 金标准              |
| 六亲、用神、元忌仇、旬空、动变 | 《增删卜易》野鹤基线                | pending  | 在线本明确未完全校对；需影印/可靠整理本复核和规则逐条定位      |
| 旺衰、日月总则                 | 《增删卜易》并以《黄金策》交叉核对  | pending  | 冲突优先级、条件适用边界、人工案例尚未签字                     |
| 节气瞬间、月建                 | 香港天文台官方资料                  | pending  | 固定年份数据、原始文件哈希、边界案例、算法实现与复核           |
| 时区                           | IANA tzdb                           | pending  | 固定实际 tzdb 版本和目标平台验证                               |
| 日柱                           | 可信历书基准 + 固定历法实现交叉验证 | pending  | 基准日、换日政策、实现版本、跨语言对照、金标准                 |
| 历法开源交叉验证               | 6tail/lunar-javascript 等           | pending  | 固定 release/commit、许可证、哈希；不得作为唯一权威            |
| 完整排盘案例                   | 双人独立人工排盘                    | missing  | 需求所列无动/单动/多动/全动、用神、空破冲、节气/时区等均未签字 |

需求文件本身是工程规格与来源索引，不等同于对所列传统表的双人校勘记录，也没有授权 Codex 将推荐表提升为 production。

## 3. 已实现的纯函数边界

`src/domain/professional` 按依赖顺序提供：

1. `resolvePalace`；
2. `resolveWorldAndResponse`；
3. `applyNajia`；
4. `resolveLineElements`；
5. `resolveSixRelatives`；
6. `resolveSixSpirits`；
7. `resolveCalendarContext`（只校验/调用 Provider，不自选算法）；
8. `resolveVoidBranches`；
9. `resolveBranchRelations`；
10. `evaluateLineStateFacts`；
11. `selectUsefulGodCandidates`；
12. `resolveOriginalSupportingAvoidingEnemyGods`；
13. `resolveMovingTransformations`；
14. `resolveHiddenAndFlyingSpirits`；
15. `buildSixYaoChart`。

不存在单体 `analyzeHexagram()`。聚合器只组合结构化事实，不生成最终解卦文章。

`scripts/professional-ruleset-schema.ts` 与生成的 `schemas/professional-ruleset.schema.json` 定义规则包的外部边界；`ProfessionalRulesetRepository` 只允许按精确三元组加载一个包，不提供“latest”或跨版本回退。SQLite 实现仅提供独立的候选暂存、签署和快照功能；`getRuleset()` 仍只面向 production-verified 包，当前返回空值。

## 4. 历法契约

历法输入强制包含 UTC ISO 瞬间、IANA 时区、日界政策、真太阳时配置、历法算法版本和 tzdb 版本。Provider 输出还必须包含本地时间、月建地支、日干支、六十日序号、当前“节”的边界瞬间、来源 ID 和 verified 状态。

以下情况直接拒绝：固定偏移伪装时区（如 `UTC+8`）、隐式系统时区、版本不一致、日序不在 0..59、无来源、未核验结果。当前没有生产 Provider，因而不会错误地用公历月份代替月建，也不会擅自选择 00:00/23:00/真太阳时换日。

## 5. 事实与歧义

旺衰相关输出是 `EvidenceFact[]`，保留规则 ID、来源定位、主体爻、客体、事实类型、倾向、优先级、证据字段和全部版本。当前通用引擎可按已注入关系表输出月破、日冲、月/日合及生克关系，并单独记录旬空；不汇总为强弱分数，不推导最终吉凶。

用神输入包括问题分类/子类、问卦主体、自问或代问、目标角色/关系、目标结果、上下文标签和传统性别规则开关。输出允许多候选；同优先级规则冲突时 `selected = null` 且标记 `ambiguous`，无匹配时标记 `insufficient-context`。

## 6. 流派差异隔离

以下项目不得在 `jingfang_yehe_baseline` 中暗中混用：

- 00:00、23:00 与真太阳时换日；
- 三刑、六害、六破是事实记录还是主导判断；
- 动爻逢日冲是否一概冲散；
- 旬空是否一概无用；
- 六神是否可独立断吉凶；
- 十二长生完整参与还是仅启用已确认节点；
- 土五行采用何种寄生规则。

规则包以 `rulesetId + rulesetVersion + contentVersion + compatibilityGroup` 绑定所有记录；任一记录版本不一致即抛出 `MIXED_RULESET`。

## 7. 测试状态与金标准缺口

现有测试使用明显命名的 synthetic/test-only 数据，只验证工程契约：版本门禁、混用拒绝、初爻到上爻顺序、世应合法性、表驱动纳甲/六亲、六神循环、旬空表读取、禁用关系、历法版本校验、用神不足状态、动爻/伏神结构和完整排盘聚合。

这些测试不是传统规则金标准，不能证明 `jingfang_yehe_baseline@1.0.0` 正确。生产验收仍需需求文件所列全部双人复核案例，尤其是 64 卦八宫世应、48 条纳甲、十日干六神、十二节边界前/当/后、六旬、三个时区与 DST，以及完整无动/单动/多动/全动排盘。

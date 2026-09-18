# 数据字典

- 状态：模块四跨 JSON、Repository 与 SQLite 基线
- 说明：字段用于跨 JSON、领域对象和 SQLite 对齐；物理表名见 `DATABASE_DESIGN.md`

## 1. 通用约定

- 所有 ID 为稳定非空字符串，生成后不因展示名称改变；
- 时间使用带时区的 ISO 8601 字符串，SQLite 中以 UTC 文本存储；
- 爻位 `linePosition` 取 1..6，1 为初爻、6 为上爻；
- 六爻数组固定初爻到上爻；
- `rulesetVersion`、`contentVersion`、`schemaVersion` 落库时禁止使用 `latest`；
- 原始铜钱值是事实，衍生字段可重算但不能覆盖事实；
- 可空表示“概念允许缺失”，不得用空字符串替代 null。

## 2. SourceMetadata

每条传统文化记录内嵌或引用以下来源信息：

| 字段             | 类型     | 可空 | 约束                                                                               |
| ---------------- | -------- | ---- | ---------------------------------------------------------------------------------- |
| `sourceId`       | string   | 否   | 稳定、唯一来源版本 ID                                                              |
| `sourceTitle`    | string   | 否   | 不得为空；待确认记录明确写待确认                                                   |
| `edition`        | string   | 是   | 版本/底本/出版信息                                                                 |
| `sourceType`     | enum     | 否   | classical-text / modern-study / authorized-dataset / internal-derivation / pending |
| `licenseStatus`  | enum     | 否   | cleared / public-domain / restricted / pending                                     |
| `verifiedBy`     | string   | 是   | verified 记录必须非空                                                              |
| `verifiedAt`     | datetime | 是   | verified 记录必须非空                                                              |
| `notes`          | string   | 否   | 可为空文本但字段必须存在                                                           |
| `contentVersion` | string   | 否   | 不可变内容版本                                                                     |

## 3. TraditionalContentRecord

| 字段         | 类型           | 可空 | 说明                                                         |
| ------------ | -------------- | ---- | ------------------------------------------------------------ |
| `recordId`   | string         | 否   | 小写字母/数字/连字符稳定 ID                                  |
| `recordType` | enum           | 否   | trigram / hexagram / line-text / professional-rule / example |
| `status`     | enum           | 否   | pending / verified                                           |
| `source`     | SourceMetadata | 否   | 完整来源信息                                                 |
| `content`    | object         | 否   | 由 recordType 的细分 Schema 约束                             |

`data/catalog/` 只允许 verified；example 永远不得参与产品查询。

## 4. DivinationSession（起卦会话）

| 字段                     | 类型       | 可空 | 说明                                   |
| ------------------------ | ---------- | ---- | -------------------------------------- |
| `sessionId`              | string     | 否   | 会话 ID                                |
| `state`                  | enum       | 否   | draft / collecting / complete / locked |
| `question`               | string     | 是   | 用户可选问题；敏感、默认仅本地         |
| `categoryId`             | string     | 是   | 分类筛选，不影响随机与卦象             |
| `lines`                  | CoinLine[] | 否   | 长度 0..6，初爻到上爻                  |
| `redoLines`              | CoinLine[] | 否   | 撤销恢复栈；锁定后为空或冻结           |
| `inputSchemaVersion`     | string     | 否   | 输入结构版本                           |
| `rulesetVersion`         | string     | 否   | 起卦计算规则版本                       |
| `randomAlgorithmVersion` | string     | 否   | 原始铜钱所用随机算法版本               |
| `createdAt`              | datetime   | 否   | 会话创建时间                           |
| `updatedAt`              | datetime   | 否   | 最近持久化时间                         |
| `lockedAt`               | datetime   | 是   | 仅 locked 状态非空                     |

## 5. CoinLine（三枚铜钱原始爻）

| 字段              | 类型    | 可空 | 约束                                |
| ----------------- | ------- | ---- | ----------------------------------- |
| `position`        | integer | 否   | 1..6，且等于数组索引 + 1            |
| `coins`           | tuple   | 否   | 恰三项，每项为 2 或 3               |
| `value`           | integer | 否   | 6 / 7 / 8 / 9，等于 coins 合计      |
| `polarity`        | enum    | 否   | yin / yang，衍生值                  |
| `movement`        | enum    | 否   | static / moving，衍生值             |
| `changedPolarity` | enum    | 否   | yin / yang，衍生值                  |
| `sequence`        | integer | 否   | 起爻顺序标识，当前必须等于 position |

衍生字段若持久化，读取时应可校验；冲突时原始 `coins` 优先并报告数据损坏，不静默修复。

## 6. HexagramSnapshot（卦象快照）

| 字段                    | 类型      | 可空 | 说明                        |
| ----------------------- | --------- | ---- | --------------------------- |
| `primaryLineBits`       | tuple     | 否   | 六项 0/1，初爻到上爻        |
| `changedLineBits`       | tuple     | 否   | 六项 0/1，初爻到上爻        |
| `movingPositions`       | integer[] | 否   | 递增，取值 1..6             |
| `lowerTrigramId`        | string    | 否   | 本卦下卦显式映射所得稳定 ID |
| `upperTrigramId`        | string    | 否   | 本卦上卦显式映射所得稳定 ID |
| `primaryHexagramId`     | string    | 否   | 不以数组下标推断            |
| `changedLowerTrigramId` | string    | 否   | 变卦下卦显式映射所得稳定 ID |
| `changedUpperTrigramId` | string    | 否   | 变卦上卦显式映射所得稳定 ID |
| `changedHexagramId`     | string    | 否   | 不以数组下标推断            |
| `encodingVersion`       | string    | 否   | 阴阳编码与位序版本          |
| `mappingDataVersion`    | string    | 否   | 八卦/64 卦显式映射数据版本  |
| `rulesetVersion`        | string    | 否   | 映射/变爻规则版本           |

编码、变爻与结构化结果已在模块三实现；正式稳定内容 ID 和完整映射仍待来源与人工审核，当前不提供真实 production 枚举数据。

## 7. InterpretationResult（结构化解卦）

| 字段                 | 类型     | 可空 | 说明                            |
| -------------------- | -------- | ---- | ------------------------------- |
| `schemaVersion`      | string   | 否   | 结果 Schema 版本                |
| `rulesetVersion`     | string   | 否   | 解释规则版本                    |
| `contentVersion`     | string   | 否   | 引用内容版本                    |
| `divinationRecordId` | string   | 否   | 对应锁定记录                    |
| `facts`              | object   | 否   | 卦象及可用专业事实              |
| `primarySymbol`      | object   | 否   | 吉/凶/悔/吝/厉/咎/未定 + 依据   |
| `auxiliarySymbols`   | object[] | 否   | 辅助象 + 依据                   |
| `trend`              | object   | 否   | 趋势方向、阶段和依据            |
| `favorableFactors`   | object[] | 否   | 有利因素                        |
| `unfavorableFactors` | object[] | 否   | 不利因素                        |
| `actions`            | object[] | 否   | 低风险行动建议                  |
| `evidence`           | object[] | 否   | 来源/规则引用                   |
| `categories`         | object[] | 否   | 分类解释                        |
| `professional`       | object   | 否   | available / notAvailable + 原因 |
| `presentation`       | object   | 否   | AI/模板可改写白名单             |

## 8. Ruleset（规则集）

| 字段          | 类型     | 可空 | 说明                          |
| ------------- | -------- | ---- | ----------------------------- |
| `rulesetId`   | string   | 否   | 规则集合稳定 ID               |
| `version`     | string   | 否   | 不可变版本，与 ID 组成唯一键  |
| `systemName`  | string   | 否   | 采用体系/流派；未确认不得发布 |
| `status`      | enum     | 否   | draft / verified / retired    |
| `sourceIds`   | string[] | 否   | 来源引用，verified 不得为空   |
| `effectiveAt` | datetime | 是   | 发布时点                      |
| `notes`       | string   | 否   | 适用边界与迁移说明            |

## 9. HistoryRecord（历史聚合）

历史聚合包含问题元数据、六条 CoinLine、HexagramSnapshot、InterpretationResult 快照和所有版本字段。它是追加式已发生事实；规则升级只能生成新的派生快照，不能覆盖原始快照。

## 10. MigrationRecord

| 字段         | 类型     | 可空 | 说明                 |
| ------------ | -------- | ---- | -------------------- |
| `version`    | integer  | 否   | 单调递增主键         |
| `name`       | string   | 否   | migration 名称       |
| `checksum`   | string   | 否   | 已发布脚本内容校验值 |
| `appliedAt`  | datetime | 否   | UTC 应用时间         |
| `appVersion` | string   | 否   | 执行迁移的应用版本   |

## 11. ContentDataset（模块四）

`data/source/content-dataset.json` 每个文件对应一个不可变 `contentVersion`，包含 `schemaVersion`、`status`、`completenessMode`、创建时间和说明。所有内容记录显式携带 `id`、`sourceId`、`sourceVersion`、`contentVersion` 和状态；所有规则数据额外携带 `rulesetId + rulesetVersion`。

普通爻使用 `linePosition: 1..6`，乾用九/坤用六使用 `specialLineTexts.kind`，不得伪装成第七爻。模板变量由 `variables[]` 定义并导入 `template_variables`，所有 `{{variable}}` 必须有定义。

## 12. SQLite 历史事实

`divination_sessions` 保存问题、分类、起卦时刻、时区、本/变卦和五类不可变版本；`cast_lines` 保存六组三枚铜钱、合计、本/变位和动静；`analysis_snapshots` 保存可追加的结构化分析与 hash。Repository 写入前再次验证铜钱合计、6/7/8/9 映射及本/变卦 code 一致性。

## 13. ContentDataset v2 细化

- 顶层显式声明 JSON Schema Draft 2020-12 和稳定 `schemaId`；生成文件位于 `schemas/`，跨记录规则仍由 `validateContentDataset` 执行；
- 每条内容都有 `contentLayer`、来源版本、精确 `sourceLocator`、原字形、规范化说明、编辑变更、审核人/时间和 SHA-256 checksum；
- 经文、彖、象、文言、爻辞、注解和白话进入 `contentTexts`，以 `ownerType + ownerId + textType + locale` 唯一，不共享含糊的整文件来源；
- 八宫显式保存阶段、0..7 宫序、宫五行、变换 mask、世应；纳甲显式保存 `inner/outer + localLine + absoluteLineHint`；
- 地支和六神有独立目录，多支关系使用 `branchIds` 并在 SQLite 规范化为 `branch_relation_members`；
- complete 模式还要求八宫 64 条、纳甲 48 条、六亲 5×5、六神 6 条及十日干起例、地支 12 条；这只是数据门禁，不代表当前存在已核验生产数据。

历史 DTO 额外保存 `appVersion`、`databaseSchemaVersion`、`castAlgorithmVersion`、历法/模板/AI prompt 版本及历法快照。重新分析必须引用旧快照 ID 并追加新记录。

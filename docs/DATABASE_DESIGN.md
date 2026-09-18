# SQLite 数据库设计

- 状态：模块四已实现基线
- 当前 Schema 版本：migration 007
- 真机状态：Node SQLite 集成通过；Android/iOS 尚待设备升级验证

## 1. 目标

SQLite 用于本地离线历史、版本化内容与规则元数据。数据库不是 domain 模型；所有读写经 Repository 映射。设计优先保证原始起卦事实不可变、规则/内容可追溯、迁移可验证和隐私数据最小化。

## 2. 数据库文件边界

长期建议分为两个逻辑库或至少两组表：

- `content.db`：随应用发布的只读/版本化文化内容与规则元数据；
- `user.db`：用户问题、起卦原值、结果快照和设置。

模块四使用单一 `liuyao.db`，以内容表、历史表和独立 Repository 隔离；稳定 ID + `contentVersion` 保留未来拆分路径。Web 端 SQLite 支持为 alpha，不作为 V1 Web 生产存储承诺。

## 3. 连接与事务约定

- 打开后启用 `PRAGMA foreign_keys = ON`；
- 用户库采用 WAL 模式，并在目标设备验证；
- 所有写入使用参数绑定/预编译语句，不拼接用户输入；
- 会话锁定、六爻原值和结果快照在单一事务写入；
- Repository 不返回 SQLite 行对象到 application/domain；
- 用户问题原文不得进入日志、崩溃属性或分析事件。

## 4. 迁移机制

表 `schema_migrations`：

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  app_version TEXT NOT NULL
);
```

每个 migration 是编号、单向、事务化文件。启动时按版本升序执行，并在执行前核对已应用脚本 checksum。已发布 migration 不可修改；失败回滚并阻止对不兼容 Schema 继续写入。破坏性迁移需复制转换、计数对账和升级固定测试。

## 5. 已实现表

### 5.1 来源与版本

- `data_sources`：复合主键 `source_id + source_version`，记录作者/编者、年代、底本、平台、URL、公版/授权、转录校对、可靠性等级、审核和 metadata hash；
- `content_versions`：不可变内容版本、Schema、完整模式、源文件、payload SHA-256、记录数与导入时间；
- `rule_versions` / `rule_version_sources`：规则体系、父版本、发布状态、变更记录、breaking changes、source/rules hash、复核发布信息和多来源关系。

### 5.2 可查询内容

- `trigrams`、`hexagrams`、`hexagram_lines`、`special_line_texts` 保存稳定结构；
- `content_texts` 按 owner、文本类型、语言和文本层分别保存卦辞、彖、象、文言、爻辞、注解和原创白话；`content_record_audit` 保存每条记录的定位、规范化、编辑变更、审核和 checksum；
- `content_terms` 保存别名、类象、德性、语义标签和小型列表，不把它们塞入不可查询的大 JSON；
- `palace_hexagrams`、`earthly_branches`、`najia_assignments`、`six_relative_rules`、`six_spirits`、`six_spirit_rules`、`branch_relations`、`branch_relation_members`；
- `question_categories`、`interpretation_templates`、`template_variables`、`rule_definitions`。

古籍原文、传文、现代白话使用独立 `content_texts` 行并各自溯源；模板变量和多地支关系使用关联表；八宫、纳甲和规则均有独立可查询键。只在验证报告、规则输入/输出字段列表、日历快照和分析快照中使用受控 JSON，不把整套规则塞进单一 payload。

### 5.3 历史与设置

- `divination_sessions`：问题、分类、起卦时间、时区、本/变卦及 app、数据库、输入、起卦、历法、规则、内容、模板、AI prompt、随机版本与当时历法快照；
- `cast_lines`：固定 1..6 爻位、三枚原始铜钱、合计、本爻/变爻位和动静；
- `analysis_snapshots`：可追加的结构化重新分析结果、版本、hash 和 `reanalysis_of_snapshot_id` 比较链；
- `content_import_reports`：成功导入时固化 Schema/业务校验报告、源文件和 payload hash；
- `legacy_professional_rule_quarantine` / `legacy_migration_reviews`：保留旧 `najia_assignments.polarity` 无法证明 `inner/outer` 的原始行。迁移不会猜测 scope；运行时补记 raw JSON 的 SHA-256，必须两位审核人处理后才能形成新的生产规则记录。
- `settings`：非敏感键值设置；密钥仍禁止进入 SQLite。

## 6. 关系

- 一个 source 可支持多个 content record；
- 一个 ruleset 引用一个或多个 source（使用关联表 `ruleset_sources`）；
- 一个锁定 session 必须由 Repository 在同一事务追加 6 条 line 和至少一个 snapshot；
- 一个 session 可追加多个版本化 analysis snapshot；
- 内容记录与历史通过稳定 ID + contentVersion 关联，避免内容升级改变回看结果。

## 7. 完整性约束

- 爻位唯一且连续；
- 锁定会话恰六爻；
- 三枚铜钱各为 2/3，合计匹配 value；
- 所有版本字段非空且不为 `latest`；
- verified 内容有完整来源与授权；
- 解释证据引用无悬空；
- 删除历史使用事务级联删除用户派生数据，但不删除共享内容；
- 导出/导入验证 Schema 版本和哈希，不接受未知更高版本静默降级。

## 8. 隐私与保留

- 问题文本可为空，默认仅本机；
- 应提供单条删除和清空历史；
- 删除操作必须明确结果，失败不谎报成功；
- 备份/云同步在 V1 范围外，未来启用必须单独获得用户同意并设计加密；
- 调试数据库、导出文件和测试 fixture 禁止包含真实用户内容。

## 9. 已实现 Migration

- `001_create_schema_migrations`：migration 账本；
- `002_create_content_schema`：来源、内容版本、规则版本及全部可查询内容表；
- `003_create_history_schema`：锁定会话、原始铜钱、分析快照与设置；
- `004_create_indexes_and_immutability_guards`：查询索引与事实/内容 UPDATE 防护触发器。
- `005_expand_auditable_content_model`：逐条审计、分层文本、地支/六神目录、多成员关系、完整规则字段、导入报告和历史版本维度；全部为事务化向前扩展，不删除旧列或旧记录。
- `006_quarantine_legacy_professional_rules`：将无法证明内外卦 scope 的旧专业候选记录隔离，禁止运行时猜测或提升为生产规则。
- `007_create_professional_candidate_staging`：增加候选专业规则、历法、来源、人工签署、差异和候选快照的独立暂存表；候选数据不会进入 production 查询。

runner 在执行前计算 migration 源的 SHA-256；已应用版本名称、种类或 checksum 不一致即停止。每个 migration 独立事务回滚，内容导入不混入结构 migration。

开发环境可显式调用 `rebuildDevelopmentDatabase`，但必须同时传入 `environment: development` 和固定确认令牌；生产打开路径从不调用该函数。正常用户升级只执行增量 migration，不删除历史。

## 10. 测试状态

- 已自动化：空库、上一结构版本、重复启动、失败回滚、checksum 不一致、数据保留；
- 已自动化：Zod/JSON Schema → 业务校验 → SQLite 数量/hash 对账、导入报告和同版本幂等；
- 已自动化：Repository 查询、原始铜钱约束、内容/事实 UPDATE 防护、追加式重新分析、文件重开持久化；
- 尚未执行：Android/iOS 真机 WAL、应用升级包、并发压力与显式历史删除流程。

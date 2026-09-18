# 六爻起卦与解卦 App

一个离线优先、规则可追溯的跨平台移动应用。当前仓库已完成“模块一：项目准备”“模块二：起卦核心”“模块三：卦象核心”和“模块四：内容数据库”的结构、迁移、导入与 Repository 基础，建立“模块五：专业六爻排盘”的安全计算骨架，并接入“模块七：App 页面”的离线基础闭环。模块五的生产规则表、历法实现和人工金标准仍待来源与双人审核，因此专业排盘页使用明确的不可用 adapter，不发布或伪造专业字段；解释规则为空时只展示可复核的卦象结构。

## 技术基线

- Expo SDK 57 / React Native 0.86 / React 19.2；
- TypeScript 严格模式与 Expo Router；
- SQLite（`expo-sqlite`）、安全随机（`expo-crypto`）、Zustand、Zod；
- Vitest、ESLint、Prettier、GitHub Actions；
- pnpm 锁文件与 Development Build 配置。

Expo SDK 57 最低要求 Node 22.13。本项目推荐 Node 24 与 pnpm 11.9。执行任何 `pnpm` 脚本前，必须确认 `node --version` 可在当前终端运行；仅有 pnpm 而 Node 未加入 `PATH` 时，TypeScript、Expo 和生成脚本都会失败。

## 本地开发

```bash
pnpm install --frozen-lockfile
pnpm start
```

`pnpm start` 面向 Development Build。尚未安装开发客户端时，可用 `pnpm start:go` 对基础页面做 Expo Go 验证；后续加入仅开发构建支持的原生能力后，应以 Development Build 为准。

```bash
# 需要 Expo 账号与相应平台签名配置；此命令会触发远程构建
pnpm dlx eas-cli@latest build --platform android --profile development

# iOS 设备开发构建需 Apple 开发者相关配置；Windows 不能本地编译 iOS
pnpm dlx eas-cli@latest build --platform ios --profile development
```

本仓库只提交 `eas.json` 基础方案，不自动登录 Expo、创建远程项目或触发构建。

## 质量命令

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm run test
pnpm run test:coverage
pnpm run build:content-seed
pnpm run build:content-source
pnpm run check:content-source
pnpm run build:content-schemas
pnpm run check:content-schemas
pnpm run validate:data
pnpm run check
```

`pnpm run check` 依次执行类型、Lint、格式、单元测试和数据校验。真机传感器、触觉反馈及原生配置由后续设备测试计划覆盖，不由 CI 假装完成。

## 目录

- `app/`：Expo Router 路由入口；
- `src/domain/`：纯 TypeScript 领域模型与确定性算法；
- `src/application/`：用例与编排；
- `src/infrastructure/`：SQLite、随机源、传感器与 AI 适配器；
- `src/features/`：页面功能模块；
- `src/shared/`：共享主题、错误边界、日志与通用组件；
- `data/`：经核验的生产源数据及隔离的结构示例；
- `scripts/`：数据 Schema 与校验工具；
- `tests/`：单元、集成、固定案例与属性/穷举测试；
- `docs/`：产品、规则、架构、测试与发布规范。

## 数据与规则边界

生产内容目前包含 8 个已核验八卦和 64 个已核验卦象结构（共 72 条），由 `data/catalog/index.json` 可重复构建到 `data/source/content-dataset.json` 并导入 SQLite；卦辞、384 爻辞、用九/用六正文、专业六爻规则和现代解释仍为 0。`data/draft/` 与 `data/fixtures/` 不参与生产导入；来源、版本或授权未确认时禁止补写真实内容。详细约束见 `AGENTS.md`、`docs/DATA_SOURCES.md`、`docs/HEXAGRAM_SPEC.md` 与 `data/MISSING_DATA.md`。

## 起卦核心边界

- `src/domain/casting` 提供不可变类型、铜钱到爻的纯函数和 `draft → collecting → complete → locked` 状态机；
- `src/application/casting` 通过 `expectedLineCount` 和会话内互斥拒绝陈旧/并发重复触发，并编排 Repository；
- `src/infrastructure/random` 的正式实现只调用 `expo-crypto` 异步安全随机；固定/序列源用于确定性测试；
- `src/infrastructure/repositories` 的内存适配器继续服务起卦用例测试；内容、规则、设置和锁定历史使用 `src/infrastructure/database/repositories` 的 SQLite 实现。页面已通过 Application Service 接线，但仍未完成真机数据库验证。
- 页面通过 `src/application/page` 编排既有 `CastingService`、卦象计算和 Repository；`src/infrastructure/repositories/SQLiteCastingSessionRepository.ts` 复用 `settings` 表持久化草稿与待落库锁定会话，应用关闭后恢复不重新随机。

## 页面模块边界

- Expo Router 提供首页、问题输入、起卦/恢复、结果概要、详细解卦、专业能力状态、历史/详情、知识/详情、设置及关于与风险声明；页面只传稳定 `sessionId` 或知识 `slug`；
- 明暗主题、中式高对比度视觉、太极装饰、阴阳爻/动爻、卦象卡片、依据折叠卡、加载/空/错误/离线状态和确认对话框均为共享组件；
- `draft → collecting → complete → locked` 完全由既有应用用例和领域状态机驱动，UI 双击锁只改善交互，不能决定铜钱结果；
- 历史保存六组三枚原值与结构快照；解释新规则未发布时重新分析入口明确不可用，不覆盖旧快照；
- 专业页由 `UnavailableProfessionalChartAdapter` 返回可审计的缺口，不在组件中填充八宫、纳甲、世应、历法或旺衰数据。

## 卦象核心边界

- `src/domain/hexagram` 采用阴 `0`、阳 `1`，所有位序固定从初爻到上爻；
- 下卦取位置 1..3，上卦取位置 4..6，编解码和 UI 倒序辅助集中封装；
- 本卦、动爻和变卦由 6/7/8/9 确定性计算，穷举 4096 种输入；
- 64 卦只能由显式 `upperTrigramId + lowerTrigramId` catalog 解析，完整性校验要求 8×8 唯一组合和文王序 1..64；
- 当前没有通过人工审核的完整 catalog，缺失映射会明确失败，不把二进制序或测试数据当生产结果。

## 内容数据库边界

- `scripts/content-data-schema.ts` 先执行 Zod Schema，再执行逐条来源、引用、唯一性及核心/专业完整性校验；`schemas/` 提供带稳定 `$id` 的 Draft 2020-12 JSON Schema；
- `src/infrastructure/database/migrations` 提供稳定编号、checksum、事务和失败回滚，已应用 migration 不重复执行；
- 内容导入按不可变 `contentVersion + SHA-256` 幂等写入，draft 永不进入 production；
- SQLite 以 `content_texts` 和逐条 audit 分开保存经文、传文、现代白话及其来源，并规范化保存八宫、内外卦纳甲、地支多成员关系、六亲和六神，不用单一巨大 JSON 承载可查询规则；
- 历史保存六组三枚铜钱、爻值、本卦/变卦、全部版本与分析快照；重新分析只追加快照，不覆盖原始事实；
- Node SQLite 集成测试证明空库升级、旧版升级、重复启动、中途失败回滚、数据保留和数据库重开；Expo 真机仍需后续验证。

## 专业六爻边界

- `src/domain/professional` 将八宫、世应、纳甲、地支五行、六亲、六神、历法、旬空、关系事实、用神候选、动变、飞伏和排盘聚合拆成独立纯函数；
- 独立 Zod/JSON Schema 校验规则包外形，应用端口只按精确规则/内容版本加载，不提供隐式最新版或跨流派回退；
- 所有规则记录必须属于同一 `rulesetId + rulesetVersion + contentVersion`，生产规则包还必须有固定哈希、已核验来源、完整数量和至少两名复核者；
- `CalendarProvider` 显式接收 UTC 瞬间、IANA 时区、换日/真太阳时政策、算法与 tzdb 版本；仓库当前不包含未经确认的生产历法算法；
- 旺衰只输出带规则/来源/版本的结构化事实，用神允许多候选、歧义和上下文不足，不生成最终吉凶文章；
- 自动化使用 synthetic/test-only fixture 验证工程契约，不冒充人工金标准或生产传统数据。完整状态见 `docs/PROFESSIONAL_RULES_SPEC.md`。

## 官方工程依据

- Expo SDK 57 参考：https://docs.expo.dev/versions/v57.0.0/
- Expo Router：https://docs.expo.dev/router/introduction/
- Development Build：https://docs.expo.dev/develop/development-builds/introduction/
- ESLint 与 Prettier：https://docs.expo.dev/guides/using-eslint/

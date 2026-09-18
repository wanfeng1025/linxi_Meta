# 系统架构

- 状态：模块三卦象核心基线
- 技术基线：Expo SDK 57 / React Native 0.86 / React 19.2 / TypeScript 6
- 架构目标：离线优先、确定性核心、可替换基础设施、规则与内容可追溯

## 1. 设计原则

1. 领域计算不依赖 UI、路由、数据库或设备 API；
2. 依赖只从外向内，基础设施实现内层端口；
3. 原始起卦事实与派生解释分开持久化；
4. 文化内容、规则和结果全部版本化；
5. 相同输入 + 相同规则版本得到相同核心结果；
6. AI 是可移除的表现适配器，不是计算依赖；
7. 未核实的传统数据不能进入生产路径。

## 2. 技术选型

- **React Native + Expo SDK 57**：跨平台运行和原生模块管理；SDK 57 对应 RN 0.86，最低 Node 22.13；
- **Expo Router**：文件路由，路由入口固定在根 `app/`；
- **Development Build**：`expo-dev-client` + EAS development profile，为后续传感器和原生配置预留；
- **TypeScript strict**：另启用 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等；
- **expo-sqlite**：本地离线数据，通过 Repository 隔离；
- **Zustand**：只管理轻量、短生命周期的 UI/会话投影，不充当数据库；
- **Zod**：外部 JSON、持久化 payload、AI 输出和边界输入校验；
- **Vitest**：纯 TypeScript 单元、属性/穷举及 Node 数据测试；
- **ESLint + Prettier**：静态质量与确定格式；
- **GitHub Actions**：锁文件安装、类型、Lint、格式、测试和数据校验。

Expo 兼容包使用 `expo install` 解析，不手动混配 RN 版本。锁文件是 CI 安装依据。

## 3. 分层与依赖方向

```text
app / features  ──────> application ──────> domain
      │                       │                 ▲
      └──────── shared        └── ports ───────┤

infrastructure ───────────── implements ports ─────┘
```

- `app/`：路由、顶层 Provider、错误边界，不含业务算法；
- `src/features/`：屏幕、交互、ViewModel/Store，调用 application 用例；
- `src/application/`：开始会话、追加爻、锁定、生成结果、保存/查询历史等用例；
- `src/domain/`：值对象、状态机、随机端口、卦象与规则引擎纯函数；
- `src/infrastructure/`：SQLite Repository、安全随机、传感器、时钟、AI 客户端；
- `src/shared/`：不含六爻规则的跨层通用主题、日志、错误和组件。

禁止 feature 直接查询 SQLite；禁止 infrastructure 被 domain 导入；禁止把 domain 类型设计成 React state。

## 4. 领域边界

建议后续拆为：

- `divination`：铜钱、爻、会话状态、随机源端口；
- `hexagram`：阴阳位型、上下卦、本卦/变卦；
- `content`：稳定内容引用和版本；
- `professional`：来源确认后的六爻纳甲规则；
- `interpretation`：结构化规则结果、证据和分类；
- `history`：不可变记录与版本快照。

模块间使用稳定 ID/值对象，避免共享可变对象。每个算法接受明确规则版本，不读取“当前最新版”全局变量。

## 5. 端口设计

后续 application/domain 声明接口，infrastructure 实现：

- `RandomSource`：返回无偏、安全随机字节/范围值；
- `Clock`：显式时间与时区，测试可固定；
- `DivinationRepository`：草稿恢复、锁定记录；
- `ContentRepository`：按稳定 ID + contentVersion 读取；
- `RulesetRepository`：按明确版本读取；
- `SensorTrigger`：只发出摇动触发事件；
- `InterpretationPresenter`：本地模板或 AI 表达；
- `Logger`：结构化日志，禁止敏感数据。

Repository 接口不暴露 SQL、SQLiteDatabase 或行结构。

## 6. 状态管理

- 服务器/持久状态的事实来源是 Repository；
- Zustand Store 只持有当前路由需要的会话投影、加载/错误状态和用户界面偏好；
- 领域状态转换由纯函数/用例完成，Store 不直接修改爻数组；
- 恢复流程从 Repository 解析并校验快照，再构造 Store；
- 组件卸载不应丢失已持久化的铜钱结果。

## 7. 数据流

```text
用户点击/摇动
  → Feature 去抖与调用用例
  → Application 请求 RandomSource 三次
  → Domain 校验三枚值并产生 CoinLine
  → Repository 原子保存会话
  → Store 接收不可变投影
  → 六爻完成并锁定
  → Domain 计算本卦/变卦
  → 版本化内容/规则生成结构化结果
  → Repository 保存事实与结果快照
  → Feature 展示结果和依据
```

异常不会自动重抽铜钱。保存失败时保留清晰状态，让用户重试保存同一结果。

## 8. SQLite 架构

`expo-sqlite` 仅存在于 infrastructure。首次打开执行编号 migration，启用外键，目标设备验证 WAL。内容和用户数据逻辑隔离。详细表、迁移和隐私约束见 `DATABASE_DESIGN.md`。

模块二仍不创建数据库文件或 migration。起卦核心通过 Repository 端口和内存适配器验证保存/恢复契约；可跨进程恢复的 SQLite 适配器必须与后续编号 migration 一起实现和升级测试。

## 9. 文化数据管线

```text
候选来源 → 授权/版本核验 → 结构化录入 → Zod 校验
→ 引用/领域完整性测试 → 审核签名 → 版本化 catalog → SQLite 导入
```

pending 示例与 verified catalog 物理隔离。导入工具输出缺失/冲突报告，不猜测补全。应用只查询发布 catalog。

## 10. AI 架构

AI 适配器属于 infrastructure。Application 先得到完整、不可变的结构化解释，再只投影允许改写的表现字段给 AI。返回值严格解析，检测越权/虚假字段，失败回退本地模板。V1 不调用 AI，也不要求 API 密钥。

## 11. 错误、日志与隐私

- 顶层 `AppErrorBoundary` 捕获 React 渲染错误并给出可恢复界面；
- application 使用可枚举应用错误，feature 映射为用户信息；
- infrastructure 将平台/网络/SQLite 错误映射，不向 domain 泄漏；
- 日志接口支持上下文，但禁止问题原文、原始历史、密钥和设备标识；
- 未处理错误不触发新的随机结果。

模块一的 console logger 是可替换基础接口，不等同生产监控方案。

## 12. Development Build

- 项目安装 `expo-dev-client`；
- `eas.json` 提供 development、iOS simulator、preview、production profile；
- `pnpm start` 默认连接开发客户端；
- EAS 登录、项目绑定、bundle/package identifier、签名和远程构建需项目所有者明确操作；
- Windows 可运行 Android 本地环境或 EAS 构建，iOS 本地编译需 macOS；
- 后续增加原生模块/配置插件后必须重建 Development Build。

## 13. 路径别名

`@/*` 映射 `src/*`，`@/assets/*` 映射 `assets/*`。路由文件保持在根 `app/`，避免 `@/app` 与 Router 目录语义混淆。测试脚本对跨目录基础工具可使用相对路径，减少 bundler 假设。

## 14. CI 与质量门禁

GitHub Actions 使用 Node 24、pnpm 11.9 和 `--frozen-lockfile`。依次执行类型、Lint、格式、测试、数据校验。CI 不触发 EAS 构建，不伪造传感器/触觉真机结果，不写密钥。

## 15. 当前实现边界

已实现：最小路由页、基础主题、错误边界、日志接口、目录骨架、数据 Schema/空 production catalog、三枚铜钱与六次起卦领域状态机、起卦 Application Service、Repository 端口、`expo-crypto` 安全随机适配器、固定/序列测试随机源、内存 Repository、卦象位型/显式映射解析/本卦变卦算法、4096 状态穷举、单元测试和 CI。

未实现：经来源与人工审核的完整 64 卦生产映射、SQLite Repository/migration、专业规则、完整页面、传感器和 AI。它们按发布计划逐模块进入，不得从文档描述推断为已完成；映射 Schema/解析器不等于生产数据完成，内存 Repository 不等于跨进程持久化。

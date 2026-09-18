# 网站重构基线审计

- 记录时间：2026-07-25
- 工作分支：`agent/hexagram-core`
- 工作区状态：开始重构前存在已修改及未跟踪的移动端、数据、迁移、页面和测试文件；本次重构保留这些改动，不执行 reset、clean、restore、提交或推送。
- 运行时：捆绑 Node 24.14.0 可用，但系统 `PATH` 初始未包含 `node`；pnpm 为 11.9.0。

## 初始门禁结果

- TypeScript：通过。
- ESLint：通过。
- Vitest：33 个文件、159 项测试通过，其中包含数据库 migration 集成测试。
- 格式检查：11 个文件未格式化。
- 生成 Schema：`professional-calendar-candidate-document.schema.json` 缺失或漂移。
- 数据校验：候选日历生成物缺少 `coverageEndInclusiveInstant`；规范生成源已包含该字段，需重新生成候选文件。
- 生产内容来源检查与 M4 候选检查：通过。

本审计只记录可复现事实；不会将候选内容、测试夹具或未核验专业规则提升为 production 数据。

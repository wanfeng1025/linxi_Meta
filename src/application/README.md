# Application 层

放置用例、事务边界和跨端口编排。该层只依赖 `src/domain` 和抽象端口，不直接访问页面、SQLite、传感器或 AI SDK。`casting/` 已提供起卦会话服务与 Repository 端口；调用方必须提交预期爻数，陈旧或并发重复命令会被拒绝。

`repositories/` 定义内容版本/导入报告、分层卦文、八宫/纳甲/地支关系、设置和锁定历史 DTO 端口。页面不得导入 infrastructure SQLite 类；后续页面用例应由 Application Service 组合这些端口，并在一次事务边界内完成锁定事实与首个分析快照。重新分析 DTO 显式引用旧快照，并携带规则、内容、模板、历法和 AI prompt 版本。

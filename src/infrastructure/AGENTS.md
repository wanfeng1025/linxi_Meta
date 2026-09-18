# src/infrastructure/AGENTS.md

- 本目录实现 application/domain 声明的端口，不得让 Expo、SQLite、传感器或 AI SDK 类型泄漏到 domain；
- 页面不得直接调用此目录的 SQLite 实现，必须由 Application Service 编排；
- 数据库变更使用编号 migration，事务执行，已发布 migration 不可改写；
- 生产随机源使用系统安全随机能力，不得使用 `Math.random()`；摇动力度只触发，不参与结果；
- 传感器实现必须管理订阅、前后台、节流/冷却与清理，并记录真机测试缺口；
- AI 适配器只接收允许改写的表现层字段，输出必须通过 Schema 校验并提供本地回退；
- 任何外部错误先映射为稳定的应用错误，日志不得包含密钥、问题原文或用户隐私。

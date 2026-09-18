# Infrastructure 层

放置 SQLite Repository、系统随机源、传感器、网络与 AI 等适配器。实现必须满足 application/domain 层声明的端口，不得反向泄漏平台类型。

当前已有：

- `random/`：`expo-crypto` 安全随机源与固定/序列测试源；
- `repositories/`：模块二使用的内存起卦 Repository；
- `database/`：Expo SQLite 连接、SHA-256、编号 migration、事务内容导入/校验报告，以及内容、分层文本、卦象、专业规则、设置和锁定历史 Repository。

`openApplicationDatabase` 会先启用外键/WAL、校验并执行 migration，再从 `data/source/content-dataset.json` 幂等导入 production 内容版本。migration 005 只增量增加逐条审计、分层文本、专业目录/关系与历史版本字段，不删除旧数据。当前 production seed 含 8 个八卦和 64 个卦象结构；经文、爻辞、专业规则和现代解释仍未完成。SQLite 的 Node 集成测试已完成，Android/iOS 真机仍需验证。

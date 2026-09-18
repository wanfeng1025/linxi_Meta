# data/AGENTS.md

本目录只承载文化源数据及其明确隔离的结构示例。

- `catalog/` 是生产目录，只允许 `status: verified` 且来源、版本、授权、审核信息完整的记录；
- `examples/` 只验证 Schema，必须使用 `recordType: example`、`status: pending`，内容必须明确声明不可展示；
- 来源不明或授权不明时更新 `MISSING_DATA.md`，不得补写看似真实的数据；
- 导入或修改任何 JSON 后运行 `pnpm run validate:data` 和相关完整性测试；
- 不得用数组下标隐式表达卦序、爻位或传统规则关系；
- 禁止在此存放用户起卦历史、设备数据、API 密钥或数据库文件。

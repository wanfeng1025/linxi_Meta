# Domain 层

放置可测试、确定性的纯 TypeScript 领域模型与算法。`casting/` 实现三枚铜钱、爻事实和六次起卦状态机；`hexagram/` 实现初爻到上爻编码、八卦位型、显式映射解析、本卦/动爻/变卦和 catalog 完整性门禁；`professional/` 提供版本化、表驱动的专业排盘纯函数、生产规则包核验门禁和显式历法 Provider 边界。专业生产规则与人工金标准仍缺失，因此当前只能使用明确的 test-only fixture 验证工程契约，不能生成可发布的专业排盘。

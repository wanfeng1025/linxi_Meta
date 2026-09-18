# src/domain/AGENTS.md

- 仅允许纯 TypeScript 领域模型、值对象、端口和确定性算法；
- 禁止依赖 React、React Native、Expo Router、Expo SDK、SQLite、Zustand、页面组件或设备 API；
- 所有计算显式接收原始输入与 `rulesetVersion`，禁止读取系统时间、全局随机数或隐式环境状态；
- 随机行为通过 `RandomSource` 端口注入，核心函数不得直接调用 `Math.random()`；
- 内部六爻数组固定按初爻到上爻排列；
- 新传统规则必须先在文档记录体系、来源、版本和验证案例；缺少可靠来源时只定义端口/Schema 和缺失报告；
- 新算法必须同步增加边界、错误输入、固定案例及属性或穷举测试。

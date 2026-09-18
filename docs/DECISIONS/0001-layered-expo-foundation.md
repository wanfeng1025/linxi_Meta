# ADR-0001：采用 Expo SDK 57 与确定性分层架构

- 状态：accepted
- 日期：2026-07-19

## 背景

项目需要 Android/iOS 跨平台、离线 SQLite、后续传感器与真机原生配置，同时要求核心六爻算法可单测、与页面和平台解耦。当前目录为空，可建立一致基线。

## 决策

采用官方 `default@sdk-57` 兼容基线：Expo SDK 57、React Native 0.86、React 19.2、Expo Router 和 TypeScript strict。使用 Development Build；路由、feature、application、domain、infrastructure、shared 分层。domain 是纯 TypeScript，不依赖 React/Expo/SQLite。状态用 Zustand 作为 UI 投影，边界数据用 Zod，持久化用 expo-sqlite Repository。

## 依据

2026-07-19 查询的 Expo 官方参考将 SDK 57 列为最新稳定参考，最低 Node 22.13；官方推荐 `create-expo-app --template default@sdk-57`、`expo install` 和 `expo-dev-client`。项目使用 Node 24 与 pnpm 锁文件。

## 后果

优点：兼容版本由 Expo 维护；原生能力可进入开发构建；核心计算可快速、确定地测试；存储和 UI 可替换。

代价：层间需要显式端口和映射；Windows 无法本地编译 iOS；EAS 构建需要账号、标识符和签名；SQLite Web 支持不作为 V1 承诺。

## 防护

CI 运行 frozen lockfile、类型、Lint、格式、测试和数据校验；领域边界测试禁止平台依赖；升级 Expo SDK 必须新增 ADR/升级说明并运行官方诊断与真机回归。

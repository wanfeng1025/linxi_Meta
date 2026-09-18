# 灵犀 Meta 页面级重构方案

本方案建立在 `UI_AUDIT.md`、`DESIGN_SYSTEM.md` 与 `MOTION_SPEC.md` 之后，实施顺序严格为先全局 token/外壳，再核心起卦，最后目录与信息页。领域算法、会话 schema、内容数据和未来模块接口不变。

## `/` 首页

- **Current / Problem**：单一 Hero 卡片承载所有信息，品牌和证据入口不够分层。
- **New IA / Visual**：编辑式 Hero（品牌副标题、卦爻 signature、主 CTA）+ 三项可信度摘要 + 方法入口；墨绿主底、朱砂 CTA、玄黑背景层。
- **Components / Motion**：`PageShell`、`Divider`、`BrandMark`、`AmbientScene`；太极慢旋、云气漂移、入场淡入。
- **Responsive / A11y**：390px 单列、CTA 满宽、装饰隐藏但主信息保留；h1→h2 层级和 skip link 不变。
- **Acceptance**：首屏能看到产品身份、开始起卦、六十四卦入口和匿名保存说明，无横向滚动。

## `/casting` 起卦

- **Current / Problem**：已有 GSAP 但状态视觉粗略，progress 不是完整六爻结构。
- **New IA / Visual**：问题/隐私说明 → 状态标题 → 铜钱舞台 → 自下而上的六爻构建 → 锁定操作；侧栏只放范围和方法链接。
- **Components / Motion**：`Coin`、`CastProgress`、`HexagramGlyph`、`Notice`；严格按 Motion Spec 状态机，先算后动。
- **Responsive / A11y**：单列、44px CTA、动态状态 `role=status`；按钮禁用时给出“起爻中”文本，不依赖动画。
- **Acceptance**：六次点击只生成六条，顺序初爻到上爻，快速点击不重复，reduced motion 仍可完成。

## `/result/[sessionId]` 结果

- **Current / Problem**：结果、原始记录和授权内容连续堆叠。
- **New IA / Visual**：首屏结果摘要（本卦/变卦/动爻）→ 原始记录/导出 → 原文/白话引用 → 功能状态；结构和隐私 notice 上移。
- **Components / Motion**：共享 `HexagramGlyph`、`Notice`、`StatusBadge`、`ResultActions`；只做一次摘要入场。
- **Acceptance**：所有原有记录与导出仍在；问题默认不导出；找不到 session 时可回到起卦。

## `/hexagrams` 与 `/hexagrams/[id]`

- **Current / Problem**：目录为 64 个顺序链接，缺少搜索/筛选/8×8 语义。
- **New IA / Visual**：搜索 + 上卦/下卦筛选 + 8×8 matrix；每格显示符号、卦名、文王序，详情页显示上下卦关系和授权来源。
- **Components / Motion**：`SearchInput`、`FilterSelect`、`HexagramCard`、`HexagramGlyph`；筛选结果短淡入，键盘焦点不丢失。
- **Acceptance**：64 条仍全部可访问，搜索和筛选能组合使用，详情可返回目录；无内部 slug 展示。

## `/methodology` 与 `/knowledge`

- **Current / Problem**：timeline 和长文本可读但像文档页。
- **New IA / Visual**：以爻线节点表现三币→爻值→六次→本卦→动爻→变卦；知识页用“经典文本→结构映射→解释→专业六爻→AI”边界阶梯，未发布明确标记。
- **Acceptance**：不新增未经核验内容；所有未来模块不进入主导航，不伪装可用。

## `/privacy`、`/terms`、`/disclaimer`、状态页

- **New IA / Visual**：统一标题/导语/section divider，风险与隐私用 `Notice` 和可扫描列表。
- **Acceptance**：移动端正文可读，重点内容不依赖颜色，loading/error/not-found 保留回退入口。

## 实施与门禁

1. 只修改 `apps/web` 与本设计文档，保持 `src/domain`、`data`、`apps/mobile` 不变。
2. 先 token/外壳/组件，再页面；没有新增大型 UI framework。
3. 运行格式、lint、typecheck、Vitest、数据校验、Next build 和 Playwright；视觉验收生成 `artifacts/ui-audit/` 截图并检查控制台。
4. 任何环境网络或 Windows SWC 问题单独报告，不以跳过门禁换取绿色结果。

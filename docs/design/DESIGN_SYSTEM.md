# 灵犀 Meta Design System

## 设计命题

**Modern Eastern Editorial**：现代东方审美、编辑出版感、传统结构和数字秩序并置。灵犀 Meta 不是古装主题、AI SaaS、博客或 dashboard；它应像一张可复核的数字纸面，安静、可信、留白充分。

## 色彩 Token

墨绿是主色，朱砂红只承担行动/风险，玄黑承担底层墨色；暖纸和青铜用于阅读与结构提示。业务组件不得直接散落 hex，统一使用语义变量。

```css
:root {
  --background: #071612; /* 玄黑偏墨绿的页面底 */
  --background-deep: #04100c;
  --foreground: #f4eddd; /* 暖纸主文字 */
  --surface: #10261e; /* 墨绿表面 */
  --surface-muted: #0b1c16;
  --surface-elevated: #17372b;
  --border: #345749;
  --border-strong: #6c927f;
  --text-primary: #f4eddd;
  --text-secondary: #d5e1d9;
  --text-muted: #a9beb2;
  --accent: #c8a45d; /* 青铜/纸金：结构提示 */
  --accent-hover: #e8c978;
  --accent-ink: #20170a;
  --cinnabar: #bd584b; /* 朱砂红：主要行动 */
  --cinnabar-hover: #d36a5b;
  --danger: #e17b6b;
  --success: #7fb394;
  --warning: #e0bb69;
  --focus-ring: #f3d47e;
  --shadow-ink: rgb(0 0 0 / 32%);
}
```

状态语义：`--cinnabar` 只用于主要行动、动爻和风险提示；`--accent` 用于卦象/证据强调；未发布使用 `--warning` 但必须同时有文字；成功使用低饱和 `--success`，不使用霓虹绿。

## Typography

- 页面标题/卦名：`Georgia, 'Songti SC', 'STSong', 'SimSun', serif`，保留编辑感但不依赖单一字体。
- 正文/控件：`'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', system-ui, sans-serif`。
- 数值、版本、哈希和原始记录：`ui-monospace, 'SFMono-Regular', Consolas, monospace`。
- 正文最小 16px，行高至少 1.5；小型 meta 文字不低于 13px，且不能承载唯一信息。
- 层级：`display 56/1.05`、`h1 40/1.15`、`h2 28/1.25`、`h3 20/1.35`、正文 `16/1.65`。移动端只缩小 display，不压缩正文可读性。

## Spacing / Layout

基础尺度：`4, 8, 12, 16, 24, 32, 48, 64, 96px`。页面阅读宽度 1120–1240px；文本段落最大宽度约 680px；核心工具允许 2 列但在 800px 以下堆叠。边界优先使用 1px 线和留白，而不是连续卡片。

## 形状与材质

- 容器默认 12px 或 18px 圆角；品牌 Hero 可使用不对称 `32px 8px 32px 8px`，避免所有区域同一圆角。
- 主要按钮触控高度至少 46px；移动端重要 IconButton 至少 44×44px。
- 边框是“纸面分栏”而不是玻璃拟态；透明度和 blur 只用于 AmbientScene 这一层。
- Signature Element 是阴阳爻线：阳爻为完整线，阴爻为两段线；用于 divider、progress、空状态和卦象结构。禁止用 emoji 作为正式 icon。

## 组件契约

| 组件               | 视觉/交互契约                                                 |
| ------------------ | ------------------------------------------------------------- |
| `PageShell`        | 页面标题、导语、正文宽度和 section 间距统一                   |
| `Button`           | primary=朱砂，secondary=透明墨绿/青铜边；禁用仍保留文字对比   |
| `Notice`           | 左侧语义线 + 文字，危险/隐私/未发布同时提供文本说明           |
| `StatusBadge`      | 只展示已发布/未发布/当前状态，不承载关键唯一信息              |
| `Divider`          | 由阴/阳爻线组成，可用于 section 与加载状态                    |
| `HexagramGlyph`    | 展示已计算的六爻，不从视觉动画产生结果                        |
| `Coin`             | 仅呈现已计算的 2/3 数值，动画结束后保持可读                   |
| `CastProgress`     | 6 个可读步骤，从初爻到上爻，支持 `aria-live` 摘要             |
| `MobileNavigation` | `aria-expanded`、`aria-controls`、Escape、焦点回收、44px 目标 |

## Responsive 规则

- 375/390px：单列、单手 CTA、菜单抽屉、目录筛选垂直堆叠、无横向滚动。
- 768px：两列编辑式布局，结果/目录可保留侧栏但内容不挤压。
- 1024/1440px：增加留白和信息分栏，不无限放大字号或装饰。
- `env(safe-area-inset-*)` 用于移动菜单和底部可操作区域。

## 可访问性

语义 HTML 优先；所有表单有 label；所有交互元素有清晰名称；focus-visible 使用 `--focus-ring`；正文与背景达到 WCAG AA；动态内容用 `role=status`/`aria-live`；动画在 `prefers-reduced-motion: reduce` 下缩短为即时反馈，不隐藏功能、不延迟锁定。

## 未来模块边界

登录、账号、云端历史、AI 解卦、AR、社区和商城保持 `future-modules.ts` 的可替换接口与关闭 flag，不进入主导航，不放假入口，不在本次 UI 重构中增加后端或数据库。

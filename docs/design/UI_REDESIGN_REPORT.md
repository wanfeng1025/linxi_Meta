# 灵犀 Meta UI/UX 重构报告

## 1. Skills used

- `frontend-design`：提示词要求的第三方 skill 当前 Codex 环境未安装，未将第三方仓库复制进业务项目。
- `ui-ux-pro-max`：当前环境未安装；可访问性、响应式、触控目标和交付清单按仓库既有 AGENTS、Axe 与 Playwright 门禁执行。
- `motion`：当前环境未安装；动效按 `MOTION_SPEC.md` 落地，保留现有 GSAP 作为复杂起卦序列/氛围动效实现。
- Playwright：复用 `apps/web/playwright.config.ts`，Edge 可执行文件用于本机真实浏览器验收；CI 仍保留 Chromium/Firefox/WebKit 项目。

## 2. Initial audit findings

既有版本已经有匿名会话、共享六爻算法、墨绿基线、太极/云气和基础 GSAP，但信息层级偏卡片化；移动导航是横向导航；六十四卦缺少搜索/筛选/8×8 探索；起卦反馈缺少准备、翻转、落定和完成状态的明确文字层。

## 3. Design direction

采用 Modern Eastern Editorial：墨绿主色、朱砂红行动/风险、玄黑底层墨色、暖纸正文、青铜结构提示；以阴/阳爻线作为 signature divider、进度和空状态；不新增古装图像、紫蓝渐变、Three.js 或大型 UI framework。

## 4. Design tokens

语义 token 已集中在 `apps/web/app/globals.css`：`--background`、`--surface`、`--border`、`--text-primary`、`--text-muted`、`--accent`、`--cinnabar`、`--danger`、`--success`、`--warning`、`--focus-ring` 及 motion/easing token。正文保持 16px 以上与可读行高，中文标题使用 Song/Serif fallback，数据使用等宽字体。

## 5. Motion architecture

- `AmbientScene` 保留太极慢旋、云气漂移、卦象呼吸；装饰 `aria-hidden`。
- 起卦在 `castNextLine` 计算并持久化真实结果后才做铜钱/爻线展示；`castPhase` 明确 idle、ready、casting、result、completed、error。
- `isCasting` 防止快速重复起爻；第六爻后显示“六爻已成”，没有第七爻。
- reduced motion 下保留最终状态和 `aria-live` 文字，不等待长动画。

## 6. Routes redesigned

- `/`：Hero + 品牌证据三栏 + signature divider。
- `/casting`：状态层、铜钱舞台、动态读出与完成状态。
- `/hexagrams`：搜索、上/下卦筛选、8×8 桌面矩阵和移动自适应目录。
- `/knowledge`、`/methodology`、`/privacy`、`/terms`、`/disclaimer`：沿用真实内容，统一 token/阅读层级。
- `/result/[sessionId]`、`/hexagrams/[id]`、loading/error/not-found：保持原有业务和内容边界，使用新的全局视觉系统。

## 7. Components added

- `apps/web/components/site-navigation.tsx`：桌面/移动导航、`aria-expanded`/`aria-controls`、Escape 关闭、焦点回收。
- `apps/web/components/hexagram-explorer.tsx`：搜索、筛选、状态播报和卦目录展示。
- 首页新增证据摘要和阴阳爻 divider；起卦流程新增状态/读出样式。

## 8. Dependencies added / removed

无新增依赖、无移除依赖。复用现有 GSAP `3.15.0`、Next `16.2.11`、React `19.2.3` 和 Playwright。

## 9. Accessibility changes

- 移动菜单具备按钮名称、展开状态、控制关系、Escape 和焦点回收。
- 目录输入框/上下卦筛选均有 label；结果数量使用 `role=status`；起卦读出使用 `role=status`/`aria-live`。
- 保留 skip link、focus-visible、键盘操作、reduced motion 和语义标题；Axe 流程通过。

## 10. Responsive results

Edge 截图/脚本验证：390px 首页、起卦、六十四卦无横向滚动（`scrollWidth === viewport`）；1440px 首页和目录保持阅读宽度与 8 列矩阵。CSS 为 375/390/768/1024/1440 预留断点。

截图路径：

- `apps/web/artifacts/ui-audit/home-mobile.png`
- `apps/web/artifacts/ui-audit/casting-mobile.png`
- `apps/web/artifacts/ui-audit/hexagrams-mobile.png`
- `apps/web/artifacts/ui-audit/home-desktop.png`
- `apps/web/artifacts/ui-audit/hexagrams-desktop.png`

## 11. Playwright test results

- Edge 生产构建：7/7 通过（匿名六爻、Axe、reduced motion、移动导航、目录搜索/筛选、损坏会话、键盘/清除）。
- CI 配置仍保留 Chromium、Firefox、WebKit、390px mobile 和可选 Edge 项目。
- 本机 Playwright CDN 下载 Chromium/Firefox/WebKit 因 `ECONNRESET`/DNS 失败，未伪称这些本机项目通过；Edge 是当前可执行的真实浏览器证据。

## 12. Typecheck / test / data / build

- `pnpm run check`：通过（TypeScript、ESLint、Prettier、29 个 schema、内容源/授权引文/释义、Vitest 39 文件/170 测试、数据及 M4 候选）。
- `pnpm --filter @liuyao/web run build`：通过，Next 生成 15 个路由。
- `pnpm --filter @liuyao/web run typecheck`：通过。
- `pnpm --filter @liuyao/web run lint`：通过。

## 13. Security / data boundary

未改变 Web Crypto 随机、sessionStorage schema、匿名隐私、内容来源或安全响应头；未新增数据库、账号、云历史、AI、AR、社区或商城。未来模块仍由 `future-modules.ts` 的可替换接口和关闭 flag 预留。

## 14. Git / PR / Vercel

本次变更将在当前 `codex/p0-production-readiness` 分支形成独立提交并推送到 `wanfeng1025/linxi_Meta`，沿用现有 PR #1 的质量门禁。Vercel 项目仍使用 `linxi-meta`、Root Directory `apps/web`、Node 22.x；完成 Preview 验证后再更新 Production。若远端检查或部署因网络/额度失败，会保留失败证据并单独说明。

## 15. Remaining issues

1. 本地环境缺少 Playwright 管理的 Chromium/Firefox/WebKit，CDN 下载失败；需在网络稳定或 CI 中完成三引擎本机/远程验收。
2. PageSpeed/Lighthouse 需要线上运行时再采集分数，本次不伪造分数。
3. 第三方设计 skill 未安装，因此报告以仓库规范和可执行门禁为依据；后续若安装这些 skill，可对 token 和截图做第二轮专家复核。

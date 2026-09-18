# 灵犀 Meta Motion Spec

## Motion 原则

动效要有目的、克制、快速、可预测、可访问。优先使用 CSS transition/animation；简单受控变化使用 Web Animations API；只有起卦这种多阶段序列保留 GSAP。禁止 Three.js、粒子堆叠、赌场老虎机式随机滚动和会改变业务结果的“动画决定结果”。

## Token

```css
:root {
  --motion-fast: 160ms;
  --motion-base: 260ms;
  --motion-slow: 520ms;
  --ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.7, 0, 0.84, 0);
}
```

普通 hover/focus 使用 `motion-fast`；页面入场和 section 反馈使用 `motion-base`；铜钱翻转和完成构形最多 `motion-slow` 的数倍，但不阻塞可操作按钮。只动画 `transform`、`opacity`、`filter`，避免动画 width/height/top/left 造成 layout thrashing。

## 状态机

| 状态        | 业务含义                     | 视觉反馈                | 可操作性             |
| ----------- | ---------------------------- | ----------------------- | -------------------- |
| `idle`      | 尚未建立会话                 | 空铜钱/引导             | 可开始               |
| `ready`     | 会话已建立、等待一爻         | “第 n/6 爻”、六个爻位   | 可起下一爻           |
| `casting`   | 已计算真实三币，正在展示投掷 | 铜钱翻转、按钮 disabled | 禁止重复触发         |
| `settling`  | 铜钱落定、爻值/动爻已写入    | 铜钱落定、最新爻线成形  | 等待很短，不改变结果 |
| `result`    | 当前爻可读，等待下一次       | 读出和值、动/静爻       | 可起下一爻           |
| `completed` | 六爻已成                     | 完成 divider、允许锁定  | 可锁定               |
| `disabled`  | 非法/过渡/清除中             | disabled 文字和原因     | 不可操作             |
| `error`     | 保存/计算失败                | 可读错误 + 重试         | 不吞掉错误           |

真实顺序必须是：用户触发 → `drawThreeCoins`/`castNextLine` 立即计算并持久化 → UI 读取已锁定的三币/爻值 → 动画展示。动画回调不能生成随机数、不能决定 6/7/8/9，也不能改变 sessionStorage。

## 起卦序列

1. `ready` 显示第 1–6 爻和“初爻在最下方”。
2. 点击后立刻进入 `casting`，按钮 disabled；三枚铜钱以 `rotateX/translateY/opacity` 做 2D 投掷感，不做真实 3D 依赖。
3. `settling` 时展示三枚已计算原值，最新线从底部对应位置 `opacity + translateY` 进入；动爻使用朱砂小标记。
4. 回到 `result`，用 `aria-live` 播报“第 n 爻：值，动/静爻”。
5. 第 6 爻后进入 `completed`，先呈现“六爻已成”短反馈，再允许锁定；不出现第 7 爻，不自动跳转。

## Ambient Motion

太极 70–90 秒线性慢旋；两组云气 18–26 秒往返；背景卦象 5–7 秒低幅呼吸。所有 AmbientScene 元素 `aria-hidden`，不影响阅读层。鼠标跟随只在 fine pointer、no-preference 下启用，幅度小于 3deg。

## Reduced Motion

`prefers-reduced-motion: reduce` 时：停止太极/云气循环，铜钱和爻线直接显示最终状态或使用不超过 1ms 的过渡；保留颜色、文字、进度和 `aria-live` 反馈；不等待动画完成后才可锁定或导出。

## 性能与测试约束

- GSAP context 必须在 effect 清理时 revert/kill；不得创建每次渲染都新增的全局 ticker。
- 关键浏览器检查 Chromium、Firefox、WebKit、Edge 与 390px；至少覆盖 375/390/768/1024/1440。
- Playwright 断言每次只增加一爻、6/6 后没有第 7 爻、快速双击不重复、reduced motion 可完成、控制台无错误。

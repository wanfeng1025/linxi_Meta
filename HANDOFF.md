# 六爻匿名 Web V1：会话交接

## 任务目标

在 `agent/hexagram-core` 分支交付匿名六爻网站 V1：保留 Expo 移动端、使用 pnpm Monorepo 新增 Next.js Web，并部署可公开访问的 Vercel Preview。网站只能提供浏览器会话内的三币起卦、卦象结构和已核验知识内容；专业六爻、真实解卦、AI、Supabase 登录及云端历史均不得启用。

本轮 Vercel 范围为：连接 GitHub 仓库 `wanfeng1025/liuyao-app`，只为 `agent/hexagram-core` 做 Preview 验证；不配置域名、密钥、Supabase 或其他持久化服务。用户后来明确允许 Vercel 初始导入产生一次 `main` Production 尝试。

## 已完成

### 代码与 CI

- 已完成 pnpm Workspace（`apps/*`、`packages/*`）和 Next.js App Router Web；Expo 移动端保留。
- Web 已实现首页、匿名问题输入、六次三币起卦、结果、64 卦目录/详情、知识、隐私、条款和免责声明页；会话使用 `sessionStorage`，并明确提示不上传、不能跨设备同步、清除数据可能丢失。
- 共享六爻领域核心、契约、已核验内容和未发布能力状态已拆出；专业六爻、真实解卦和 AI 均显示未发布且不生成吉凶内容。
- Linux GitHub Actions 已通过：冻结安装、根质量门禁、Expo Doctor、Next production build、Playwright 匿名流程 E2E。
- 已推送到 `agent/hexagram-core`。最后用于 Preview 的提交为 `4f1002d`（`docs: record Linux web validation result`）。
- Windows 本地 Next SWC 继续是已知 `BLOCKED`，不作为 Linux/Vercel 交付门槛。

### Vercel 已发生的外部状态

- 已登录 Vercel 团队：`wanan`（Hobby）。
- 已创建项目：`wanan3/liuyao-app`。
- 已导入 GitHub 仓库；项目的 Build Command 是：
  `pnpm --filter @liuyao/web run build`
- Install Command 是：
  `pnpm install --frozen-lockfile`
- 项目 Framework Preset 已从 `Other` 改为 `Next.js`。
- Node.js Version 已从 24.x 改为 22.x。
- Root Directory 保持仓库根目录。
- 为适配 monorepo，Output Directory 已覆盖设置为 `apps/web/.next`（这是对“Output Directory 留空”的必要运行时修正）。
- 未添加环境变量、Supabase、域名或密钥。

## 当前状态 / 卡点

Preview 分支 `agent/hexagram-core` 已多次部署，前两次失败的原因均已定位：

1. 项目初始 Framework Preset 为 `Other`，Vercel 在根目录查找 `public/`；实际上 Next 构建已经成功。
2. 改为 `Next.js` 后，Vercel 仍从仓库根查找 `.next`；实际构建产物位于 `apps/web/.next`。

第三次 redeploy 后，固定 Preview 域名已于 2026-07-26 在内置浏览器成功打开。
首页显示匿名三币起卦、六十四卦结构入口和未发布能力边界，因此 Web V1 Preview
已得到访问验证。它仍是旧的已推送 Web V1 修订，不包括下述尚未推送的内容更新。

候选固定 Preview 域名（仅用于检查，不表示已成功）：

- `https://liuyao-app-git-agent-hexagram-core-wanan3.vercel.app`

此前失败的临时部署 URL：

- `https://liuyao-352p1jzw1-wanan3.vercel.app`
- `https://liuyao-jhcc52cn9-wanan3.vercel.app`

`main` 的首次 Production 尝试也失败，因为 `main` 仍是旧工程，缺少 `@liuyao/web` 工作区。用户明确允许过这一次尝试；后续不得再次触发 Production。

## 下一步计划

1. 对 2026-07-26 的本地内容更新，先取得用户对提交与推送 `agent/hexagram-core`
   的明确授权；不要自动提交、推送或重新部署。
2. 推送触发 Linux CI 后，打开固定 Preview 域名并验证：
   - 首页可打开；
   - 主导航可进入 `/methodology`，并出现“方法与证据”“未发布功能的启用条件”；
   - 进入匿名起卦、输入问题、连续点击六次；
   - 第六爻锁定并进入结果页；
   - `/hexagrams` 和任一 64 卦详情可访问；
   - 专业六爻、解卦与 AI 显示“尚未发布”。
3. 若更新后的 Preview 失败，打开最新部署的 Vercel Build Logs；不要猜测。重点核对：
   - Framework 是 `Next.js`；
   - Node 为 `22.x`；
   - Root Directory 仍为空/仓库根；
   - Build Command 和 Install Command 与上文完全一致；
   - Output Directory 是 `apps/web/.next`。
4. 若输出目录方案仍无法通过，优先采用 Vercel 官方 monorepo 的替代配置：将 Root Directory 改为 `apps/web`，保留“Include files outside root directory”，并把构建命令改为该目录上下文可用的命令。此方案会偏离原先“根目录”为根的设置，变更前先告知用户。
5. 成功后，用 `apply_patch` 更新：
   - `docs/audits/PUBLIC_WEB_V1_COMPLETION_REPORT.md`：真实 Preview URL、成功状态、Vercel 运行时配置和已知 Windows SWC 限制；
   - 必要时 `docs/deployment/VERCEL_SETUP.md`：补充最终有效的 monorepo Output Directory 配置。
6. 只有在 Vercel 构建成功后才报告公开 URL；绝不伪造成功。

## 2026-07-26 内容更新（已部署）

- 已阅读模块四、模块五的内容数据库/专业规则说明与验收包；它们均明确将传统文本和专业规则标为 `production_candidate`，需要固定底本、授权、哈希和两名不同审核人后才能升级。
- 用户表示已完成一次复核；不得虚构第二人签署或直接将候选数据改为 `verified`。
- 新增 `@liuyao/content` 的公开方法数据、`/methodology` 页面、知识/免责声明扩充、起卦和结果页的方法链接、导航以及 sitemap/robots 的真实 Preview 基址。
- 已通过：Web 与移动端 TypeScript、ESLint、Prettier、35 个测试文件/164 项测试、Schema/来源/数据/候选漂移校验。
- Windows `next build` 在 64 秒无输出后超时，不能用于本地发布结论；Linux CI 与 Vercel 是最终构建验证环境。
- 已推送的修复移除了会导致 Turbopack 将绝对路径误作 server-relative import 的临时 alias，并将仓库 `engines.node` 固定为 `22.x`。
- 最新 Linux 发布门禁 [run 30190013885](https://github.com/wanfeng1025/liuyao-app/actions/runs/30190013885) 已全绿；包含冻结安装、质量门禁、Expo Doctor、Next production build 和匿名流程 E2E。
- Vercel 项目 `wanan3/liuyao-app` 的 Install Command 已设为 `pnpm install --frozen-lockfile --force`，以重建 pnpm workspace 链接；Node 为 22.x，Framework 为 Next.js，Root Directory 为仓库根，Output Directory 为 `apps/web/.next`。
- Vercel deployment `dpl_7uY6YaUSdeHoEALG8YHNet5zmf2k` 已处于 `Ready`，并绑定到 `agent/hexagram-core` 的 Preview URL：`https://liuyao-app-git-agent-hexagram-core-wanan3.vercel.app/`。
- 为实现用户要求的公开访问，SSO Deployment Protection 已明确关闭（`ssoProtection: null`）；未触发 Production，未新增域名、环境变量或密钥。

## 2026-07-26 已授权卦辞/爻辞更新（仅本地，尚未提交或部署）

用户已明确确认：有权公开发布 `C:\Users\她和六便士\Desktop\六爻大概.txt`，并授权将其作为数据集使用。当前本地工作区已完成如下实现：

- 原文件已固定到 `data/source/classical/liuyao-overview-authorized-v1.txt`，SHA-256 为 `6b1b6df71dbdcb6b2bced70d1d9235f93a7204297c4378918dd92e44a4b11da4`；生成数据集位于同目录 JSON，版本为 `liuyao-overview-authorized-v1`。
- 新增可重复导入器 `scripts/import-authorized-classical-quotes.ts`、Zod Schema 和生成 Schema。它接受源文件中 `14卦`、`九四：`/`六五，` 等实际格式差异，但只在完整提取 **64 条卦辞 + 384 条普通爻辞** 时成功。
- `pnpm run check:classical-quotes` 与 `validate:data` 会同时检查固定原文件、字节数、64/384 覆盖、初爻至上爻位置、逐条 sourceLocator 和 SHA-256。数据集状态为 `verified`、来源类型 `authorized-dataset`、授权为 `cleared`，审核角色是 `project-owner-authorized-dataset-approval`。
- `@liuyao/content` 新增按 `hexagramId` 查询的原文接口。结果页显示本卦卦辞、**实际动爻**爻辞与变卦卦辞；64 卦详情显示相应卦辞。所有页面明确说明这是原文对照，不生成吉凶或现实建议。
- 彖传、象传、文言、用九/用六、现代释义、专业六爻与 AI 仍未发布；Kanripo 候选种子仍在 `data/draft/`，不得混入此授权数据集。
- 已实际通过：根与 Web TypeScript、目标 ESLint/Prettier、36 测试文件/165 测试、数据/Schema 校验；内置浏览器完成了输入问题、六次三币、锁定结果、原文对照与小过详情页验证。
- Windows 本机使用 Codex 捆绑 Node `v24.14.0` 运行 `next build` 时，编译和类型检查通过，但 Next 16.2.11 在内置 `/_global-error` 或 `/_not-found` 静态预渲染阶段报 `Expected workStore to be initialized`。仓库要求 Node 22，而 `node` 不在 PATH；不要将此当成代码或 Linux/Vercel 构建成功。先在 Linux CI/Vercel Node 22 验证后再发布。

下一步：若用户明确授权提交/推送，先只提交当前工作区的相关文件到 `agent/hexagram-core`，推送后检查 Linux CI；全绿后触发/检查 Preview，并验证真正的 Preview 页面出现“古籍原文引用”。绝不再次触发 Production。

## 绝对不要再踩的坑

- 不要把 Vercel 初始导入页面的 `main` 当作 `agent/hexagram-core` Preview。首次导入默认会走 `main`，且这次 `main` 是旧代码。
- 不要在新导入草稿页再次点 Deploy：曾出现项目名 `liuyao-app-rd2x` 的新草稿，容易重复创建项目。始终回到已创建的 `wanan3/liuyao-app` 项目。
- 不要把 Next.js 构建成功误报为 Vercel 部署成功。前两次日志都显示 `next build` 成功，但因输出目录定位失败而整体部署失败。
- 不要恢复 `Other` Framework，也不要把 Output Directory 再留空；根目录 monorepo + `pnpm --filter @liuyao/web run build` 的产物在 `apps/web/.next`。
- 不要把 Install Command 改回无 `--force` 的形式：Vercel 缓存可能缺少 workspace 链接并造成 `@liuyao/domain`、`@liuyao/content` 模块找不到。
- 不要重新启用 SSO Deployment Protection，除非产品不再要求公开 Preview；启用后未登录访客会被重定向到 Vercel 登录页。
- 不要将 Root Directory、Build Command、Install Command、Framework、Node 版本一起随意改动；一次只改一个可验证变量并查看最新日志。
- 不要新增环境变量、Supabase、Auth、RLS、域名、Analytics、Speed Insights 或任何密钥。
- 不要再次触发 Production；用户只授权过已发生的那一次 `main` 初始尝试，后续只操作 Preview。
- 浏览器控制会频繁因 Statsig 网络超时重置或丢失标签绑定。每次重新连接后先用 `iab.user.openTabs()` 找到真实用户标签，再 `claimTab`；若没有可接管的项目页，直接新开标签导航到项目 URL。不要把旧 tab binding 继续复用。
- 不要宣称运行过未实际运行的检查。Vercel 最终第三次 redeploy 的结果在本会话结束时未知。

## 有用链接

- 项目部署列表：`https://vercel.com/wanan3/liuyao-app/deployments`
- Build 设置：`https://vercel.com/wanan3/liuyao-app/settings/build-and-deployment`
- GitHub 分支：`https://github.com/wanfeng1025/liuyao-app/tree/agent/hexagram-core`
- 通过的 Linux Web CI：`https://github.com/wanfeng1025/liuyao-app/actions/runs/30151888774`

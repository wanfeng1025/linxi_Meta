# 灵犀 Meta｜Vercel 部署

## 项目边界

- Vercel 项目名：`linxi-meta`。
- GitHub 仓库：`wanfeng1025/linxi_Meta`。
- Root Directory：`apps/web`，并允许构建访问 monorepo 根目录中的 workspace 包。
- Preview 用于 PR 验收；质量门禁通过后发布 Production。
- Production 暂用 Vercel 默认域名 `https://linxi-meta.vercel.app`。
- Web 应用使用 `sessionStorage`；Vercel 不保存用户问题、铜钱或历史记录。
- 不写入 API key、数据库凭据或用户起卦数据。

## 项目设置

| 设置             | 值                               |
| ---------------- | -------------------------------- |
| Framework Preset | Next.js                          |
| Root Directory   | `apps/web`                       |
| Install Command  | `pnpm install --frozen-lockfile` |
| Build Command    | `pnpm run build`                 |
| Output Directory | `.next`                          |
| Node.js          | 22.x                             |

仓库根目录的 `pnpm-lock.yaml` 必须作为部署锁文件；`apps/web` 通过 workspace 引用
`@liuyao/domain`、`@liuyao/content` 和 `@liuyao/shared`，因此不能只上传 Web 子目录。
`.vercel/` 只保存本机项目关联信息，已被 Git 忽略，不得提交。

## 首次关联

在仓库根目录执行：

```powershell
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link --project linxi-meta --scope wanan3
```

若使用 Vercel 控制台导入 GitHub 仓库，应选择 `wanfeng1025/linxi_Meta`，再按上表设置
Root Directory。若 Vercel 要求扩大 GitHub App 仓库权限，必须在最终授权动作前由项目负责人确认。

## Preview 与 Production

分支推送和 PR 应自动产生 Preview。CLI 手动验证命令如下：

```powershell
pnpm dlx vercel@latest
pnpm dlx vercel@latest --prod
```

Production 只能在 `pnpm run check`、生产构建、跨浏览器 E2E、无障碍检查和 Preview 验收
均通过后发布。发布后再次核验：首页、匿名六次起卦、锁定结果、JSON/PNG 导出、清除会话、
64 卦目录、`robots.txt`、`sitemap.xml`、manifest、图标与安全响应头。

## 站点 URL

默认站点 URL 由 `apps/web/lib/site-url.ts` 集中提供。若实际 Vercel 域名与默认值不同，
在 Vercel 中设置 `NEXT_PUBLIC_SITE_URL` 为最终 HTTPS Origin，避免 canonical、Open Graph、
robots 与 sitemap 出现不一致。

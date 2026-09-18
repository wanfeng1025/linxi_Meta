# Vercel Preview 部署

## 约束

- 仅部署 Preview，禁止选择 Production。
- 不写入 API key、Supabase service role 或用户起卦数据。
- Web 应用使用 `sessionStorage`；Vercel 不保存问题、铜钱或历史记录。
- Windows 本地 Next SWC 的当前状态是 `BLOCKED`；以 GitHub Actions Ubuntu 的构建结果为准。

## 首次关联

在仓库根目录、完成 Linux CI 后执行：

```powershell
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link
```

在交互式提示中创建或选择 Vercel 项目，并保留仓库根目录作为 Root Directory。项目设置为：

| 设置             | 值                                       |
| ---------------- | ---------------------------------------- |
| Install Command  | `pnpm install --frozen-lockfile --force` |
| Build Command    | `pnpm --filter @liuyao/web run build`    |
| Output Directory | `apps/web/.next`                         |
| Node.js          | 22.x                                     |

`.vercel/` 只包含本机项目关联信息，已被 Git 忽略，不得提交。

### 已验证的根目录 Monorepo 配置

当 Root Directory 保持仓库根目录并由过滤命令构建 Web 包时，Next 的产物会位于
`apps/web/.next`。Vercel 项目必须选择 `Next.js` Framework Preset，并把上表的
Output Directory 显式设为 `apps/web/.next`；留空会让部署在仓库根查找 `.next`。
一次只调整一个设置后查看最新 Build Log，不要将 Framework、Root Directory、
Node 版本、安装命令和构建命令同时改动。

### 已验证的公开 Preview 配置

当 Vercel 的依赖缓存缺少 pnpm workspace 链接时，`pnpm install` 可能错误地显示
已完成，而 Web 包无法解析 `@liuyao/domain` 与 `@liuyao/content`。因此本项目的
Install Command 固定为 `pnpm install --frozen-lockfile --force`，以在每次 Preview
构建时重建工作区链接。

若目标是让未登录访客访问 Preview，项目的 SSO Deployment Protection 必须关闭。
可用以下命令核验状态，确认 `ssoProtection` 为 `null`：

```powershell
pnpm dlx vercel@latest project protection liuyao-app --scope wanan3 --format json
```

这只影响 Preview 访问保护，不会将任何部署提升为 Production。

## Preview

在仓库根目录执行：

```powershell
pnpm dlx vercel@latest
```

确认交互输出是 Preview URL 后，打开该 URL 并验证：首页、匿名六次起卦、锁定结果、64 卦目录和未发布能力提示。不得使用 `--prod`。

## 必需的人工作业

如果 `vercel login` 要求浏览器登录、团队授权或项目权限，请完成授权后重新执行上述命令。部署报告必须在实际访问成功前保留 `HUMAN_VERCEL_LOGIN_REQUIRED`，不得猜测或伪造 URL。

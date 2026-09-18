# Web 未来模块边界

当前生产版本保持匿名、会话内存储。`apps/web/lib/future-modules.ts` 只定义可替换端口和默认关闭的 Feature Flag，不提供空页面、假数据或不可用导航。

## 计划边界

- `auth`：未来可接手机号验证码或微信 OAuth；当前由 `AnonymousAuthAdapter` 返回匿名状态。
- `userRecords`：未来保存用户授权后的版本化起卦记录；不得覆盖原始铜钱事实。
- `cloudStorage`：未来实现加密、访问控制、导出、删除和账号注销；当前不上传任何问题或结果。
- `aiReading`：只能改写经确定性规则产生的允许字段，不能参与随机、卦象映射或专业事实计算。
- `ar`、`community`、`marketplace`：分别保持独立模块和权限边界，完成产品、安全与合规审核后才能启用。

启用任一模块前，必须新增对应 adapter、Schema、审计测试、隐私说明和回滚方案，并通过 Feature Flag 显式开放。

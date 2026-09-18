import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, ConfirmDialog, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function ResumeScreen() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (runtime.corruptedDraft) {
    return (
      <Screen title="草稿需要修复">
        <StateView
          kind="error"
          title="保存的数据无法通过校验"
          message="为避免错误重建铜钱，应用不会自动补值或重新随机。你可以删除损坏草稿，已锁定历史不受影响。"
          action={
            <Button
              label="删除损坏草稿"
              tone="danger"
              onPress={() =>
                void runtime.clearCorruptedDraft().then(() => router.replace(APP_ROUTES.home))
              }
            />
          }
        />
      </Screen>
    );
  }

  if (runtime.activeSession === null) {
    return (
      <Screen>
        <StateView
          kind="empty"
          title="没有未完成起卦"
          message="你可以返回首页开始一轮新的六爻起卦。"
          action={<Button label="返回首页" onPress={() => router.replace(APP_ROUTES.home)} />}
        />
      </Screen>
    );
  }

  const session = runtime.activeSession;
  return (
    <Screen title="恢复起卦" subtitle="已保存的铜钱会原样恢复，不会再次读取随机源。">
      <Card>
        <Tag label={`${session.lines.length}/6 爻`} tone="warning" />
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
          {runtime.activeMetadata?.values.question ?? '问题摘要不可用'}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          状态：{session.status} · 创建于 {new Date(session.createdAt).toLocaleString('zh-CN')}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
          规则版本 {session.rulesetVersion}
        </Text>
      </Card>
      <Button label="继续起卦" onPress={() => router.replace(APP_ROUTES.cast(session.sessionId))} />
      <Button label="删除草稿" tone="danger" onPress={() => setConfirmDelete(true)} />
      <ConfirmDialog
        visible={confirmDelete}
        title="删除未完成起卦？"
        message="未锁定的铜钱和问题摘要会从本机删除，此操作无法恢复。"
        confirmLabel="确认删除"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void runtime.deleteDraft(session.sessionId).then(() => router.replace(APP_ROUTES.home));
        }}
      />
    </Screen>
  );
}

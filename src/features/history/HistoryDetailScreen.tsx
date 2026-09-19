import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import {
  Button,
  Card,
  CastLines,
  ConfirmDialog,
  Screen,
  StateView,
  Tag,
} from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';
import { useResult } from '@/features/results/useResult';

export function HistoryDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const { result, setResult, loading, error } = useResult(sessionId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reanalysisMessage, setReanalysisMessage] = useState<string | null>(null);
  if (loading)
    return (
      <Screen>
        <StateView kind="loading" title="读取历史详情" message="正在校验原始铜钱与快照。" />
      </Screen>
    );
  if (error !== null || result === null)
    return (
      <Screen>
        <StateView kind="error" title="历史不可用" message={error ?? '记录不存在。'} />
      </Screen>
    );
  const snapshot = result.snapshot;
  return (
    <Screen title="历史详情" subtitle="回看首先展示当时快照；重新分析只能追加，不能覆盖。">
      <Card>
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
          {snapshot.metadata.values.question}
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          {snapshot.primaryHexagram.name}
          {snapshot.changeStatus === 'CHANGING'
            ? ` → ${snapshot.changedHexagram?.name}`
            : ' · 静卦 · 无动爻'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Tag label={`${result.snapshotCount} 个快照`} tone="success" />
          <Tag label={result.favorite ? '已收藏' : '未收藏'} />
          <Tag label={snapshot.metadata.values.category} />
        </View>
      </Card>
      <Card>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.ink }]}
        >
          原始六爻
        </Text>
        <CastLines lines={snapshot.lines} />
        {snapshot.lines.map((line) => (
          <Text
            key={line.position}
            style={[theme.typography.caption, { color: theme.colors.muted }]}
          >
            第 {line.position} 爻 · 铜钱 {line.coins.join(' + ')} = {line.value} ·{' '}
            {line.movement === 'moving' ? '动' : '静'}
          </Text>
        ))}
      </Card>
      <Card>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.ink }]}
        >
          版本快照
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          起卦规则：{snapshot.rulesetVersion}
          {'\n'}内容版本：{snapshot.contentVersion}
          {'\n'}时间：{new Date(result.castAt).toLocaleString('zh-CN')} ({result.timezone})
        </Text>
      </Card>
      {reanalysisMessage && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.warning }]}
        >
          {reanalysisMessage}
        </Text>
      )}
      <Button
        label="查看当时结果"
        onPress={() => router.push(APP_ROUTES.result(result.sessionId))}
      />
      <Button
        label={result.favorite ? '取消收藏' : '收藏'}
        tone="secondary"
        onPress={() =>
          void runtime
            .toggleFavorite(result.sessionId)
            .then((favorite) => setResult({ ...result, favorite }))
        }
      />
      <Button
        label="使用新规则重新分析"
        tone="secondary"
        onPress={() => {
          try {
            runtime.reanalyze();
          } catch (reason) {
            setReanalysisMessage(reason instanceof Error ? reason.message : '新规则不可用。');
          }
        }}
      />
      <Button label="删除记录" tone="danger" onPress={() => setConfirmDelete(true)} />
      <ConfirmDialog
        visible={confirmDelete}
        title="删除这条历史？"
        message="原始铜钱和全部分析快照会从本机级联删除，无法恢复。"
        confirmLabel="确认删除"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          void runtime
            .deleteHistory(result.sessionId)
            .then(() => router.replace(APP_ROUTES.history));
        }}
      />
    </Screen>
  );
}

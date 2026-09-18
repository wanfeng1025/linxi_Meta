import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { filterHistory, type HistoryFilter, type QuestionCategory } from '@/application/page';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, OfflineBanner, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

const FILTERS = [
  ['all', '全部'],
  ['general-decision', '综合'],
  ['career', '事业'],
  ['study', '学习'],
  ['relationship', '关系'],
  ['health', '健康'],
] as const satisfies readonly (readonly [QuestionCategory | 'all', string])[];

export function HistoryScreen() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const [filter, setFilter] = useState<HistoryFilter>({
    query: '',
    category: 'all',
    favoritesOnly: false,
    since: null,
  });
  const filtered = useMemo(() => filterHistory(runtime.history, filter), [filter, runtime.history]);
  return (
    <Screen title="历史记录" subtitle="每条记录保留原始铜钱、规则版本和追加式分析快照。">
      <OfflineBanner />
      <TextInput
        accessibilityLabel="搜索历史"
        value={filter.query}
        onChangeText={(query) => setFilter((current) => ({ ...current, query }))}
        placeholder="搜索问题或卦名"
        placeholderTextColor={theme.colors.subtle}
        style={[
          styles.search,
          theme.typography.body,
          {
            color: theme.colors.ink,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surfaceRaised,
          },
        ]}
      />
      <View style={styles.filters}>
        {FILTERS.map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: filter.category === id }}
            onPress={() => setFilter((current) => ({ ...current, category: id }))}
          >
            <Tag label={label} tone={filter.category === id ? 'accent' : 'neutral'} />
          </Pressable>
        ))}
      </View>
      <View style={styles.filters}>
        <Button
          label={filter.favoritesOnly ? '已筛收藏' : '仅看收藏'}
          tone="secondary"
          onPress={() =>
            setFilter((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))
          }
        />
        <Button
          label={filter.since === null ? '最近 30 天' : '取消日期筛选'}
          tone="secondary"
          onPress={() =>
            setFilter((current) => ({
              ...current,
              since:
                current.since === null ? new Date(Date.now() - 30 * 86400000).toISOString() : null,
            }))
          }
        />
      </View>
      {runtime.actionError && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.danger }]}
        >
          {runtime.actionError}
        </Text>
      )}
      {filtered.length === 0 ? (
        <StateView
          kind="empty"
          title="没有匹配记录"
          message={
            runtime.history.length === 0
              ? '完成并锁定一次起卦后，记录会显示在这里。'
              : '试试清除搜索、分类或日期筛选。'
          }
        />
      ) : (
        filtered.map((item) => (
          <Pressable
            key={item.sessionId}
            accessibilityRole="button"
            onPress={() => router.push(APP_ROUTES.historyDetail(item.sessionId))}
          >
            <Card>
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={2}
                  style={[theme.typography.heading, styles.flex, { color: theme.colors.ink }]}
                >
                  {item.question}
                </Text>
                {item.favorite && (
                  <Text
                    accessibilityLabel="已收藏"
                    style={[styles.star, { color: theme.colors.gold }]}
                  >
                    ★
                  </Text>
                )}
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
                {item.primaryName} → {item.changedName} · {item.movingLineCount} 动爻
              </Text>
              <View style={styles.rowBetween}>
                <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
                  {new Date(item.castAt).toLocaleString('zh-CN')}
                </Text>
                <Tag label={`${item.snapshotCount} 个快照`} />
              </View>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  flex: { flex: 1 },
  star: { fontSize: 20 },
});

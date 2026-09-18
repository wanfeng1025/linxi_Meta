import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Card, OfflineBanner, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

type KnowledgeKind = 'all' | 'trigram' | 'hexagram' | 'topic';

export function KnowledgeScreen() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const [kind, setKind] = useState<KnowledgeKind>('all');
  const [query, setQuery] = useState('');
  const items = runtime.listKnowledge();
  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (kind === 'all' || item.kind === kind) &&
          `${item.title} ${item.summary}`.includes(query.trim()),
      ),
    [items, kind, query],
  );
  return (
    <Screen title="知识库" subtitle="已核验结构与待审核传统内容严格分区。">
      <OfflineBanner />
      <TextInput
        accessibilityLabel="搜索知识"
        value={query}
        onChangeText={setQuery}
        placeholder="搜索卦名或主题"
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
        {(
          [
            ['all', '全部'],
            ['trigram', '八卦'],
            ['hexagram', '六十四卦'],
            ['topic', '术语状态'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ checked: kind === id }}
            onPress={() => setKind(id)}
          >
            <Tag label={label} tone={kind === id ? 'accent' : 'neutral'} />
          </Pressable>
        ))}
      </View>
      <Card style={{ backgroundColor: theme.colors.goldSoft }}>
        <Text style={[theme.typography.label, { color: theme.colors.gold }]}>内容边界</Text>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          当前生产内容已核验 8 个八卦与 64
          个卦象的名称、符号和上下卦结构；卦爻辞、纳甲、世应等内容尚未通过发布门禁。
        </Text>
      </Card>
      {filtered.length === 0 ? (
        <StateView kind="empty" title="没有匹配知识" message="请调整搜索词或内容分区。" />
      ) : (
        filtered.map((item) => (
          <Pressable
            key={item.slug}
            accessibilityRole="link"
            onPress={() => router.push(APP_ROUTES.knowledgeDetail(item.slug))}
          >
            <Card>
              <View style={styles.itemRow}>
                <Text
                  style={[
                    styles.symbol,
                    { color: item.status === 'verified' ? theme.colors.ink : theme.colors.subtle },
                  ]}
                >
                  {item.symbol}
                </Text>
                <View style={styles.flex}>
                  <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[theme.typography.body, { color: theme.colors.muted }]}
                  >
                    {item.summary}
                  </Text>
                </View>
                <Tag
                  label={item.status === 'verified' ? '已核验' : '待审核'}
                  tone={item.status === 'verified' ? 'success' : 'warning'}
                />
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  symbol: { fontSize: 34, width: 44, textAlign: 'center' },
  flex: { flex: 1, gap: 4 },
});

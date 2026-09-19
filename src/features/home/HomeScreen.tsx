import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { CastSessionMetadata, HistoryItem } from '@/application/page';
import type { CastingSession } from '@/domain/casting';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, OfflineBanner, Screen, Tag, TaijiMark } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export interface HomeViewProps {
  readonly activeSession: CastingSession | null;
  readonly activeMetadata: CastSessionMetadata | null;
  readonly recentHistory: readonly HistoryItem[];
  readonly onStart: () => void;
  readonly onContinue: () => void;
  readonly onHistory: (sessionId: string) => void;
  readonly onKnowledge: () => void;
}

export function HomeView(props: HomeViewProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const progress = props.activeSession?.lines.length ?? 0;
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Tag label="离线起卦 · 规则可溯" tone="accent" />
          <Text
            accessibilityRole="header"
            style={[
              theme.typography.display,
              {
                color: theme.colors.ink,
                fontSize: theme.typography.display.fontSize * theme.fontScale,
              },
            ]}
          >
            六爻起卦
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            留一问，投三钱，循六爻。每一步保留原始记录，每一项结论说明依据。
          </Text>
          <OfflineBanner />
        </View>
        <TaijiMark size={compact ? 72 : 104} />
      </View>

      <Button label="开始起卦" onPress={props.onStart} accessibilityLabel="开始新的起卦" />

      {props.activeSession !== null && (
        <Card accessibilityLabel="未完成起卦">
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
                继续未完成起卦
              </Text>
              <Text
                numberOfLines={2}
                style={[theme.typography.body, { color: theme.colors.muted }]}
              >
                {props.activeMetadata?.values.question ?? '问题摘要不可用'}
              </Text>
            </View>
            <Tag label={`${progress}/6 爻`} tone="warning" />
          </View>
          <Button label="继续" tone="secondary" onPress={props.onContinue} />
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.ink }]}
        >
          最近记录
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push(APP_ROUTES.history)}>
          <Text style={[theme.typography.label, { color: theme.colors.accent }]}>查看全部</Text>
        </Pressable>
      </View>
      {props.recentHistory.length === 0 ? (
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            暂无历史。完成并锁定六爻后，原始铜钱与结构快照会保存在本机。
          </Text>
        </Card>
      ) : (
        props.recentHistory.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.sessionId}
            onPress={() => props.onHistory(item.sessionId)}
          >
            <Card>
              <View style={styles.rowBetween}>
                <Text
                  numberOfLines={1}
                  style={[theme.typography.label, styles.flex, { color: theme.colors.ink }]}
                >
                  {item.question}
                </Text>
                {item.favorite && (
                  <Text accessibilityLabel="已收藏" style={{ color: theme.colors.gold }}>
                    ★
                  </Text>
                )}
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
                {item.primaryName}
                {item.changedName === null ? ' · 静卦 · 无动爻' : ` → ${item.changedName}`}
                {item.changedName !== null && ` · ${item.movingLineCount} 动爻`}
              </Text>
            </Card>
          </Pressable>
        ))
      )}

      <View style={[styles.quickGrid, compact && styles.quickGridCompact]}>
        <Pressable accessibilityRole="link" onPress={props.onKnowledge} style={styles.flex}>
          <Card>
            <Text style={[styles.quickSymbol, { color: theme.colors.gold }]}>☰</Text>
            <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>六十四卦</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
              浏览已核验结构
            </Text>
          </Card>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={props.onKnowledge} style={styles.flex}>
          <Card>
            <Text style={[styles.quickSymbol, { color: theme.colors.gold }]}>卷</Text>
            <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>六爻知识</Text>
            <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
              区分已核验与待审核
            </Text>
          </Card>
        </Pressable>
      </View>

      <Card style={{ backgroundColor: theme.colors.goldSoft }}>
        <Text style={[theme.typography.label, { color: theme.colors.gold }]}>简易与专业模式</Text>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          简易模式展示本卦、变卦和动爻。专业模式须等待八宫、纳甲、历法等规则完成来源与双人复核后才会开放真实排盘。
        </Text>
      </Card>
      <Text
        accessibilityLabel="风险提示"
        style={[theme.typography.caption, { color: theme.colors.subtle, textAlign: 'center' }]}
      >
        仅供文化学习与个人反思，不替代医疗、法律、财务或其他专业意见。
      </Text>
    </Screen>
  );
}

export function HomeScreen() {
  const runtime = useAppRuntime();
  return (
    <HomeView
      activeSession={runtime.activeSession}
      activeMetadata={runtime.activeMetadata}
      recentHistory={runtime.history.slice(0, 3)}
      onStart={() => router.push(APP_ROUTES.question)}
      onContinue={() => router.push(APP_ROUTES.resume)}
      onHistory={(sessionId) => router.push(APP_ROUTES.historyDetail(sessionId))}
      onKnowledge={() => router.push(APP_ROUTES.knowledge)}
    />
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 18 },
  heroCopy: { flex: 1, gap: 12 },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionHeader: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickGrid: { flexDirection: 'row', gap: 12 },
  quickGridCompact: { flexDirection: 'column' },
  flex: { flex: 1 },
  quickSymbol: { fontSize: 32, fontWeight: '600' },
});

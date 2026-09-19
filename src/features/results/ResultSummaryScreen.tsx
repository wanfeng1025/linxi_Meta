import { router, useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, Text, View } from 'react-native';

import { formatMovingLinePositions } from '@/domain/casting';
import { formatHexagramLabel } from '@/domain/hexagram';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import {
  Button,
  Card,
  HexagramCard,
  OfflineBanner,
  Screen,
  StateView,
  Tag,
} from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

import { useResult } from './useResult';

export function ResultSummaryScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const { result, setResult, loading, error } = useResult(sessionId);

  if (loading)
    return (
      <Screen>
        <StateView
          kind="loading"
          title="正在读取结果"
          message="从本机历史仓储校验原始铜钱和快照。"
        />
      </Screen>
    );
  if (error !== null || result === null)
    return (
      <Screen>
        <StateView
          kind="error"
          title="结果暂时无法显示"
          message={error ?? '记录不存在。'}
          action={<Button label="返回历史" onPress={() => router.replace(APP_ROUTES.history)} />}
        />
      </Screen>
    );

  const snapshot = result.snapshot;
  const movingLabel =
    snapshot.changeStatus === 'STATIC'
      ? '静卦 · 无动爻'
      : `动卦 · ${formatMovingLinePositions(snapshot.movingLines)}动`;
  const hexagramLabel =
    snapshot.changeStatus === 'STATIC'
      ? formatHexagramLabel(snapshot.primaryHexagram)
      : `${formatHexagramLabel(snapshot.primaryHexagram)} → ${formatHexagramLabel(snapshot.changedHexagram!)}`;
  const share = async () => {
    await Share.share({
      message: `${snapshot.metadata.values.question}\n${hexagramLabel}\n${movingLabel}\n${snapshot.riskStatement}`,
      title: '六爻结构结果',
    });
  };

  return (
    <Screen title="结果概要" subtitle="展示已计算事实；未发布的解释能力不会被文案补全。">
      <OfflineBanner />
      <Card>
        <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>所问</Text>
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
          {snapshot.metadata.values.question}
        </Text>
        <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
          {new Date(result.castAt).toLocaleString('zh-CN')} · {result.timezone}
        </Text>
      </Card>
      <View style={styles.hexagrams}>
        <HexagramCard
          label="本卦"
          {...snapshot.primaryHexagram}
          sequence={snapshot.primaryHexagram.kingWenSequence}
        />
        {snapshot.changeStatus === 'CHANGING' && (
          <HexagramCard
            label="变卦"
            {...snapshot.changedHexagram!}
            sequence={snapshot.changedHexagram!.kingWenSequence}
          />
        )}
      </View>
      <View style={styles.tags}>
        <Tag label={movingLabel} tone="accent" />
        <Tag label="结构已核验" tone="success" />
        <Tag label="解释待规则" tone="warning" />
      </View>
      {snapshot.changeStatus === 'STATIC' && (
        <Card>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            本次无动爻，不产生独立变卦。
          </Text>
        </Card>
      )}
      <Card style={{ backgroundColor: theme.colors.goldSoft }}>
        <Text style={[theme.typography.caption, { color: theme.colors.gold }]}>一句话结论</Text>
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>
          {snapshot.oneLineConclusion}
        </Text>
      </Card>
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.ink }]}>
          主象 / 辅助象 / 趋势
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          尚无经核验解释规则，因此这三项保持未定；不以随机数或自由文本补齐。
        </Text>
      </Card>
      <Card style={{ backgroundColor: theme.colors.warningSoft }}>
        <Text style={[theme.typography.label, { color: theme.colors.warning }]}>风险提示</Text>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          {snapshot.riskStatement}
        </Text>
      </Card>
      <Button
        label="查看详细解卦"
        onPress={() => router.push(APP_ROUTES.interpretation(result.sessionId))}
      />
      <Button
        label="查看专业排盘"
        tone="secondary"
        onPress={() => router.push(APP_ROUTES.professional(result.sessionId))}
      />
      <View style={styles.actions}>
        <Button
          label={result.favorite ? '取消收藏' : '收藏'}
          tone="secondary"
          onPress={() =>
            void runtime
              .toggleFavorite(result.sessionId)
              .then((favorite) => setResult({ ...result, favorite }))
          }
        />
        <Button label="分享概要" tone="secondary" onPress={() => void share()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hexagrams: { flexDirection: 'row', gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', gap: 10 },
});

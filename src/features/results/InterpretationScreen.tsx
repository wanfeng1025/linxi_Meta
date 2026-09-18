import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, EvidenceCard, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

import { useResult } from './useResult';

export function InterpretationScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useAppTheme();
  const { result, loading, error } = useResult(sessionId);
  if (loading)
    return (
      <Screen>
        <StateView kind="loading" title="读取详细解卦" message="正在校验本地结构快照。" />
      </Screen>
    );
  if (error !== null || result === null)
    return (
      <Screen>
        <StateView kind="error" title="无法读取解卦" message={error ?? '记录不存在。'} />
      </Screen>
    );
  const snapshot = result.snapshot;
  return (
    <Screen title="详细解卦" subtitle="结论与依据分开呈现；依据默认折叠，可逐条展开。">
      <Card>
        <Tag label="结构事实" tone="success" />
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>卦象总论</Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          本卦为第 {snapshot.primaryHexagram.kingWenSequence} 卦「{snapshot.primaryHexagram.name}
          」，变卦为第 {snapshot.changedHexagram.kingWenSequence} 卦「
          {snapshot.changedHexagram.name}」；动爻位置为{' '}
          {snapshot.movingLines.length ? snapshot.movingLines.join('、') : '无'}。
        </Text>
      </Card>
      {['针对问题分析', '有利条件', '不利条件', '趋势', '行动建议'].map((title) => (
        <Card key={title}>
          <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>{title}</Text>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
            经核验的解释规则尚未发布，本节保持空状态，不将测试 fixture 或通用文案当作传统结论。
          </Text>
        </Card>
      ))}
      <Text
        accessibilityRole="header"
        style={[theme.typography.heading, { color: theme.colors.ink }]}
      >
        判断依据
      </Text>
      {snapshot.rationale.map((item) => (
        <EvidenceCard key={item.id} {...item} />
      ))}
      <Card>
        <Text style={[theme.typography.heading, { color: theme.colors.ink }]}>数据和规则版本</Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          起卦规则：{snapshot.rulesetVersion}
          {'\n'}内容版本：{snapshot.contentVersion}
          {'\n'}快照数量：{result.snapshotCount}
        </Text>
      </Card>
      <Card style={{ backgroundColor: theme.colors.warningSoft }}>
        <Text style={[theme.typography.heading, { color: theme.colors.warning }]}>风险声明</Text>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          {snapshot.riskStatement}
        </Text>
      </Card>
      <Button
        label="查看专业排盘状态"
        tone="secondary"
        onPress={() => router.push(APP_ROUTES.professional(result.sessionId))}
      />
    </Screen>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { Card, Screen, StateView, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

import { useResult } from './useResult';

export function ProfessionalChartScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const { result, loading, error } = useResult(sessionId);
  if (loading)
    return (
      <Screen>
        <StateView kind="loading" title="检查专业能力" message="正在核对规则与历法版本。" />
      </Screen>
    );
  if (error !== null || result === null)
    return (
      <Screen>
        <StateView kind="error" title="无法读取会话" message={error ?? '记录不存在。'} />
      </Screen>
    );
  const availability = runtime.getProfessionalChartAvailability(result.sessionId);
  return (
    <Screen title="专业排盘" subtitle="本页只消费专业排盘端口；当前 adapter 明确返回不可用。">
      <StateView kind="empty" title="专业规则尚未发布" message={availability.reason} />
      <Card>
        <Tag label="基础结构可用" tone="success" />
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          可确认：本卦 {result.snapshot.primaryHexagram.name}；{' '}
          {result.snapshot.changeStatus === 'CHANGING'
            ? `变卦 ${result.snapshot.changedHexagram?.name}、动爻 ${result.snapshot.movingLines.join('、')}`
            : '静卦，无动爻，不产生独立变卦'}
          。六爻内部仍按初爻到上爻保存。
        </Text>
        {availability.missingCapabilities.map((item) => (
          <Text key={item} style={[theme.typography.caption, { color: theme.colors.muted }]}>
            • {item}
          </Text>
        ))}
        <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
          Adapter：{availability.adapterVersion}
        </Text>
      </Card>
      <Card style={{ backgroundColor: theme.colors.warningSoft }}>
        <Text style={[theme.typography.label, { color: theme.colors.warning }]}>待解锁字段</Text>
        <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
          六神、伏神、六亲、干支、五行、世应、变爻、日月状态，以及空、破、墓等事实，必须由同一已核验规则集生成并附术语说明。
        </Text>
      </Card>
    </Screen>
  );
}

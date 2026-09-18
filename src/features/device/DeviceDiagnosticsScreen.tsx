import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DEFAULT_SHAKE_DETECTOR_CONFIG } from '@/domain/device';
import { NoopHapticFeedback } from '@/infrastructure/haptics';
import { ExpoAccelerometerSensor } from '@/infrastructure/sensors';
import { Card, Screen, StateView } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

import { useShakeToCast } from './useShakeToCast';

export function DeviceDiagnosticsScreen() {
  const theme = useAppTheme();
  const sensor = useMemo(() => new ExpoAccelerometerSensor(), []);
  const haptics = useMemo(() => new NoopHapticFeedback(), []);
  const { diagnostics } = useShakeToCast({
    sensor,
    haptics,
    enabled: __DEV__,
    sessionComplete: false,
    blocked: false,
    onValidShake: async () => undefined,
    hapticsEnabled: false,
    reducedHaptics: true,
  });

  if (!__DEV__) {
    return (
      <Screen>
        <StateView
          kind="empty"
          title="诊断工具仅限开发环境"
          message="生产版本不会暴露设备诊断数据。"
        />
      </Screen>
    );
  }

  const rows: readonly [string, string][] = [
    ['传感器', `${diagnostics.availability} / ${diagnostics.accessStatus}`],
    ['采样频率', '50 ms（20 Hz）'],
    [
      '三轴数据',
      diagnostics.axes
        ? `${diagnostics.axes.x.toFixed(3)}, ${diagnostics.axes.y.toFixed(3)}, ${diagnostics.axes.z.toFixed(3)}`
        : '等待样本',
    ],
    ['摇动强度', diagnostics.strength.toFixed(3)],
    ['状态机', diagnostics.detectorState],
    [
      '阈值',
      `候选 ${DEFAULT_SHAKE_DETECTOR_CONFIG.candidateThreshold} / 峰值 ${DEFAULT_SHAKE_DETECTOR_CONFIG.peakThreshold}`,
    ],
    [
      '最近触发',
      diagnostics.lastTriggeredAt
        ? new Date(diagnostics.lastTriggeredAt).toLocaleTimeString()
        : '无',
    ],
    ['订阅数', String(diagnostics.subscriptionCount)],
  ];
  return (
    <Screen title="设备诊断" subtitle="仅开发环境使用；离开页面会立即取消监听。">
      <Card>
        <View style={styles.rows}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={[theme.typography.label, { color: theme.colors.ink }]}>{label}</Text>
              <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={[theme.typography.label, { color: theme.colors.ink }]}>错误日志</Text>
        {(diagnostics.errorLog.length === 0 ? ['无'] : diagnostics.errorLog).map((entry, index) => (
          <Text
            key={`${entry}-${index}`}
            style={[theme.typography.caption, { color: theme.colors.muted }]}
          >
            {entry}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 10 },
  row: { gap: 2 },
});

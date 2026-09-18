import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';

import type { AppPreferences } from '@/application/page';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { Button, Card, ConfirmDialog, OfflineBanner, Screen, Tag } from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

function SettingSwitch({
  label,
  detail,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.settingRow}>
      <View style={styles.flex}>
        <Text style={[theme.typography.label, { color: theme.colors.ink }]}>{label}</Text>
        <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.accentSoft }}
        thumbColor={value ? theme.colors.accent : theme.colors.subtle}
      />
    </View>
  );
}

function ChoiceSetting<Value extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly (readonly [Value, string])[];
  onChange: (value: Value) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[theme.typography.label, { color: theme.colors.ink }]}>{label}</Text>
      <View style={styles.choices}>
        {options.map(([id, optionLabel]) => (
          <Pressable
            key={String(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === id }}
            onPress={() => onChange(id)}
          >
            <Tag label={optionLabel} tone={value === id ? 'accent' : 'neutral'} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const save = (patch: Partial<AppPreferences>) =>
    void runtime.savePreferences({ ...runtime.preferences, ...patch });
  const exportData = async () => {
    const data = await runtime.exportHistory();
    await Share.share({ title: '六爻历史导出', message: data });
  };
  return (
    <Screen title="设置" subtitle="显示偏好和本地数据管理。">
      <OfflineBanner />
      <Card>
        <ChoiceSetting
          label="外观"
          value={runtime.preferences.theme}
          options={[
            ['system', '跟随系统'],
            ['light', '浅色'],
            ['dark', '深色'],
          ]}
          onChange={(themeValue) => save({ theme: themeValue })}
        />
        <ChoiceSetting
          label="字体大小"
          value={runtime.preferences.fontSize}
          options={[
            ['standard', '标准'],
            ['large', '大'],
            ['extra-large', '特大'],
          ]}
          onChange={(fontSize) => save({ fontSize })}
        />
        <ChoiceSetting
          label="动画强度"
          value={runtime.preferences.animationIntensity}
          options={[
            ['reduced', '减弱'],
            ['standard', '标准'],
            ['enhanced', '增强'],
          ]}
          onChange={(animationIntensity) => save({ animationIntensity })}
        />
        <ChoiceSetting
          label="默认模式"
          value={runtime.preferences.defaultMode}
          options={[
            ['simple', '简易'],
            ['professional', '专业'],
          ]}
          onChange={(defaultMode) => save({ defaultMode })}
        />
      </Card>
      <Card>
        <SettingSwitch
          label="音效"
          detail="当前仅保存偏好，音频 adapter 尚未接入。"
          value={runtime.preferences.sound}
          onChange={(sound) => save({ sound })}
        />
        <SettingSwitch
          label="触觉反馈"
          detail="起爻成功与第六爻完成时反馈；不支持的设备会静默降级。"
          value={runtime.preferences.haptics}
          onChange={(haptics) => save({ haptics })}
        />
        <SettingSwitch
          label="减少触觉"
          detail="关闭候选摇动等轻触觉，只保留必要的完成反馈。"
          disabled={!runtime.preferences.haptics}
          value={runtime.preferences.reducedHaptics}
          onChange={(reducedHaptics) => save({ reducedHaptics })}
        />
        <SettingSwitch
          label="摇一摇"
          detail="仅识别完整摇动；传感器不可用时按钮起爻仍可用。"
          value={runtime.preferences.shake}
          onChange={(shake) => save({ shake })}
        />
      </Card>
      <Card>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.ink }]}
        >
          数据
        </Text>
        <Button label="导出历史 JSON" tone="secondary" onPress={() => void exportData()} />
        <Button label="清除全部历史" tone="danger" onPress={() => setConfirmClear(true)} />
        <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
          导出包含问题、六组三枚铜钱、版本和全部快照；分享前请检查敏感内容。
        </Text>
      </Card>
      <Card>
        <Text
          accessibilityRole="header"
          style={[theme.typography.heading, { color: theme.colors.ink }]}
        >
          版本
        </Text>
        <Text style={[theme.typography.body, { color: theme.colors.muted }]}>
          App 0.1.0 · SQLite Schema 005{`\n`}起卦规则 divination-input-v1-draft{`\n`}内容
          hexagram-mapping-2026-07-20-v1
        </Text>
      </Card>
      <Button
        label="关于、隐私与风险声明"
        tone="secondary"
        onPress={() => router.push(APP_ROUTES.about)}
      />
      {__DEV__ && (
        <Button
          label="设备诊断（开发）"
          tone="secondary"
          onPress={() => router.push(APP_ROUTES.deviceDiagnostics)}
        />
      )}
      {notice && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.success }]}
        >
          {notice}
        </Text>
      )}
      <ConfirmDialog
        visible={confirmClear}
        title="清除全部历史？"
        message="这会删除所有已锁定会话、原始铜钱和分析快照；当前未完成草稿不受影响。此操作无法恢复。"
        confirmLabel="全部清除"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void runtime.clearHistory().then((count) => setNotice(`已清除 ${count} 条本地历史。`));
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  flex: { flex: 1, gap: 3 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

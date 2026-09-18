import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/shared/theme/AppThemeProvider';

export function Screen({
  children,
  scroll = true,
  title,
  subtitle,
  action,
}: PropsWithChildren<{
  scroll?: boolean;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}>) {
  const theme = useAppTheme();
  const content = (
    <View style={[styles.screenContent, { padding: theme.spacing.lg }]}>
      {(title !== undefined || action !== undefined) && (
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            {title !== undefined && (
              <Text
                accessibilityRole="header"
                style={[
                  theme.typography.title,
                  {
                    color: theme.colors.ink,
                    fontSize: theme.typography.title.fontSize * theme.fontScale,
                  },
                ]}
              >
                {title}
              </Text>
            )}
            {subtitle !== undefined && (
              <Text
                style={[
                  theme.typography.body,
                  {
                    color: theme.colors.muted,
                    fontSize: theme.typography.body.fontSize * theme.fontScale,
                  },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
  if (!scroll) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>{content}</View>
    );
  }
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

export function Card({
  children,
  style,
  accessibilityLabel,
}: PropsWithChildren<{ style?: ViewStyle; accessibilityLabel?: string }>) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.card,
        {
          padding: theme.spacing.md,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  label,
  tone = 'primary',
  busy = false,
  ...props
}: Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  busy?: boolean;
}) {
  const theme = useAppTheme();
  const background =
    tone === 'primary'
      ? theme.colors.accent
      : tone === 'danger'
        ? theme.colors.danger
        : tone === 'secondary'
          ? theme.colors.surfaceRaised
          : 'transparent';
  const color =
    tone === 'primary'
      ? theme.colors.onAccent
      : tone === 'danger'
        ? theme.colors.onDanger
        : theme.colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled || busy, busy }}
      {...props}
      disabled={props.disabled || busy}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: 48,
          borderRadius: theme.radius.pill,
          borderColor: tone === 'primary' || tone === 'danger' ? background : theme.colors.border,
          backgroundColor: pressed && tone === 'primary' ? theme.colors.accentPressed : background,
          opacity: props.disabled || busy ? 0.5 : 1,
        },
      ]}
    >
      {busy && <ActivityIndicator color={color} size="small" />}
      <Text style={[theme.typography.label, { color, fontSize: 14 * theme.fontScale }]}>
        {busy ? '处理中…' : label}
      </Text>
    </Pressable>
  );
}

export function Tag({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
}) {
  const theme = useAppTheme();
  const palette =
    tone === 'accent'
      ? [theme.colors.accentSoft, theme.colors.accent]
      : tone === 'success'
        ? [theme.colors.successSoft, theme.colors.success]
        : tone === 'warning'
          ? [theme.colors.warningSoft, theme.colors.warning]
          : [theme.colors.surfaceRaised, theme.colors.muted];
  return (
    <View style={[styles.tag, { backgroundColor: palette[0], borderRadius: theme.radius.pill }]}>
      <Text style={[theme.typography.caption, { color: palette[1] }]}>{label}</Text>
    </View>
  );
}

export function OfflineBanner() {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel="离线状态：核心功能可用"
      style={[styles.offline, { backgroundColor: theme.colors.successSoft }]}
    >
      <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
      <Text style={[theme.typography.caption, { color: theme.colors.success }]}>离线可用</Text>
    </View>
  );
}

export function StateView({
  kind,
  title,
  message,
  action,
}: {
  kind: 'loading' | 'empty' | 'error' | 'offline';
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  const symbol =
    kind === 'loading' ? '◌' : kind === 'error' ? '！' : kind === 'offline' ? '◍' : '○';
  return (
    <View accessibilityRole={kind === 'error' ? 'alert' : undefined} style={styles.state}>
      {kind === 'loading' ? (
        <ActivityIndicator color={theme.colors.accent} size="large" />
      ) : (
        <Text style={[styles.stateSymbol, { color: theme.colors.accent }]}>{symbol}</Text>
      )}
      <Text
        accessibilityRole="header"
        style={[theme.typography.heading, { color: theme.colors.ink }]}
      >
        {title}
      </Text>
      <Text style={[theme.typography.body, styles.center, { color: theme.colors.muted }]}>
        {message}
      </Text>
      {action}
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = '确认',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: theme.colors.scrim }]}>
        <View
          accessibilityRole="alert"
          style={[
            styles.dialog,
            { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.lg },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[theme.typography.heading, { color: theme.colors.ink }]}
          >
            {title}
          </Text>
          <Text style={[theme.typography.body, { color: theme.colors.muted }]}>{message}</Text>
          <View style={styles.dialogActions}>
            <Button label="取消" tone="ghost" onPress={onCancel} />
            <Button
              label={confirmLabel}
              tone={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  screenContent: {
    width: '100%',
    maxWidth: 760,
    boxSizing: 'border-box',
    alignSelf: 'center',
    gap: 16,
    paddingBottom: 48,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleCopy: { flex: 1, gap: 6 },
  card: { borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  state: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 28,
  },
  stateSymbol: { fontSize: 38, fontWeight: '300' },
  center: { textAlign: 'center', maxWidth: 460 },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 440, padding: 22, gap: 16 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
});

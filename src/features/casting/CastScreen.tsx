import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { createCastScreenProjection } from '@/application/page';
import type { LinePosition } from '@/domain/casting';
import { useCoinRevealAnimation, useReducedMotion, useShakeToCast } from '@/features/device';
import { useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { APP_ROUTES } from '@/features/navigation/routes';
import { ExpoHapticFeedback } from '@/infrastructure/haptics';
import { ExpoAccelerometerSensor } from '@/infrastructure/sensors';
import {
  Button,
  Card,
  ConfirmDialog,
  HexagramLine,
  Screen,
  StateView,
  Tag,
} from '@/shared/components';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

const TOP_DOWN_POSITIONS = [6, 5, 4, 3, 2, 1] as const satisfies readonly LinePosition[];

export function CastScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  const interactionLock = useRef(false);
  const [animating, setAnimating] = useState(false);
  const [confirm, setConfirm] = useState<'reset' | 'exit' | null>(null);
  const session = runtime.activeSession?.sessionId === sessionId ? runtime.activeSession : null;
  const [revealedLineCount, setRevealedLineCount] = useState(session?.lines.length ?? 0);
  const sensor = useMemo(() => new ExpoAccelerometerSensor(), []);
  const haptics = useMemo(() => new ExpoHapticFeedback(), []);
  const systemReducedMotion = useReducedMotion();
  const { progress: coinProgress, play: playCoinReveal } = useCoinRevealAnimation();

  const cast = async () => {
    if (session === null || interactionLock.current || session.status === 'complete') return;
    interactionLock.current = true;
    try {
      // The application service saves the independently randomised coins before this visual reveal.
      const next = await runtime.castNext(session.sessionId);
      setAnimating(true);
      const durationMs =
        systemReducedMotion || runtime.preferences.animationIntensity === 'reduced'
          ? 0
          : runtime.preferences.animationIntensity === 'enhanced'
            ? 850
            : 560;
      await playCoinReveal(durationMs);
      setRevealedLineCount(next.lines.length);
      if (runtime.preferences.haptics && !runtime.preferences.reducedHaptics) {
        await haptics
          .trigger(next.status === 'complete' ? 'session-complete' : 'cast-success')
          .catch(() => undefined);
      }
    } catch {
      if (runtime.preferences.haptics && !runtime.preferences.reducedHaptics) {
        void haptics.trigger('error').catch(() => undefined);
      }
      // The runtime exposes a user-safe error while the use case protects persisted state.
    } finally {
      interactionLock.current = false;
      setAnimating(false);
    }
  };

  const { diagnostics: shakeDiagnostics, requestAccess } = useShakeToCast({
    sensor,
    haptics,
    enabled: session !== null && runtime.preferences.shake,
    sessionComplete: session === null || session.status === 'complete',
    blocked: animating || runtime.actionBusy,
    onValidShake: cast,
    hapticsEnabled: runtime.preferences.haptics,
    reducedHaptics: runtime.preferences.reducedHaptics,
  });

  if (session === null) {
    const history = runtime.history.some((item) => item.sessionId === sessionId);
    return (
      <Screen>
        <StateView
          kind={history ? 'empty' : 'error'}
          title={history ? '此会话已锁定' : '找不到起卦会话'}
          message={
            history
              ? '锁定后的原始记录不可修改，请前往结果页查看。'
              : '链接可能已失效，或草稿已被删除。'
          }
          action={
            <Button
              label={history ? '查看结果' : '返回首页'}
              onPress={() =>
                router.replace(history ? APP_ROUTES.result(sessionId) : APP_ROUTES.home)
              }
            />
          }
        />
      </Screen>
    );
  }

  const projection = createCastScreenProjection(session);
  const lastLine = session.lines.at(-1);
  const displayedLine =
    Math.min(revealedLineCount, session.lines.length) >= session.lines.length
      ? lastLine
      : revealedLineCount === 0
        ? undefined
        : session.lines[revealedLineCount - 1];
  const coinRotation = coinProgress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '180deg', '360deg'],
  });

  const lock = async () => {
    if (interactionLock.current) return;
    interactionLock.current = true;
    try {
      await runtime.lockAndSave(session.sessionId);
      router.replace(APP_ROUTES.result(session.sessionId));
    } catch {
      interactionLock.current = false;
    }
  };

  return (
    <Screen title="点击起卦" subtitle="第一次起爻是最下方的初爻；画面按传统习惯从上往下展示。">
      <View style={styles.topRow}>
        <Tag
          label={projection.progressLabel}
          tone={session.status === 'complete' ? 'success' : 'accent'}
        />
        <Text style={[theme.typography.caption, { color: theme.colors.subtle }]}>
          会话 {session.sessionId.slice(0, 8)}
        </Text>
      </View>

      <Card accessibilityLabel="六爻起卦进度">
        <View style={styles.lines}>
          {TOP_DOWN_POSITIONS.map((position) => {
            const line = session.lines.find((item) => item.position === position);
            return line === undefined ? (
              <View
                key={position}
                accessibilityLabel={`第 ${position} 爻尚未起`}
                style={styles.emptyLineRow}
              >
                <Text
                  style={[
                    theme.typography.caption,
                    styles.position,
                    { color: theme.colors.subtle },
                  ]}
                >
                  {position === 1 ? '初爻' : position === 6 ? '上爻' : `${position} 爻`}
                </Text>
                <View style={[styles.emptyLine, { borderColor: theme.colors.border }]} />
              </View>
            ) : (
              <HexagramLine
                key={position}
                position={position}
                polarity={line.polarity}
                moving={line.movement === 'moving'}
              />
            );
          })}
        </View>
      </Card>

      <Card style={{ backgroundColor: theme.colors.goldSoft }}>
        <Text style={[theme.typography.label, { color: theme.colors.gold }]}>三枚铜钱</Text>
        <View
          accessibilityLabel={
            displayedLine ? `最近铜钱结果：${displayedLine.coins.join('、')}` : '尚未起爻'
          }
          style={styles.coins}
        >
          {(displayedLine?.coins ?? [null, null, null]).map((coin, index) => (
            <Animated.View
              key={index}
              style={[
                styles.coin,
                {
                  borderColor: theme.colors.gold,
                  backgroundColor: theme.colors.surfaceRaised,
                  transform: [{ rotateY: coinRotation }],
                },
              ]}
            >
              <Text style={[styles.coinText, { color: theme.colors.gold }]}>
                {animating ? '·' : (coin ?? '空')}
              </Text>
            </Animated.View>
          ))}
        </View>
        <Text
          style={[theme.typography.caption, { color: theme.colors.muted, textAlign: 'center' }]}
        >
          {displayedLine
            ? `合计 ${displayedLine.value} · ${displayedLine.movement === 'moving' ? '动爻' : '静爻'}`
            : '点击后由安全随机源独立生成三枚 2/3 铜钱值'}
        </Text>
      </Card>

      {runtime.preferences.shake && (
        <Card style={{ backgroundColor: theme.colors.surfaceRaised }}>
          <Text style={[theme.typography.label, { color: theme.colors.ink }]}>摇一摇</Text>
          <Text style={[theme.typography.caption, { color: theme.colors.muted }]}>
            {shakeDiagnostics.availability === 'ready'
              ? '已开启：完整摇动才会起爻，按钮始终可用。'
              : shakeDiagnostics.availability === 'permission-required'
                ? '需要运动访问权限；授权后才会监听。'
                : shakeDiagnostics.availability === 'denied'
                  ? '设备未授予运动访问权限；可继续使用按钮起爻。'
                  : '当前设备不支持传感器；可继续使用按钮起爻。'}
          </Text>
          {shakeDiagnostics.availability === 'permission-required' && (
            <Button
              label="授予运动访问权限"
              tone="secondary"
              onPress={() => void requestAccess()}
            />
          )}
        </Card>
      )}

      {runtime.actionError && (
        <Text
          accessibilityRole="alert"
          style={[theme.typography.body, { color: theme.colors.danger }]}
        >
          {runtime.actionError}
        </Text>
      )}

      {session.status === 'complete' ? (
        <>
          <Card style={{ backgroundColor: theme.colors.successSoft }}>
            <Text style={[theme.typography.heading, { color: theme.colors.success }]}>
              六爻已完成
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.ink }]}>
              完成状态只读。确认锁定后将生成不可覆盖的历史结构快照。
            </Text>
          </Card>
          <Button label="锁定并查看结果" busy={runtime.actionBusy} onPress={() => void lock()} />
        </>
      ) : (
        <Button
          label={`起第 ${projection.nextPosition ?? 6} 爻`}
          accessibilityHint="只触发统一 castNextLine 用例，动画不会决定结果"
          busy={animating || runtime.actionBusy}
          onPress={() => void cast()}
        />
      )}

      <View style={styles.actions}>
        <Button
          label="撤销上一爻"
          tone="secondary"
          disabled={session.lines.length === 0 || session.status === 'complete'}
          onPress={() => {
            setRevealedLineCount(Math.max(0, session.lines.length - 1));
            void runtime.undo(session.sessionId);
          }}
        />
        <Button
          label="恢复撤销"
          tone="secondary"
          disabled={session.redoLines.length === 0 || session.status === 'complete'}
          onPress={() => void runtime.redo(session.sessionId)}
        />
      </View>
      <View style={styles.actions}>
        <Button
          label="重新开始"
          tone="ghost"
          disabled={session.lines.length === 0 || session.status === 'complete'}
          onPress={() => setConfirm('reset')}
        />
        <Button label="退出并保存" tone="ghost" onPress={() => setConfirm('exit')} />
      </View>

      <ConfirmDialog
        visible={confirm === 'reset'}
        title="重新开始本次起卦？"
        message="这会清空当前尚未锁定的爻；已锁定历史不受影响。"
        confirmLabel="清空重来"
        destructive
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          setRevealedLineCount(0);
          void runtime.reset(session.sessionId);
        }}
      />
      <ConfirmDialog
        visible={confirm === 'exit'}
        title="保存草稿并退出？"
        message="已完成的铜钱原值会保存在本机，下次可从首页继续，不会重新随机。"
        confirmLabel="保存并退出"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          router.replace(APP_ROUTES.home);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  lines: { gap: 7, alignItems: 'center', paddingVertical: 6 },
  emptyLineRow: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 12 },
  position: { width: 38, textAlign: 'right' },
  emptyLine: { width: 132, height: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 2 },
  coins: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 8 },
  coin: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { fontSize: 22, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10 },
});

import type { ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appLogger, type Logger } from '@/shared/logging/logger';
import { theme } from '@/shared/theme/theme';

type AppErrorBoundaryProps = PropsWithChildren<{
  logger?: Logger;
}>;

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public override state: AppErrorBoundaryState = { error: null };

  public static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    (this.props.logger ?? appLogger).error('Unhandled render error', error, {
      componentStack: info.componentStack,
    });
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  public override render() {
    if (this.state.error === null) {
      return this.props.children;
    }

    return (
      <View accessibilityRole="alert" style={styles.container}>
        <Text style={styles.title}>页面暂时无法显示</Text>
        <Text style={styles.message}>错误已记录。你可以重试，原始起卦数据不会因此被改写。</Text>
        <Pressable accessibilityRole="button" onPress={this.reset} style={styles.button}>
          <Text style={styles.buttonText}>重试</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: '700',
  },
  message: {
    maxWidth: 480,
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: theme.colors.onDanger,
    fontWeight: '700',
  },
});

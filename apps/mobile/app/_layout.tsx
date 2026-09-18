import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders, useAppRuntime } from '@/features/app/AppRuntimeProvider';
import { Screen, StateView } from '@/shared/components';
import { AppErrorBoundary } from '@/shared/errors/AppErrorBoundary';
import { useAppTheme } from '@/shared/theme/AppThemeProvider';

function RootNavigator() {
  const runtime = useAppRuntime();
  const theme = useAppTheme();
  if (runtime.status === 'loading') {
    return (
      <Screen scroll={false}>
        <StateView
          kind="loading"
          title="正在准备离线数据"
          message="检查数据库迁移、内容版本和未完成会话。"
        />
      </Screen>
    );
  }
  if (runtime.status === 'error') {
    return (
      <Screen scroll={false}>
        <StateView
          kind="error"
          title="应用初始化失败"
          message={runtime.bootError ?? '无法打开本地数据库。'}
        />
      </Screen>
    );
  }
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
    </AppErrorBoundary>
  );
}

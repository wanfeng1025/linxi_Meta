import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useAppTheme } from '@/shared/theme/AppThemeProvider';

const icons = { index: '☯', history: '册', knowledge: '卷', settings: '设' } as const;

export default function TabsLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceRaised,
          borderTopColor: theme.colors.border,
          minHeight: 62,
          paddingTop: 5,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 19 }}>
            {icons[route.name as keyof typeof icons] ?? '·'}
          </Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: '首页' }} />
      <Tabs.Screen name="history" options={{ title: '历史' }} />
      <Tabs.Screen name="knowledge" options={{ title: '知识' }} />
      <Tabs.Screen name="settings" options={{ title: '设置' }} />
    </Tabs>
  );
}

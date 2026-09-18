import { createContext, type PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { createTheme, type AppTheme } from './theme';

type ThemePreference = 'system' | 'light' | 'dark';
type FontPreference = 'standard' | 'large' | 'extra-large';

const ThemeContext = createContext<AppTheme>(createTheme(false));

export function AppThemeProvider({
  children,
  preference,
  fontSize,
}: PropsWithChildren<{ preference: ThemePreference; fontSize: FontPreference }>) {
  const system = useColorScheme();
  const dark = preference === 'system' ? system === 'dark' : preference === 'dark';
  const fontScale = fontSize === 'extra-large' ? 1.28 : fontSize === 'large' ? 1.14 : 1;
  const value = useMemo(() => createTheme(dark, fontScale), [dark, fontScale]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): AppTheme {
  return useContext(ThemeContext);
}

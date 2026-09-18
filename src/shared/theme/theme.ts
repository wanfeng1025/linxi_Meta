export const spacing = Object.freeze({
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
});

export const radius = Object.freeze({
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
});

export const typography = Object.freeze({
  display: Object.freeze({ fontSize: 38, lineHeight: 48, fontWeight: '700' as const }),
  title: Object.freeze({ fontSize: 26, lineHeight: 34, fontWeight: '700' as const }),
  heading: Object.freeze({ fontSize: 19, lineHeight: 27, fontWeight: '700' as const }),
  body: Object.freeze({ fontSize: 16, lineHeight: 25, fontWeight: '400' as const }),
  label: Object.freeze({ fontSize: 14, lineHeight: 20, fontWeight: '600' as const }),
  caption: Object.freeze({ fontSize: 12, lineHeight: 18, fontWeight: '500' as const }),
});

const lightColors = Object.freeze({
  background: '#F7F2E8',
  surface: '#FFFDF8',
  surfaceRaised: '#FFFFFF',
  ink: '#211D18',
  muted: '#635C52',
  subtle: '#8B8276',
  border: '#D8CDBD',
  accent: '#9D2E24',
  accentPressed: '#782018',
  accentSoft: '#F1DDD5',
  gold: '#8A6422',
  goldSoft: '#EEE2C8',
  success: '#356447',
  successSoft: '#DDEBDF',
  warning: '#8A561C',
  warningSoft: '#F3E3C6',
  danger: '#A12622',
  dangerSoft: '#F4D8D5',
  onAccent: '#FFFFFF',
  onDanger: '#FFFFFF',
  scrim: 'rgba(24, 19, 14, 0.54)',
});

const darkColors = Object.freeze({
  background: '#151310',
  surface: '#201D19',
  surfaceRaised: '#29251F',
  ink: '#F7F0E4',
  muted: '#C6BBAA',
  subtle: '#9C9181',
  border: '#51493E',
  accent: '#E17A66',
  accentPressed: '#F09A88',
  accentSoft: '#442722',
  gold: '#D9B66C',
  goldSoft: '#3E3421',
  success: '#8FC19C',
  successSoft: '#20382A',
  warning: '#E2B16C',
  warningSoft: '#42311D',
  danger: '#F08A7E',
  dangerSoft: '#452321',
  onAccent: '#1D120F',
  onDanger: '#210E0D',
  scrim: 'rgba(0, 0, 0, 0.7)',
});

export function createTheme(dark: boolean, fontScale = 1) {
  return Object.freeze({
    dark,
    colors: dark ? darkColors : lightColors,
    spacing,
    radius,
    typography,
    fontScale,
  });
}

export const theme = createTheme(false);
export type AppTheme = ReturnType<typeof createTheme>;

import { Platform } from 'react-native';

export const ACLTheme = {
  colors: {
    background: '#090b10',
    surface: '#11161f',
    surfaceMuted: '#1a2130',
    primary: '#2f8cff',
    primarySoft: '#1d2d4d',
    accent: '#62f5ac',
    safe: '#62f5ac',
    warning: '#3cd3c0',
    high: '#4f7cff',
    text: '#eef3ff',
    textMuted: '#98a3bc',
    border: '#273043',
    tabBar: '#0d121a',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
  },
  fonts: {
    title: Platform.select({
      ios: 'Avenir Next Condensed',
      android: 'sans-serif-condensed',
      default: 'system-ui',
    }),
    body: Platform.select({
      ios: 'System',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
} as const;

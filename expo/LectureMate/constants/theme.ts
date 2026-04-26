import { usePreferences } from '../contexts/PreferencesContext';

// iOS Sistem Renkleri (Apple Human Interface Guidelines, iOS 17+)

const lightColors = {
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',

  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.6)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.3)',
  quaternaryLabel: 'rgba(60, 60, 67, 0.18)',

  systemFill: 'rgba(120, 120, 128, 0.2)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.16)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.12)',
  quaternarySystemFill: 'rgba(116, 116, 128, 0.08)',

  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',

  systemBlue: '#007AFF',
  systemRed: '#FF3B30',
  systemGreen: '#34C759',
  systemOrange: '#FF9500',
  systemYellow: '#FFCC00',
  systemPink: '#FF2D55',
  systemPurple: '#AF52DE',
  systemTeal: '#30B0C7',
  systemIndigo: '#5856D6',
  systemMint: '#00C7BE',
  systemCyan: '#32ADE6',
  systemBrown: '#A2845E',
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',
};

// Standart koyu mod
const darkColors = {
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  systemGroupedBackground: '#000000',
  secondarySystemGroupedBackground: '#1C1C1E',
  tertiarySystemGroupedBackground: '#2C2C2E',

  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.6)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.3)',
  quaternaryLabel: 'rgba(235, 235, 245, 0.18)',

  systemFill: 'rgba(120, 120, 128, 0.36)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.32)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
  quaternarySystemFill: 'rgba(116, 116, 128, 0.18)',

  separator: 'rgba(84, 84, 88, 0.6)',
  opaqueSeparator: '#38383A',

  systemBlue: '#0A84FF',
  systemRed: '#FF453A',
  systemGreen: '#30D158',
  systemOrange: '#FF9F0A',
  systemYellow: '#FFD60A',
  systemPink: '#FF375F',
  systemPurple: '#BF5AF2',
  systemTeal: '#40CBE0',
  systemIndigo: '#5E5CE6',
  systemMint: '#63E6E2',
  systemCyan: '#64D2FF',
  systemBrown: '#AC8E68',
  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',
};

// OLED modu — saf siyah arka planlar (pil tasarrufu)
const oledColors = {
  ...darkColors,
  systemBackground: '#000000',
  secondarySystemBackground: '#000000',
  tertiarySystemBackground: '#0A0A0A',
  systemGroupedBackground: '#000000',
  secondarySystemGroupedBackground: '#0A0A0A',
  tertiarySystemGroupedBackground: '#000000',
  systemGray6: '#0A0A0A',
  systemGray5: '#141414',
};

export type ThemeColors = typeof lightColors;

export function useTheme() {
  const { effectiveScheme, oledMode } = usePreferences();
  const isDark = effectiveScheme === 'dark';
  const colors = isDark ? (oledMode ? oledColors : darkColors) : lightColors;
  return { colors, isDark, isOled: isDark && oledMode };
}

// Apple Human Interface Guidelines tipografi
export const Typography = {
  largeTitle: { fontSize: 34, fontWeight: '700' as const, letterSpacing: 0.37 },
  title1: { fontSize: 28, fontWeight: '700' as const, letterSpacing: 0.36 },
  title2: { fontSize: 22, fontWeight: '700' as const, letterSpacing: 0.35 },
  title3: { fontSize: 20, fontWeight: '600' as const, letterSpacing: 0.38 },
  headline: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.41 },
  body: { fontSize: 17, fontWeight: '400' as const, letterSpacing: -0.41 },
  callout: { fontSize: 16, fontWeight: '400' as const, letterSpacing: -0.32 },
  subheadline: { fontSize: 15, fontWeight: '400' as const, letterSpacing: -0.24 },
  footnote: { fontSize: 13, fontWeight: '400' as const, letterSpacing: -0.08 },
  caption1: { fontSize: 12, fontWeight: '400' as const, letterSpacing: 0 },
  caption2: { fontSize: 11, fontWeight: '400' as const, letterSpacing: 0.07 },
};

// Apple 8pt grid
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

// iOS Continuous Corner radius
export const Radii = {
  sm: 8,
  md: 10,
  base: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  full: 9999,
};

// Ders renk paleti — iOS sistem renkleri
export const ClassColorsiOS = [
  '#007AFF', '#5856D6', '#FF3B30', '#34C759',
  '#FFCC00', '#FF9500', '#30B0C7', '#AF52DE',
  '#FF2D55', '#5AC8FA', '#00C7BE', '#A2845E',
];

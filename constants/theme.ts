import { Platform } from 'react-native';

// Brand Colors — coral/salmon primary, mint/seafoam secondary
export const BrandColors = {
  accent: '#E8856C',
  accentDark: '#D4736A',
  accentLight: '#F4A68C',
  accentMuted: 'rgba(232, 133, 108, 0.15)',
  accentSoft: 'rgba(232, 133, 108, 0.08)',
  secondary: '#7BBFB8',
  secondaryLight: '#A5D9D0',
  secondaryMuted: 'rgba(123, 191, 184, 0.15)',
  // keep "orange" alias so old refs don't break
  orange: '#E8856C',
  orangeLight: '#F4A68C',
  orangeDark: '#D4736A',
};

// Status Colors
export const StatusColors = {
  green: '#7BBFB8',
  yellow: '#F4C68C',
  red: '#E88B8B',
  blue: '#7BBFB8',
  orange: '#E8A96C',
};

const tintColorLight = BrandColors.accent;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#2D3436',
    background: '#FFFDFB',
    tint: tintColorLight,
    icon: '#636E72',
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: 'rgba(0, 0, 0, 0.06)',
    textSecondary: '#636E72',
    textTertiary: '#95A5A6',
    accent: BrandColors.accent,
    accentLight: BrandColors.accentLight,
    buttonBackground: '#2D3436',
    buttonText: '#FFFFFF',
    separator: 'rgba(0, 0, 0, 0.08)',
    inputBackground: '#FFFFFF',
    inputBorder: 'rgba(0, 0, 0, 0.08)',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    surface: '#1C1C1E',
    card: '#1C1C1E',
    cardBorder: '#2C2C2E',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    accent: BrandColors.accent,
    accentLight: BrandColors.accentDark,
    buttonBackground: '#FFFFFF',
    buttonText: '#000000',
    separator: '#2C2C2E',
    inputBackground: '#2C2C2E',
    inputBorder: '#3A3A3C',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  hero: {
    fontSize: 38,
    fontWeight: '700' as const,
    lineHeight: 46,
  },
  h1: {
    fontSize: 32,
    fontWeight: '600' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  metric: {
    fontSize: 36,
    fontWeight: '700' as const,
    lineHeight: 42,
  },
  metricUnit: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
};

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  soft: {
    shadowColor: '#2D3436',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  glow: {
    shadowColor: BrandColors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

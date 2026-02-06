import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Typography, BrandColors } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'hero'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'body'
    | 'bodyBold'
    | 'caption'
    | 'small'
    | 'metric'
    | 'metricUnit';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        styles[type] ?? styles.default,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: BrandColors.orange,
  },
  hero: Typography.hero,
  h1: Typography.h1,
  h2: Typography.h2,
  h3: Typography.h3,
  body: Typography.body,
  bodyBold: Typography.bodyBold,
  caption: Typography.caption,
  small: Typography.small,
  metric: Typography.metric,
  metricUnit: Typography.metricUnit,
});

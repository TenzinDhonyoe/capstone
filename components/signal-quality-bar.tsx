import { StyleSheet, View, Text } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { StatusColors, BorderRadius, Spacing, Typography } from '@/constants/theme';

interface SignalQualityBarProps {
  quality: number; // 0-100
}

function getQualityConfig(quality: number) {
  if (quality >= 80) return { color: StatusColors.green, label: 'Excellent' };
  if (quality >= 60) return { color: StatusColors.blue, label: 'Good' };
  if (quality >= 40) return { color: StatusColors.yellow, label: 'Fair' };
  return { color: StatusColors.red, label: 'Poor' };
}

export function SignalQualityBar({ quality }: SignalQualityBarProps) {
  const config = getQualityConfig(quality);
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');
  const secondaryText = useThemeColor({}, 'textSecondary');

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: secondaryText }]}>Signal Quality</Text>
        <Text style={[styles.qualityLabel, { color: config.color }]}>{config.label}</Text>
      </View>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            { width: `${quality}%`, backgroundColor: config.color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
  },
  qualityLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  barBackground: {
    height: 6,
    backgroundColor: '#E5E5EA',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});

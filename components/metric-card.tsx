import { StyleSheet, View, Text } from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';
import { StatusBadge } from '@/components/ui/status-badge';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'optimal' | 'normal' | 'warning' | 'critical';
  compact?: boolean;
}

export function MetricCard({
  title,
  value,
  unit,
  trend,
  status,
  compact = false,
}: MetricCardProps) {
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const trendIcons = { up: '\u2191', down: '\u2193', stable: '\u2192' };

  return (
    <View
      style={[
        styles.card,
        Shadows.card,
        compact && styles.cardCompact,
        { backgroundColor: cardBg, borderColor: cardBorder },
      ]}
    >
      <Text style={[styles.title, { color: secondaryText }]}>{title}</Text>
      <View style={styles.valueRow}>
        <Text style={[compact ? styles.valueCompact : styles.value, { color: textColor }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.unit, { color: secondaryText }]}>{unit}</Text>
        )}
        {trend && (
          <Text style={[styles.trend, { color: secondaryText }]}>
            {trendIcons[trend]}
          </Text>
        )}
      </View>
      {status && <StatusBadge status={status} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minWidth: 140,
    gap: Spacing.xs,
  },
  cardCompact: {
    minWidth: 100,
    padding: Spacing.sm + 2,
  },
  title: {
    ...Typography.caption,
    fontWeight: '500',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  value: {
    ...Typography.metric,
  },
  valueCompact: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
  },
  unit: {
    ...Typography.metricUnit,
  },
  trend: {
    fontSize: 16,
    fontWeight: '600',
  },
});

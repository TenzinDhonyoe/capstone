import { StyleSheet, View, Text } from 'react-native';
import { StatusColors, Spacing, Typography, BorderRadius } from '@/constants/theme';

type BadgeStatus = 'optimal' | 'normal' | 'warning' | 'critical';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

const statusConfig: Record<BadgeStatus, { color: string; bg: string; text: string }> = {
  optimal: { color: '#7BBFB8', bg: 'rgba(123, 191, 184, 0.15)', text: 'Optimal' },
  normal: { color: '#7BBFB8', bg: 'rgba(123, 191, 184, 0.15)', text: 'Normal' },
  warning: { color: '#D4956A', bg: 'rgba(244, 198, 140, 0.2)', text: 'Warning' },
  critical: { color: '#E88B8B', bg: 'rgba(232, 139, 139, 0.15)', text: 'Critical' },
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.text, { color: config.color }]}>
        {label ?? config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    ...Typography.small,
    fontWeight: '600',
  },
});

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';
import { StatusBadge } from '@/components/ui/status-badge';

interface RecordingCardProps {
  date: string;
  time: string;
  bpm: number;
  duration: string;
  condition: string;
  status: 'optimal' | 'normal' | 'warning' | 'critical';
  onPress?: () => void;
}

export function RecordingCard({
  date,
  time,
  bpm,
  duration,
  condition,
  status,
  onPress,
}: RecordingCardProps) {
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const tertiaryText = useThemeColor({}, 'textTertiary');

  return (
    <TouchableOpacity
      style={[styles.card, Shadows.card, { backgroundColor: cardBg, borderColor: cardBorder }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftSection}>
        <View style={styles.dateRow}>
          <Text style={[styles.date, { color: textColor }]}>{date}</Text>
          <Text style={[styles.time, { color: secondaryText }]}>{time}</Text>
        </View>
        <View style={styles.metricsRow}>
          <Text style={[styles.bpm, { color: textColor }]}>
            {bpm} <Text style={[styles.bpmUnit, { color: secondaryText }]}>BPM</Text>
          </Text>
          <Text style={[styles.duration, { color: tertiaryText }]}>{duration}</Text>
        </View>
        <View style={styles.conditionRow}>
          <StatusBadge status={status} label={condition} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={tertiaryText} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  leftSection: {
    flex: 1,
    gap: Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  date: {
    ...Typography.bodyBold,
  },
  time: {
    ...Typography.caption,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bpm: {
    fontSize: 18,
    fontWeight: '700',
  },
  bpmUnit: {
    ...Typography.caption,
    fontWeight: '400',
  },
  duration: {
    ...Typography.caption,
  },
  conditionRow: {
    marginTop: 2,
  },
});

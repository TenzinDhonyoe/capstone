import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Spacing, Typography, Shadows } from '@/constants/theme';

type AlertType = 'success' | 'warning' | 'critical' | 'info';

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message?: string;
}

const alertConfig: Record<
  AlertType,
  { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { color: '#7BBFB8', bg: 'rgba(123, 191, 184, 0.12)', icon: 'checkmark-circle' },
  warning: { color: '#D4956A', bg: 'rgba(244, 198, 140, 0.15)', icon: 'warning' },
  critical: { color: '#E88B8B', bg: 'rgba(232, 139, 139, 0.12)', icon: 'alert-circle' },
  info: { color: '#7BBFB8', bg: 'rgba(123, 191, 184, 0.12)', icon: 'information-circle' },
};

export function AlertBanner({ type, title, message }: AlertBannerProps) {
  const config = alertConfig[type];

  return (
    <View style={[styles.banner, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={22} color={config.color} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: config.color }]}>{title}</Text>
        {message && (
          <Text style={[styles.message, { color: config.color }]}>{message}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.bodyBold,
  },
  message: {
    ...Typography.caption,
    opacity: 0.85,
  },
});

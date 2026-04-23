import { StyleSheet, View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, BrandColors, Spacing, Typography } from '@/constants/theme';

type SettingsRowType = 'navigation' | 'toggle' | 'value';

interface SettingsRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  type?: SettingsRowType;
  value?: string;
  toggleValue?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
}

export function SettingsRow({
  icon,
  iconColor,
  title,
  type = 'navigation',
  value,
  toggleValue,
  onPress,
  onToggle,
  destructive = false,
}: SettingsRowProps) {
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const separator = useThemeColor({}, 'separator');
  const inputBg = useThemeColor({}, 'inputBackground');

  const content = (
    <View style={[styles.row, { borderBottomColor: separator }]}>
      {icon && (
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: iconColor ?? BrandColors.accent },
          ]}
        >
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </View>
      )}
      <Text
        style={[
          styles.title,
          { color: destructive ? '#FF3B30' : textColor },
        ]}
      >
        {title}
      </Text>
      <View style={styles.rightContent}>
        {type === 'value' && value && (
          <Text style={[styles.value, { color: secondaryText }]}>{value}</Text>
        )}
        {type === 'toggle' && (
          <Switch
            value={toggleValue}
            onValueChange={onToggle}
            trackColor={{ true: BrandColors.orange, false: inputBg }}
            thumbColor="#FFFFFF"
          />
        )}
        {type === 'navigation' && (
          <Ionicons name="chevron-forward" size={18} color={secondaryText} />
        )}
      </View>
    </View>
  );

  if (type === 'toggle') return content;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    ...Typography.body,
  },
});

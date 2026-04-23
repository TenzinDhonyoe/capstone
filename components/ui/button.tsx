import {
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

// Size specs meet 44pt min tap target at 'sm' and above.
const sizeSpecs: Record<ButtonSize, { paddingV: number; paddingH: number; minHeight: number; text: TextStyle }> = {
  sm: { paddingV: Spacing.sm, paddingH: Spacing.md, minHeight: 44, text: Typography.caption },
  md: { paddingV: Spacing.md - 4, paddingH: Spacing.lg, minHeight: 48, text: Typography.bodyBold },
  lg: { paddingV: Spacing.md, paddingH: Spacing.lg, minHeight: 56, text: Typography.bodyBold },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  fullWidth = true,
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
  iconRight,
}: ButtonProps) {
  const buttonBg = useThemeColor({}, 'buttonBackground');
  const buttonText = useThemeColor({}, 'buttonText');
  const accent = useThemeColor({}, 'accent');
  const cardBorder = useThemeColor({}, 'cardBorder');

  const getButtonStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: buttonBg };
      case 'secondary':
        return { backgroundColor: accent };
      case 'outline':
        return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: cardBorder };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      case 'danger':
        return { backgroundColor: 'rgba(232, 139, 139, 0.15)' };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return buttonText;
      case 'secondary':
        return '#FFFFFF';
      case 'outline':
      case 'ghost':
        return accent;
      case 'danger':
        return '#E88B8B';
    }
  };

  const spec = sizeSpecs[size];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          paddingVertical: spec.paddingV,
          paddingHorizontal: spec.paddingH,
          minHeight: spec.minHeight,
          width: fullWidth ? '100%' : undefined,
        },
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[spec.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
          {iconRight}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});

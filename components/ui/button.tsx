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

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
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
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
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
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    width: '100%',
    gap: Spacing.sm,
  },
  text: {
    ...Typography.bodyBold,
  },
  disabled: {
    opacity: 0.5,
  },
});

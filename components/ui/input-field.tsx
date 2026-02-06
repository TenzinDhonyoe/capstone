import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColor } from '@/hooks/use-theme-color';
import { BorderRadius, Spacing, Typography } from '@/constants/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export function InputField({
  label,
  error,
  leftIcon,
  isPassword,
  style,
  ...rest
}: InputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const inputBg = useThemeColor({}, 'inputBackground');
  const inputBorder = useThemeColor({}, 'inputBorder');
  const accent = useThemeColor({}, 'accent');
  const errorColor = '#FF3B30';

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: secondaryText }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: inputBg,
            borderColor: error ? errorColor : inputBorder,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, { color: textColor }, style]}
          placeholderTextColor={secondaryText}
          secureTextEntry={isPassword && !showPassword}
          selectionColor={accent}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off' : 'eye'}
              size={20}
              color={secondaryText}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: Spacing.sm + 2,
  },
  eyeIcon: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  error: {
    ...Typography.small,
    color: '#FF3B30',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

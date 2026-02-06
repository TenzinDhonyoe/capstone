import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BrandColors, StatusColors, Spacing, Typography, BorderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword, isLoading } = useAuth();
  const router = useRouter();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const handleSend = async () => {
    await resetPassword(email);
    setSent(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.heading, { color: textColor }]}>
              Reset Password
            </Text>
            <Text style={[styles.subheading, { color: secondaryText }]}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          {sent ? (
            <View style={styles.successContainer}>
              <View style={styles.checkmarkCircle}>
                <Ionicons name="checkmark" size={40} color="#FFFFFF" />
              </View>
              <Text style={[styles.successTitle, { color: textColor }]}>
                Check your email
              </Text>
              <Text style={[styles.successMessage, { color: secondaryText }]}>
                We've sent a password reset link to {email}
              </Text>
              <Button
                title="Back to Sign In"
                onPress={() => router.back()}
                style={{ marginTop: Spacing.lg }}
              />
            </View>
          ) : (
            <View style={styles.form}>
              <InputField
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={
                  <Ionicons name="mail-outline" size={20} color={secondaryText} />
                }
              />
              <Button
                title="Send Reset Link"
                onPress={handleSend}
                loading={isLoading}
                disabled={!email}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  backButton: {
    marginBottom: Spacing.md,
    width: 40,
  },
  heading: {
    ...Typography.h1,
    marginBottom: Spacing.sm,
  },
  subheading: {
    ...Typography.body,
    lineHeight: 22,
  },
  form: {
    gap: Spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: StatusColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successTitle: {
    ...Typography.h2,
    marginBottom: Spacing.sm,
  },
  successMessage: {
    ...Typography.body,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});

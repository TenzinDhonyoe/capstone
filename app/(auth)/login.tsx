import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Button } from '@/components/ui/button';
import { InputField } from '@/components/ui/input-field';
import { BorderRadius, BrandColors, Spacing, Typography } from '@/constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const handleLogin = async () => {
    await login(email, password);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="heart" size={48} color={BrandColors.orange} />
            </View>
            <Text style={[styles.brandName, { color: textColor }]}>SOWA</Text>
            <Text style={[styles.tagline, { color: secondaryText }]}>
              Your Heart Health Companion
            </Text>
          </View>

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

            <InputField
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={secondaryText} />
              }
            />

            <View style={styles.forgotPasswordWrapper}>
              <Button
                title="Forgot Password?"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/(auth)/forgot-password')}
              />
            </View>

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              disabled={!email || !password}
            />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: secondaryText }]}>
              Don't have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={[styles.footerLink, { color: BrandColors.orange }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.lg,
    backgroundColor: BrandColors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  brandName: {
    ...Typography.hero,
    letterSpacing: 4,
  },
  tagline: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.xs,
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    ...Typography.body,
  },
  footerLink: {
    ...Typography.bodyBold,
  },
});

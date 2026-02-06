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
import { BrandColors, Spacing, Typography } from '@/constants/theme';

export default function SignUpScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { signUp, isLoading } = useAuth();
  const router = useRouter();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    await signUp(name, email, password);
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
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.heading, { color: textColor }]}>
              Create Account
            </Text>
            <Text style={[styles.subheading, { color: secondaryText }]}>
              Join SOWA to start monitoring your heart health
            </Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              leftIcon={
                <Ionicons name="person-outline" size={20} color={secondaryText} />
              }
            />

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
              placeholder="Create a password"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={secondaryText} />
              }
            />

            <InputField
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={error}
              leftIcon={
                <Ionicons name="lock-closed-outline" size={20} color={secondaryText} />
              }
            />

            <View style={styles.buttonContainer}>
              <Button
                title="Create Account"
                onPress={handleSignUp}
                loading={isLoading}
                disabled={!name || !email || !password || !confirmPassword}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: secondaryText }]}>
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.footerLink, { color: BrandColors.orange }]}>
                Sign In
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
  },
  form: {
    gap: Spacing.xs,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  footerText: {
    ...Typography.body,
  },
  footerLink: {
    ...Typography.bodyBold,
  },
});

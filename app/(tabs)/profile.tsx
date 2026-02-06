import { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { SettingsRow } from '@/components/settings-row';
import { Button } from '@/components/ui/button';
import {
  Spacing,
  Typography,
  BorderRadius,
  BrandColors,
  StatusColors,
} from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [recordingAlerts, setRecordingAlerts] = useState(true);
  const [pathologyNotifs, setPathologyNotifs] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.initials ?? 'U'}</Text>
          </View>
          <Text style={[styles.name, { color: textColor }]}>
            {user?.name ?? 'User'}
          </Text>
          <Text style={[styles.email, { color: secondaryText }]}>
            {user?.email ?? 'user@example.com'}
          </Text>
        </View>

        {/* Device Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Device</Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={styles.deviceCard}>
            <View style={styles.deviceIconContainer}>
              <Ionicons name="bluetooth" size={24} color={secondaryText} />
            </View>
            <View style={styles.deviceInfo}>
              <Text style={[styles.deviceTitle, { color: textColor }]}>
                ECG Sensor
              </Text>
              <Text style={[styles.deviceStatus, { color: secondaryText }]}>
                Not Connected
              </Text>
            </View>
            <View style={styles.deviceBadge}>
              <Text style={styles.deviceBadgeText}>Setup</Text>
            </View>
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Notifications
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SettingsRow
            icon="notifications"
            iconColor={StatusColors.red}
            title="Recording Alerts"
            type="toggle"
            toggleValue={recordingAlerts}
            onToggle={setRecordingAlerts}
          />
          <SettingsRow
            icon="warning"
            iconColor="#D97706"
            title="Pathology Notifications"
            type="toggle"
            toggleValue={pathologyNotifs}
            onToggle={setPathologyNotifs}
          />
          <SettingsRow
            icon="bar-chart"
            iconColor={StatusColors.blue}
            title="Weekly Summary"
            type="toggle"
            toggleValue={weeklySummary}
            onToggle={setWeeklySummary}
          />
        </View>

        {/* Recording Defaults */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Recording Defaults
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SettingsRow
            icon="timer"
            iconColor={StatusColors.green}
            title="Duration"
            type="value"
            value="3 minutes"
            onPress={() => {}}
          />
          <SettingsRow
            icon="pulse"
            iconColor={BrandColors.orange}
            title="Lead Selection"
            type="value"
            value="Lead I"
            onPress={() => {}}
          />
        </View>

        {/* Appearance */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Appearance
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SettingsRow
            icon="moon"
            iconColor="#6366F1"
            title="Dark Mode"
            type="toggle"
            toggleValue={darkMode}
            onToggle={setDarkMode}
          />
        </View>

        {/* About */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <SettingsRow
            icon="information-circle"
            iconColor="#6B7280"
            title="Version"
            type="value"
            value="1.0.0"
          />
          <SettingsRow
            icon="document-text"
            iconColor="#6B7280"
            title="Terms of Service"
            type="navigation"
            onPress={() => {}}
          />
          <SettingsRow
            icon="shield-checkmark"
            iconColor="#6B7280"
            title="Privacy Policy"
            type="navigation"
            onPress={() => {}}
          />
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <Button
            title="Sign Out"
            onPress={logout}
            variant="ghost"
            textStyle={styles.signOutText}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.h2,
    color: '#FFFFFF',
  },
  name: {
    ...Typography.h2,
  },
  email: {
    ...Typography.body,
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm + 2,
  },
  deviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceTitle: {
    ...Typography.bodyBold,
  },
  deviceStatus: {
    ...Typography.caption,
  },
  deviceBadge: {
    backgroundColor: BrandColors.orange,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  deviceBadgeText: {
    ...Typography.caption,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  signOutText: {
    color: StatusColors.red,
  },
});

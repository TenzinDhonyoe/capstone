import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/auth-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MetricCard } from '@/components/metric-card';
import { RecordingCard } from '@/components/recording-card';
import { AlertBanner } from '@/components/alert-banner';
import { BrandColors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { mockRecordings } from '@/data/mock-recordings';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');

  const recentRecordings = mockRecordings.slice(0, 3);
  const latestPathology = mockRecordings.find((r) => r.hasPathology);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: secondaryText }]}>
              {getGreeting()},
            </Text>
            <Text style={[styles.userName, { color: textColor }]}>
              {user?.firstName ?? 'User'}
            </Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Start Recording Card */}
        <TouchableOpacity
          style={styles.startRecordingCard}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/ecg-monitor')}
        >
          <View style={styles.startRecordingContent}>
            <View style={styles.startRecordingIcon}>
              <Ionicons name="pulse" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.startRecordingText}>
              <Text style={styles.startRecordingTitle}>Start Recording</Text>
              <Text style={styles.startRecordingSubtitle}>
                Begin a new ECG recording session
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Metrics Row */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Health Overview
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsRow}
        >
          <MetricCard
            title="Heart Rate"
            value={mockRecordings[0]?.bpm ?? 72}
            unit="BPM"
            trend="stable"
            status="optimal"
          />
          <MetricCard
            title="HRV"
            value={mockRecordings[0]?.hrv ?? 48}
            unit="ms"
            trend="up"
            status="normal"
          />
          <MetricCard
            title="Last Recording"
            value={mockRecordings[0]?.duration ?? '2:30'}
            trend="stable"
          />
          <MetricCard
            title="Health Score"
            value={85}
            unit="/100"
            status="optimal"
          />
        </ScrollView>

        {/* Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Alerts</Text>
        </View>
        {latestPathology ? (
          <AlertBanner
            type="warning"
            title={latestPathology.condition}
            message={latestPathology.pathologyNote}
          />
        ) : (
          <AlertBanner
            type="success"
            title="All Clear"
            message="No pathologies detected in recent recordings."
          />
        )}

        {/* Recent Recordings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Recent Recordings
          </Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentRecordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            date={recording.date}
            time={recording.time}
            bpm={recording.bpm}
            duration={recording.duration}
            condition={recording.condition}
            status={recording.status}
            onPress={() => router.push(`/(tabs)/history/${recording.id}`)}
          />
        ))}
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
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.body,
  },
  userName: {
    ...Typography.h2,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startRecordingCard: {
    backgroundColor: BrandColors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  startRecordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  startRecordingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startRecordingText: {
    flex: 1,
  },
  startRecordingTitle: {
    ...Typography.h3,
    color: '#FFFFFF',
  },
  startRecordingSubtitle: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm + 2,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  seeAll: {
    ...Typography.bodyBold,
    color: BrandColors.accent,
  },
  metricsRow: {
    gap: Spacing.sm + 2,
    paddingRight: Spacing.md,
  },
});

import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/contexts/auth-context';
import { useBLE, useECGStream } from '@/hooks/use-ble';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MetricCard } from '@/components/metric-card';
import { RecordingCard } from '@/components/recording-card';
import { AlertBanner } from '@/components/alert-banner';
import { BrandColors, Spacing, Typography, BorderRadius, StatusColors } from '@/constants/theme';
import { getRecordings, type SavedRecording } from '@/services/recording-storage';
import { analyzeECGBuffer } from '@/services/ecg-analysis';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { isConnected, connectedDevice, connectionStatus } = useBLE();
  const { ecgDataBuffer } = useECGStream();

  const [recordings, setRecordings] = useState<SavedRecording[]>([]);

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

  // Reload recordings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      getRecordings().then(setRecordings);
    }, [])
  );

  const recentRecordings = recordings.slice(0, 3);
  const latestPathology = recordings.find((r) => r.hasPathology);

  // Get real metrics when connected
  const realMetrics = isConnected && ecgDataBuffer.length > 0
    ? analyzeECGBuffer(ecgDataBuffer)
    : null;

  const currentHR = realMetrics?.heartRate ?? (recentRecordings[0]?.bpm || '--');
  const currentHRV = realMetrics?.hrv ?? (recentRecordings[0]?.hrv || '--');

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

        {/* Device Status Card */}
        {isConnected ? (
          <View style={styles.deviceCardConnected}>
            <View style={styles.deviceCardContent}>
              <View style={styles.deviceCardLeft}>
                <View style={styles.connectedDot} />
                <View>
                  <Text style={styles.deviceCardTitle}>
                    {connectedDevice?.name ?? 'SOWA Sensor'}
                  </Text>
                  <Text style={styles.deviceCardSubtitle}>Connected</Text>
                </View>
              </View>
              <View style={styles.liveHR}>
                <Ionicons name="heart" size={20} color="#FFFFFF" />
                <Text style={styles.liveHRValue}>{currentHR}</Text>
                <Text style={styles.liveHRUnit}>BPM</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.deviceCardAction}
              onPress={() => router.push('/(tabs)/ecg-monitor')}
              activeOpacity={0.8}
            >
              <Text style={styles.deviceCardActionText}>Open ECG Monitor</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.deviceCardDisconnected, { backgroundColor: cardBg, borderColor: cardBorder }]}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/ecg-monitor')}
          >
            <View style={styles.deviceCardContent}>
              <View style={styles.deviceCardIconContainer}>
                <Ionicons name="bluetooth-outline" size={28} color={StatusColors.blue} />
              </View>
              <View style={styles.deviceCardTextContainer}>
                <Text style={[styles.deviceCardTitle, { color: textColor }]}>
                  {connectionStatus === 'reconnecting'
                    ? 'Reconnecting...'
                    : 'Connect Your Sensor'}
                </Text>
                <Text style={[styles.deviceCardSubtitleDisconnected, { color: secondaryText }]}>
                  {connectionStatus === 'reconnecting'
                    ? 'Trying to reach your SOWA sensor'
                    : 'Tap to connect your SOWA ECG sensor'}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color={secondaryText} />
            </View>
          </TouchableOpacity>
        )}

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
            value={currentHR}
            unit="BPM"
            trend="stable"
            status="optimal"
          />
          <MetricCard
            title="HRV"
            value={currentHRV}
            unit="ms"
            trend="up"
            status="normal"
          />
          <MetricCard
            title="Last Recording"
            value={recentRecordings[0]?.duration ?? '--'}
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
        {recentRecordings.length > 0 ? (
          recentRecordings.map((recording) => (
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
          ))
        ) : (
          <View style={[styles.emptyRecordings, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="pulse-outline" size={32} color={secondaryText} />
            <Text style={[styles.emptyText, { color: secondaryText }]}>
              No recordings yet. Connect your sensor and start recording.
            </Text>
          </View>
        )}
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
  // Connected device card
  deviceCardConnected: {
    backgroundColor: BrandColors.accent,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  deviceCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  connectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },
  deviceCardTitle: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  deviceCardSubtitle: {
    ...Typography.small,
    color: 'rgba(255,255,255,0.8)',
  },
  liveHR: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  liveHRValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  liveHRUnit: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  deviceCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  deviceCardActionText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  // Disconnected device card
  deviceCardDisconnected: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  deviceCardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: StatusColors.blue + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceCardTextContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
    marginRight: Spacing.sm,
  },
  deviceCardSubtitleDisconnected: {
    ...Typography.caption,
    marginTop: 2,
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
  emptyRecordings: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    textAlign: 'center',
  },
});

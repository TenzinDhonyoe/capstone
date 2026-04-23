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
import { useML } from '@/contexts/ml-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { MetricCard } from '@/components/metric-card';
import { RecordingCard } from '@/components/recording-card';
import { AlertBanner } from '@/components/alert-banner';
import { Button } from '@/components/ui/button';
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
  const { summary: liveSummary } = useML();

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
  const latestRecording = recordings[0];

  // Alert priority: live detection > latest saved recording > all-clear
  const livePVC = isConnected && liveSummary.pvcCount > 0;
  const livePAC = isConnected && liveSummary.pacCount > 0;
  const hasLivePathology = livePVC || livePAC;
  const hasRecordedPathology =
    !!latestRecording && ((latestRecording.pvcCount ?? 0) > 0 || (latestRecording.pacCount ?? 0) > 0);

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
            <Button
              title="Open ECG Monitor"
              size="md"
              onPress={() => router.push('/(tabs)/ecg-monitor')}
              style={styles.deviceCardAction}
              textStyle={{ color: '#FFFFFF' }}
              iconRight={<Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
            />
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
        </ScrollView>

        {/* Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Alerts</Text>
        </View>
        {hasLivePathology ? (
          <AlertBanner
            type="warning"
            title="Pathology Detected (Live)"
            message={`Live: ${liveSummary.pvcCount} PVC${liveSummary.pvcCount === 1 ? '' : 's'}, ${liveSummary.pacCount} PAC${liveSummary.pacCount === 1 ? '' : 's'} in the last 60s`}
          />
        ) : hasRecordedPathology ? (
          <AlertBanner
            type="warning"
            title="Pathology Detected"
            message={`Last recording: ${latestRecording.pvcCount ?? 0} PVCs, ${latestRecording.pacCount ?? 0} PACs detected by AI`}
          />
        ) : (
          <AlertBanner
            type="success"
            title="All Clear"
            message={
              latestRecording
                ? 'No pathologies in your most recent recording.'
                : 'Take your first recording to see results here.'
            }
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
    gap: Spacing.xs,
  },
  liveHRValue: {
    ...Typography.largeNumber,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  liveHRUnit: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  deviceCardAction: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
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
    marginTop: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
  },
  seeAll: {
    ...Typography.bodyBold,
    color: BrandColors.accent,
  },
  metricsRow: {
    gap: Spacing.sm,
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

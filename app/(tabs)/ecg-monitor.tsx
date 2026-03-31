'use no memo';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/alert-banner';
import { BLEConnectionStatus } from '@/components/ble-connection-status';
import { BLEDeviceList } from '@/components/ble-device-list';
import { ECGWaveform } from '@/components/ecg-waveform';
import { SignalQualityBar } from '@/components/signal-quality-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  BrandColors,
  BorderRadius,
  Spacing,
  StatusColors,
  Typography,
} from '@/constants/theme';
import {
  defaultECGMetrics,
  getVariedMetrics,
  type ECGMetrics,
} from '@/data/mock-ecg-metrics';
import { useBLE, useECGStream } from '@/hooks/use-ble';
import { useThemeColor } from '@/hooks/use-theme-color';
import { analyzeECGBuffer } from '@/services/ecg-analysis';
import { saveRecording, type SavedRecording } from '@/services/recording-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVEFORM_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const WAVEFORM_HEIGHT = 220;

export default function ECGMonitorScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState<ECGMetrics>(defaultECGMetrics);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metricsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<Date | null>(null);

  // BLE state
  const { isConnected, connectionStatus, signalQuality: bleSignalQuality, requestPermissions } = useBLE();
  const { ecgDataBuffer } = useECGStream();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');
  const buttonBg = useThemeColor({}, 'buttonBackground');
  const buttonTextColor = useThemeColor({}, 'buttonText');

  // Update metrics from real ECG data when connected
  useEffect(() => {
    if (!isConnected || ecgDataBuffer.length === 0) return;

    const result = analyzeECGBuffer(ecgDataBuffer);
    if (result) {
      setMetrics((prev) => ({
        ...prev,
        heartRate: result.heartRate || prev.heartRate,
        hrv: result.hrv,
        signalQuality: result.signalQuality,
      }));
    }
  }, [isConnected, ecgDataBuffer]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setElapsedSeconds(0);
    setSavedBanner(null);
    recordingStartTime.current = new Date();

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    // Only use mock metrics when not connected to a real device
    if (!isConnected) {
      metricsRef.current = setInterval(() => {
        setMetrics((prev) => getVariedMetrics(prev));
      }, 2500);
    }
  }, [isConnected]);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (metricsRef.current) clearInterval(metricsRef.current);
    timerRef.current = null;
    metricsRef.current = null;

    // Save recording
    const now = recordingStartTime.current ?? new Date();
    const id = `rec-${Date.now()}`;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;

    const recording: SavedRecording = {
      id,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      bpm: metrics.heartRate,
      hrv: metrics.hrv,
      condition: metrics.rhythm,
      status: metrics.rhythm === 'Normal Sinus Rhythm' ? 'optimal' : 'warning',
      hasPathology: metrics.rhythm !== 'Normal Sinus Rhythm',
      pathologyNote: metrics.rhythm !== 'Normal Sinus Rhythm'
        ? `Detected: ${metrics.rhythm}`
        : '',
      sampleCount: ecgDataBuffer.length,
    };

    await saveRecording(recording);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedBanner(id);

    // Auto-dismiss after 5 seconds
    setTimeout(() => setSavedBanner(null), 5000);
  }, [elapsedSeconds, metrics, ecgDataBuffer.length]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsRef.current) clearInterval(metricsRef.current);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const heartRateStatus = metrics.heartRate > 100 || metrics.heartRate < 50 ? 'warning' : 'optimal';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>ECG Monitor</Text>
          <View style={styles.headerRight}>
            {isRecording && (
              <View style={[styles.liveIndicator, { backgroundColor: StatusColors.red + '15' }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            <BLEConnectionStatus
              compact
              onPress={() => {
                requestPermissions();
                setShowDeviceList(true);
              }}
            />
          </View>
        </View>

        {/* Saved Banner */}
        {savedBanner && (
          <TouchableOpacity
            style={styles.savedBanner}
            onPress={() => {
              setSavedBanner(null);
              router.push(`/(tabs)/history/${savedBanner}`);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.savedBannerText}>Recording saved!</Text>
            <Text style={styles.savedBannerAction}>View</Text>
          </TouchableOpacity>
        )}

        {/* Connection Banner - show when not connected */}
        {!isConnected && !isRecording && (
          <TouchableOpacity
            style={[styles.connectionBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => {
              requestPermissions();
              setShowDeviceList(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Connect your ECG sensor to start monitoring"
          >
            <Ionicons name="bluetooth-outline" size={20} color={StatusColors.blue} />
            <Text style={[styles.connectionBannerText, { color: textColor }]}>
              {connectionStatus === 'reconnecting'
                ? 'Reconnecting to your sensor...'
                : 'Connect your ECG sensor to start monitoring'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>
        )}

        {/* ECG Waveform */}
        <View accessibilityLabel={`ECG waveform, current heart rate ${metrics.heartRate} BPM`}>
          <ECGWaveform
            width={WAVEFORM_WIDTH}
            height={WAVEFORM_HEIGHT}
            isAnimating={isRecording || (isConnected && ecgDataBuffer.length > 0)}
            staticData={isConnected && ecgDataBuffer.length > 0 ? ecgDataBuffer : undefined}
          />
        </View>

        {/* HERO: Heart Rate */}
        <View style={styles.heroMetric}>
          <View style={styles.heroRow}>
            <Ionicons
              name="heart"
              size={28}
              color={heartRateStatus === 'optimal' ? StatusColors.green : StatusColors.red}
            />
            <Text style={[styles.heroValue, { color: textColor }]}>
              {isConnected || isRecording ? metrics.heartRate : '--'}
            </Text>
            <Text style={[styles.heroUnit, { color: secondaryText }]}>BPM</Text>
          </View>
          {(isConnected || isRecording) && (
            <StatusBadge
              status={heartRateStatus}
            />
          )}
        </View>

        {/* Signal Quality + Rhythm Row */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <SignalQualityBar quality={isConnected ? bleSignalQuality : metrics.signalQuality} />
          </View>
          <View style={[styles.rhythmBadge, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.rhythmLabel, { color: secondaryText }]}>Rhythm</Text>
            <Text style={[styles.rhythmValue, { color: textColor }]} numberOfLines={1}>
              {metrics.rhythm}
            </Text>
          </View>
        </View>

        {/* Expandable Detail Metrics */}
        <TouchableOpacity
          style={[styles.detailToggle, { borderColor: cardBorder }]}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailToggleText, { color: secondaryText }]}>
            Detailed Metrics
          </Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={secondaryText}
          />
        </TouchableOpacity>

        {showDetails && (
          <View style={styles.detailGrid}>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.detailLabel, { color: secondaryText }]}>HRV</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{metrics.hrv}</Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.detailLabel, { color: secondaryText }]}>PR Interval</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{metrics.prInterval}</Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.detailLabel, { color: secondaryText }]}>QT Interval</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>{metrics.qtInterval}</Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
          </View>
        )}

        {/* Pathology Alert */}
        {metrics.rhythm !== 'Normal Sinus Rhythm' && (
          <View style={styles.section}>
            <AlertBanner
              type="warning"
              title="Abnormal Rhythm Detected"
              message={`Current classification: ${metrics.rhythm}. Consult a healthcare provider.`}
            />
          </View>
        )}

        {/* Recording Timer */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <Ionicons name="timer-outline" size={20} color={secondaryText} />
            <Text style={[styles.timerText, { color: textColor }]}>
              {formatTime(elapsedSeconds)}
            </Text>
          </View>
        )}

        {/* Start/Stop Button */}
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording
              ? styles.stopButton
              : { backgroundColor: buttonBg },
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'play'}
            size={24}
            color={isRecording ? '#FFFFFF' : buttonTextColor}
          />
          <Text style={[styles.recordButtonText, !isRecording && { color: buttonTextColor }]}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* BLE Device List Modal */}
      <BLEDeviceList
        visible={showDeviceList}
        onClose={() => setShowDeviceList(false)}
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: StatusColors.green,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  savedBannerText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    flex: 1,
  },
  savedBannerAction: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  connectionBannerText: {
    ...Typography.body,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: StatusColors.red,
  },
  liveText: {
    ...Typography.small,
    fontWeight: '700',
    color: StatusColors.red,
    letterSpacing: 1,
  },
  // Hero heart rate
  heroMetric: {
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  heroValue: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 28,
  },
  // Status row
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
  },
  rhythmBadge: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  rhythmLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  rhythmValue: {
    ...Typography.caption,
    fontWeight: '600',
    marginTop: 2,
  },
  // Detail metrics
  detailToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  detailToggleText: {
    ...Typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  detailCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  detailLabel: {
    ...Typography.small,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  detailUnit: {
    ...Typography.small,
  },
  section: {
    marginTop: Spacing.md,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  timerText: {
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  stopButton: {
    backgroundColor: StatusColors.red,
  },
  recordButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
});

import { Ionicons } from '@expo/vector-icons';
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
import { MetricCard } from '@/components/metric-card';
import { SignalQualityBar } from '@/components/signal-quality-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  BorderRadius,
  Spacing,
  StatusColors,
  Typography
} from '@/constants/theme';
import {
  defaultECGMetrics,
  getVariedMetrics,
  type ECGMetrics,
} from '@/data/mock-ecg-metrics';
import { useBLE, useECGStream } from '@/hooks/use-ble';
import { analyzeECGBuffer } from '@/services/ecg-analysis';
import { useThemeColor } from '@/hooks/use-theme-color';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVEFORM_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const WAVEFORM_HEIGHT = 220;

export default function ECGMonitorScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState<ECGMetrics>(defaultECGMetrics);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metricsRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // BLE state
  const { isConnected, signalQuality: bleSignalQuality, requestPermissions } = useBLE();
  const { ecgDataBuffer } = useECGStream();

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

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

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (metricsRef.current) clearInterval(metricsRef.current);
    timerRef.current = null;
    metricsRef.current = null;
  }, []);

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
              <View style={styles.liveIndicator}>
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

        {/* Connection Banner - show when not connected */}
        {!isConnected && (
          <TouchableOpacity
            style={[styles.connectionBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={() => {
              requestPermissions();
              setShowDeviceList(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="bluetooth-outline" size={20} color={StatusColors.blue} />
            <Text style={[styles.connectionBannerText, { color: textColor }]}>
              Connect your ECG sensor to start monitoring
            </Text>
            <Ionicons name="chevron-forward" size={18} color={secondaryText} />
          </TouchableOpacity>
        )}

        {/* ECG Waveform */}
        <ECGWaveform
          width={WAVEFORM_WIDTH}
          height={WAVEFORM_HEIGHT}
          isAnimating={isRecording}
          staticData={isConnected && ecgDataBuffer.length > 0 ? ecgDataBuffer : undefined}
        />

        {/* Signal Quality */}
        <View style={styles.section}>
          <SignalQualityBar quality={isConnected ? bleSignalQuality : metrics.signalQuality} />
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MetricCard
                title="Heart Rate"
                value={metrics.heartRate}
                unit="BPM"
                status={
                  metrics.heartRate > 100
                    ? 'warning'
                    : metrics.heartRate < 50
                      ? 'warning'
                      : 'optimal'
                }
                compact
              />
            </View>
            <View style={styles.metricItem}>
              <MetricCard
                title="HRV"
                value={metrics.hrv}
                unit="ms"
                status={metrics.hrv < 30 ? 'warning' : 'normal'}
                compact
              />
            </View>
            <View style={styles.metricItem}>
              <MetricCard
                title="PR Interval"
                value={metrics.prInterval}
                unit="ms"
                compact
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MetricCard
                title="QT Interval"
                value={metrics.qtInterval}
                unit="ms"
                compact
              />
            </View>
            <View style={styles.rhythmCard}>
              <View
                style={[
                  styles.rhythmContainer,
                  { backgroundColor: cardBg, borderColor: cardBorder },
                ]}
              >
                <Text style={[styles.rhythmLabel, { color: secondaryText }]}>
                  Rhythm
                </Text>
                <Text style={[styles.rhythmValue, { color: textColor }]}>
                  {metrics.rhythm}
                </Text>
                <StatusBadge
                  status={
                    metrics.rhythm === 'Normal Sinus Rhythm'
                      ? 'optimal'
                      : 'warning'
                  }
                />
              </View>
            </View>
          </View>
        </View>

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
            isRecording ? styles.stopButton : styles.startButton,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isRecording ? 'stop' : 'play'}
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.recordButtonText}>
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
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
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
    backgroundColor: '#FFEBEE',
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
  section: {
    marginTop: Spacing.md,
  },
  metricsGrid: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricItem: {
    flex: 1,
  },
  rhythmCard: {
    flex: 2,
  },
  rhythmContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    gap: Spacing.xs,
  },
  rhythmLabel: {
    ...Typography.caption,
    fontWeight: '500',
  },
  rhythmValue: {
    ...Typography.bodyBold,
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
  startButton: {
    backgroundColor: '#1C1C1E',
  },
  stopButton: {
    backgroundColor: StatusColors.red,
  },
  recordButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
});

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
import { ECGWaveform, type WaveformAnnotation } from '@/components/ecg-waveform';
import { SignalQualityBar } from '@/components/signal-quality-bar';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  BrandColors,
  BorderRadius,
  Spacing,
  StatusColors,
  Typography,
} from '@/constants/theme';
import { EMPTY_LEAD_BUFFERS, type ECGLeadBuffers, type LeadId } from '@/constants/ble-constants';
import { type ECGMetrics, initialECGMetrics, analyzeECGBuffer } from '@/services/ecg-analysis';
import { useML } from '@/contexts/ml-context';
import { getDisplayLabel } from '@/services/ml-types';
import type { BeatClassification } from '@/services/ml-types';
import { useBLE, useECGStream } from '@/hooks/use-ble';
import { useThemeColor } from '@/hooks/use-theme-color';
import { saveRecording, saveRawSamples, type SavedRecording } from '@/services/recording-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVEFORM_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const WAVEFORM_HEIGHT = 220;

export default function ECGMonitorScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [metrics, setMetrics] = useState<ECGMetrics>(initialECGMetrics);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTime = useRef<Date | null>(null);

  // Recording buffer: accumulates samples for all 3 leads during recording
  const recordingBufferRef = useRef<ECGLeadBuffers>({ leadI: [], leadII: [], leadIII: [] });
  const lastBufferLengthRef = useRef<Record<LeadId, number>>({ leadI: 0, leadII: 0, leadIII: 0 });
  const metricsRef = useRef<ECGMetrics>(initialECGMetrics);
  const MAX_RECORDING_SAMPLES = 360 * 60 * 30; // 30 minutes max

  // BLE state
  const { isConnected, connectionStatus, signalQuality: bleSignalQuality, requestPermissions } = useBLE();
  const { ecgDataBuffer, ecgLeadBuffers } = useECGStream();

  // ML state
  const {
    modelStatus,
    isMLEnabled,
    classifications,
    summary,
    patternAlert,
    signalQualityOk,
  } = useML();

  // Build waveform annotations from recent classifications
  const waveformAnnotations: WaveformAnnotation[] = isConnected && isMLEnabled
    ? classifications
        .filter((c) => c.confidenceTier === 'high')
        .slice(-20) // only show last 20 annotations for performance
        .map((c) => ({
          sampleIndex: c.sampleIndex,
          color: c.label === 'N' ? '#4CAF50' : c.label === 'PVC' ? '#FF9800' : '#FF5722',
          size: c.label === 'N' ? 3 : 5,
        }))
    : [];

  // Get the latest classification for display
  const latestClassification = classifications.length > 0
    ? classifications[classifications.length - 1]
    : null;

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
      setMetrics(result);
      metricsRef.current = result;
    }
  }, [isConnected, ecgDataBuffer]);

  // Accumulate samples into recording buffer for all 3 leads during recording
  useEffect(() => {
    if (!isRecording || !isConnected) return;
    if (recordingBufferRef.current.leadII.length >= MAX_RECORDING_SAMPLES) return;

    const leads: { id: LeadId; buffer: number[] }[] = [
      { id: 'leadI', buffer: ecgLeadBuffers.leadI },
      { id: 'leadII', buffer: ecgLeadBuffers.leadII },
      { id: 'leadIII', buffer: ecgLeadBuffers.leadIII },
    ];

    for (const { id, buffer } of leads) {
      const currentLength = buffer.length;
      const prevLength = lastBufferLengthRef.current[id];

      if (currentLength > prevLength) {
        const newSamples = buffer.slice(prevLength);
        for (let i = 0; i < newSamples.length; i++) {
          recordingBufferRef.current[id].push(newSamples[i]);
        }
      } else if (currentLength < prevLength && currentLength > 0) {
        for (let i = 0; i < currentLength; i++) {
          recordingBufferRef.current[id].push(buffer[i]);
        }
      }

      lastBufferLengthRef.current[id] = currentLength;
    }
  }, [isRecording, isConnected, ecgLeadBuffers]);

  // Reset buffer tracking when connection state changes
  useEffect(() => {
    if (isConnected) {
      lastBufferLengthRef.current = { leadI: 0, leadII: 0, leadIII: 0 };
    }
  }, [isConnected]);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setElapsedSeconds(0);
    setSavedBanner(null);
    recordingStartTime.current = new Date();
    recordingBufferRef.current = { leadI: [], leadII: [], leadIII: [] };
    lastBufferLengthRef.current = { leadI: 0, leadII: 0, leadIII: 0 };

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    // Use ref for latest metrics to avoid stale closure
    const currentMetrics = metricsRef.current;

    // Save recording
    const now = recordingStartTime.current ?? new Date();
    const id = `rec-${Date.now()}`;
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;

    const hasPVCs = summary.pvcCount > 0;
    const hasPACs = summary.pacCount > 0;
    const condition = hasPVCs && hasPACs
      ? 'PVCs & PACs Detected'
      : hasPVCs
        ? 'PVCs Detected'
        : hasPACs
          ? 'PACs Detected'
          : 'Normal';

    const recording: SavedRecording = {
      id,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      duration: `${mins}:${secs.toString().padStart(2, '0')}`,
      bpm: currentMetrics.heartRate,
      hrv: currentMetrics.hrv,
      prInterval: currentMetrics.prInterval,
      qtInterval: currentMetrics.qtInterval,
      condition,
      status: (hasPVCs || hasPACs) ? 'warning' : 'optimal',
      hasPathology: hasPVCs || hasPACs,
      pathologyNote: (hasPVCs || hasPACs)
        ? `AI detected: ${summary.pvcCount} PVC, ${summary.pacCount} PAC out of ${summary.totalBeats} beats`
        : '',
      sampleCount: recordingBufferRef.current.leadII.length,
      pvcCount: summary.pvcCount,
      pacCount: summary.pacCount,
      totalClassifiedBeats: summary.totalBeats,
    };

    await saveRecording(recording);

    // Save raw ECG samples (all 3 leads) to filesystem
    if (recordingBufferRef.current.leadII.length > 0) {
      await saveRawSamples(id, recordingBufferRef.current);
    }
    recordingBufferRef.current = { leadI: [], leadII: [], leadIII: [] };

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSavedBanner(id);

    // Auto-dismiss after 5 seconds
    setTimeout(() => setSavedBanner(null), 5000);
  }, [elapsedSeconds]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const heartRateStatus = metrics.heartRate > 100 || metrics.heartRate < 50 ? 'warning' : 'optimal';

  // Format interval display: show "N/A" when value is 0 (unable to detect)
  const formatInterval = (value: number): string => (value > 0 ? String(value) : 'N/A');

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

        {/* Debug: raw buffer stats */}
        {isConnected && ecgDataBuffer.length > 0 && (() => {
          const last100 = ecgDataBuffer.slice(-100);
          const min = Math.min(...last100);
          const max = Math.max(...last100);
          const mean = last100.reduce((a, b) => a + b, 0) / last100.length;
          const last5 = ecgDataBuffer.slice(-5).map(v => v.toFixed(2)).join(', ');
          return (
            <View style={{ backgroundColor: '#000', padding: 8, borderRadius: 8, marginBottom: 4 }}>
              <Text style={{ color: '#0f0', fontSize: 11, fontFamily: 'Courier' }}>
                buf={ecgDataBuffer.length} min={min.toFixed(2)} max={max.toFixed(2)} mean={mean.toFixed(2)}
              </Text>
              <Text style={{ color: '#0f0', fontSize: 11, fontFamily: 'Courier' }}>
                last5=[{last5}]
              </Text>
            </View>
          );
        })()}

        {/* ECG Waveform */}
        <View accessibilityLabel={`ECG waveform, current heart rate ${metrics.heartRate} BPM`}>
          <ECGWaveform
            width={WAVEFORM_WIDTH}
            height={WAVEFORM_HEIGHT}
            isAnimating={isRecording || (isConnected && ecgDataBuffer.length > 0)}
            staticData={isConnected ? ecgDataBuffer : undefined}
            annotations={waveformAnnotations}
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
              {isConnected && metrics.heartRate > 0 ? metrics.heartRate : '--'}
            </Text>
            <Text style={[styles.heroUnit, { color: secondaryText }]}>BPM</Text>
          </View>
          {isConnected && metrics.heartRate > 0 && (
            <StatusBadge
              status={heartRateStatus}
            />
          )}
        </View>

        {/* ML Classification Status */}
        {isConnected && isMLEnabled && (
          <View style={[styles.mlStatusContainer, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.mlStatusRow}>
              <Ionicons
                name="analytics-outline"
                size={18}
                color={
                  modelStatus === 'ready'
                    ? (latestClassification?.label === 'N' || !latestClassification
                        ? StatusColors.green
                        : '#FF9800')
                    : secondaryText
                }
              />
              <Text style={[styles.mlStatusText, { color: textColor }]}>
                {modelStatus === 'loading' && 'AI analysis loading...'}
                {modelStatus === 'error' && 'AI analysis unavailable'}
                {modelStatus === 'ready' && !signalQualityOk && 'Signal too noisy for AI analysis'}
                {modelStatus === 'ready' && signalQualityOk && !latestClassification && 'Analyzing beats...'}
                {modelStatus === 'ready' && signalQualityOk && latestClassification &&
                  getDisplayLabel(latestClassification)}
              </Text>
              {latestClassification && latestClassification.confidenceTier !== 'low' && (
                <Text style={[styles.mlConfidence, { color: secondaryText }]}>
                  {Math.round(latestClassification.confidence * 100)}%
                </Text>
              )}
            </View>
            {summary.totalBeats > 0 && (
              <Text style={[styles.mlSummaryText, { color: secondaryText }]}>
                Last 60s: {summary.normalCount} Normal
                {summary.pvcCount > 0 ? `, ${summary.pvcCount} PVC` : ''}
                {summary.pacCount > 0 ? `, ${summary.pacCount} PAC` : ''}
                {summary.possiblePvcCount > 0 ? ` (+${summary.possiblePvcCount} possible)` : ''}
              </Text>
            )}
          </View>
        )}

        {/* Signal Quality + Classification Row */}
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <SignalQualityBar quality={isConnected ? bleSignalQuality : 0} />
          </View>
          <View style={[styles.rhythmBadge, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.rhythmLabel, { color: secondaryText }]}>Classification</Text>
            <Text style={[styles.rhythmValue, { color: textColor }]} numberOfLines={1}>
              {isConnected
                ? summary.totalBeats === 0
                  ? 'Analyzing...'
                  : summary.pvcCount > 0 && summary.pacCount > 0
                    ? 'PVCs & PACs Detected'
                    : summary.pvcCount > 0
                      ? 'PVCs Detected'
                      : summary.pacCount > 0
                        ? 'PACs Detected'
                        : 'Normal'
                : '--'}
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
              <Text style={[styles.detailValue, { color: textColor }]}>
                {isConnected && metrics.hrv > 0 ? metrics.hrv : '--'}
              </Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.detailLabel, { color: secondaryText }]}>PR Interval</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {isConnected ? formatInterval(metrics.prInterval) : '--'}
              </Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
            <View style={[styles.detailCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.detailLabel, { color: secondaryText }]}>QT Interval</Text>
              <Text style={[styles.detailValue, { color: textColor }]}>
                {isConnected ? formatInterval(metrics.qtInterval) : '--'}
              </Text>
              <Text style={[styles.detailUnit, { color: secondaryText }]}>ms</Text>
            </View>
          </View>
        )}

        {/* Pathology Alert (ML pattern-based) */}
        {isConnected && patternAlert && (
          <View style={styles.section}>
            <AlertBanner
              type={patternAlert.level === 'warning' ? 'warning' : 'info'}
              title={patternAlert.title}
              message={patternAlert.message}
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

        {/* Medical Disclaimer */}
        {isConnected && isMLEnabled && (
          <Text style={[styles.disclaimer, { color: secondaryText }]}>
            For educational purposes only. Not a medical diagnosis.
          </Text>
        )}

        {/* Start/Stop Button */}
        {isConnected ? (
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
        ) : (
          <TouchableOpacity
            style={[styles.recordButton, styles.disabledButton]}
            onPress={() => {
              requestPermissions();
              setShowDeviceList(true);
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Connect sensor to record"
          >
            <Ionicons name="bluetooth-outline" size={24} color="#999999" />
            <Text style={[styles.recordButtonText, styles.disabledButtonText]}>
              Connect Sensor to Record
            </Text>
          </TouchableOpacity>
        )}
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
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  disabledButtonText: {
    color: '#999999',
  },
  recordButtonText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
  },
  // ML Classification styles
  mlStatusContainer: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.sm + 2,
    gap: 4,
  },
  mlStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mlStatusText: {
    ...Typography.bodyBold,
    flex: 1,
  },
  mlConfidence: {
    ...Typography.small,
    fontVariant: ['tabular-nums'] as any,
  },
  mlSummaryText: {
    ...Typography.small,
    marginLeft: 26, // align with text after icon
  },
  disclaimer: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontStyle: 'italic',
    opacity: 0.7,
  },
});

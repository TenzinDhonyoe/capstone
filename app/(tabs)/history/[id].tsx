'use no memo';

import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';

import { useThemeColor } from '@/hooks/use-theme-color';
import { MetricCard } from '@/components/metric-card';
import { AlertBanner } from '@/components/alert-banner';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { ECGWaveform } from '@/components/ecg-waveform';
import { Spacing, Typography, BorderRadius } from '@/constants/theme';
import { getRecordingById, getRawSamples, type SavedRecording } from '@/services/recording-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVEFORM_WIDTH = SCREEN_WIDTH - Spacing.md * 2;
const WAVEFORM_HEIGHT = 200;

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [recording, setRecording] = useState<SavedRecording | null>(null);
  const [rawSamples, setRawSamples] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  const bg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const cardBg = useThemeColor({}, 'card');
  const cardBorder = useThemeColor({}, 'cardBorder');

  useEffect(() => {
    if (!id) return;
    Promise.all([getRecordingById(id), getRawSamples(id)])
      .then(([rec, samples]) => {
        setRecording(rec);
        setRawSamples(samples);
      })
      .catch(() => {
        // Failed to load — recording will show as not found
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!recording) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: textColor }]}>
            Recording not found
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const formatInterval = (value: number | undefined): string =>
    value && value > 0 ? String(value) : 'N/A';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.date, { color: textColor }]}>{recording.date}</Text>
            <Text style={[styles.time, { color: secondaryText }]}>{recording.time}</Text>
          </View>
        </View>

        {/* ECG Waveform Replay */}
        {rawSamples && rawSamples.length > 0 ? (
          <View style={styles.waveformSection}>
            <ECGWaveform
              width={WAVEFORM_WIDTH}
              height={WAVEFORM_HEIGHT}
              isAnimating={true}
              staticData={rawSamples}
            />
          </View>
        ) : (
          <View style={[styles.noWaveform, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Ionicons name="pulse-outline" size={32} color={secondaryText} />
            <Text style={[styles.noWaveformText, { color: secondaryText }]}>
              No waveform data available
            </Text>
          </View>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MetricCard
                title="Heart Rate"
                value={recording.bpm}
                unit="BPM"
                status={
                  recording.bpm > 100
                    ? 'warning'
                    : recording.bpm < 50
                    ? 'warning'
                    : 'optimal'
                }
              />
            </View>
            <View style={styles.metricItem}>
              <MetricCard
                title="HRV"
                value={recording.hrv}
                unit="ms"
                status={recording.hrv < 30 ? 'warning' : 'normal'}
              />
            </View>
          </View>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <MetricCard
                title="PR Interval"
                value={formatInterval(recording.prInterval)}
                unit="ms"
              />
            </View>
            <View style={styles.metricItem}>
              <MetricCard
                title="QT Interval"
                value={formatInterval(recording.qtInterval)}
                unit="ms"
              />
            </View>
          </View>
        </View>

        {/* Rhythm Classification */}
        <View
          style={[
            styles.rhythmCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <Text style={[styles.rhythmLabel, { color: secondaryText }]}>
            Beat Classification
          </Text>
          <Text style={[styles.rhythmValue, { color: textColor }]}>
            {recording.condition}
          </Text>
          <StatusBadge status={recording.status} label={recording.condition} />
        </View>

        {/* Duration */}
        <View
          style={[
            styles.durationCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <Ionicons name="timer-outline" size={20} color={secondaryText} />
          <Text style={[styles.durationText, { color: textColor }]}>
            Duration: {recording.duration}
          </Text>
        </View>

        {/* Pathology Alert */}
        {recording.hasPathology && recording.pathologyNote && (
          <View style={styles.alertSection}>
            <AlertBanner
              type={recording.status === 'critical' ? 'critical' : 'warning'}
              title="Pathology Detected"
              message={recording.pathologyNote}
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Export Report"
            onPress={() => {}}
            variant="outline"
            icon={<Ionicons name="download-outline" size={20} color="#FF8C42" />}
          />
          <Button
            title="Share"
            onPress={() => {}}
            variant="outline"
            icon={<Ionicons name="share-outline" size={20} color="#FF8C42" />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    ...Typography.h3,
  },
  time: {
    ...Typography.caption,
  },
  waveformSection: {
    marginBottom: Spacing.md,
  },
  noWaveform: {
    height: WAVEFORM_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  noWaveformText: {
    ...Typography.caption,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  rhythmLabel: {
    ...Typography.caption,
    fontWeight: '500',
  },
  rhythmValue: {
    ...Typography.h3,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  durationText: {
    ...Typography.bodyBold,
  },
  alertSection: {
    marginTop: Spacing.md,
  },
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  notFoundText: {
    ...Typography.h3,
  },
});

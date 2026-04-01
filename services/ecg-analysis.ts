/**
 * ECG Signal Analysis Service
 *
 * Computes heart rate (BPM), HRV (SDNN), PR interval, QT interval,
 * rhythm classification, and signal quality from real ECG sample
 * buffers received via BLE from the ESP32.
 */

import { BLE_CONFIG } from '@/constants/ble-constants';

export interface ECGMetrics {
  heartRate: number;
  hrv: number;
  prInterval: number;   // ms, 0 = unable to detect
  qtInterval: number;   // ms, 0 = unable to detect
  rhythm: string;
  signalQuality: number;
}

export const initialECGMetrics: ECGMetrics = {
  heartRate: 0,
  hrv: 0,
  prInterval: 0,
  qtInterval: 0,
  rhythm: 'Analyzing...',
  signalQuality: 0,
};

const SAMPLE_RATE = BLE_CONFIG.SAMPLE_RATE; // 250 Hz

/**
 * Analyze an ECG sample buffer and return computed metrics.
 * Expects normalized samples (already divided by SAMPLE_GAIN).
 * Needs at least ~3 seconds of data (750 samples) to produce meaningful results.
 */
export function analyzeECGBuffer(samples: number[]): ECGMetrics | null {
  if (samples.length < SAMPLE_RATE * 3) {
    return null; // Not enough data
  }

  // Use the most recent 10 seconds (or whatever is available)
  const windowSize = Math.min(samples.length, SAMPLE_RATE * 10);
  const window = samples.slice(-windowSize);

  const rPeakIndices = detectRPeaks(window);
  const signalQuality = estimateSignalQuality(window);

  if (rPeakIndices.length < 2) {
    return {
      heartRate: 0,
      hrv: 0,
      prInterval: 0,
      qtInterval: 0,
      rhythm: 'Analyzing...',
      signalQuality,
    };
  }

  // Compute RR intervals in milliseconds
  const rrIntervals: number[] = [];
  for (let i = 1; i < rPeakIndices.length; i++) {
    const intervalSamples = rPeakIndices[i] - rPeakIndices[i - 1];
    const intervalMs = (intervalSamples / SAMPLE_RATE) * 1000;

    // Filter out physiologically impossible intervals
    // 300ms = 200 BPM max, 2000ms = 30 BPM min
    if (intervalMs >= 300 && intervalMs <= 2000) {
      rrIntervals.push(intervalMs);
    }
  }

  if (rrIntervals.length === 0) {
    return {
      heartRate: 0,
      hrv: 0,
      prInterval: 0,
      qtInterval: 0,
      rhythm: 'Analyzing...',
      signalQuality,
    };
  }

  const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const heartRate = Math.round(60000 / meanRR);

  // HRV: SDNN (standard deviation of NN intervals)
  let hrv = 0;
  if (rrIntervals.length >= 2) {
    const variance =
      rrIntervals.reduce((sum, rr) => sum + (rr - meanRR) ** 2, 0) /
      (rrIntervals.length - 1);
    hrv = Math.round(Math.sqrt(variance));
  }

  // PQRST feature extraction (best-effort on single-lead)
  const prInterval = computePRInterval(window, rPeakIndices);
  const qtInterval = computeQTInterval(window, rPeakIndices);
  const rhythm = classifyRhythm(heartRate, rrIntervals);

  return {
    heartRate: Math.max(30, Math.min(220, heartRate)),
    hrv: Math.max(0, Math.min(200, hrv)),
    prInterval,
    qtInterval,
    rhythm,
    signalQuality,
  };
}

/**
 * Detect R-peaks using a simple threshold + refractory period approach.
 * Works well for clean ECG signals from hardware like AD8232.
 */
export function detectRPeaks(samples: number[]): number[] {
  if (samples.length < SAMPLE_RATE) return [];

  // Compute signal statistics for adaptive threshold
  let sum = 0;
  let max = -Infinity;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    if (samples[i] > max) max = samples[i];
  }
  const mean = sum / samples.length;

  // Threshold: midpoint between mean and max
  const threshold = mean + (max - mean) * 0.5;

  // Minimum distance between R-peaks: 200ms (300 BPM max)
  const refractorySamples = Math.round(SAMPLE_RATE * 0.2);

  const peaks: number[] = [];
  let lastPeakIndex = -refractorySamples;

  for (let i = 1; i < samples.length - 1; i++) {
    if (
      samples[i] > threshold &&
      samples[i] > samples[i - 1] &&
      samples[i] >= samples[i + 1] &&
      i - lastPeakIndex >= refractorySamples
    ) {
      peaks.push(i);
      lastPeakIndex = i;
    }
  }

  return peaks;
}

/**
 * Compute PR interval by detecting P-waves before each R-peak.
 * Searches backward from each R-peak for the P-wave peak in the 120-200ms window.
 * Returns average PR interval in ms, or 0 if detection fails.
 */
function computePRInterval(samples: number[], rPeakIndices: number[]): number {
  if (rPeakIndices.length < 2) return 0;

  const prIntervals: number[] = [];

  // P-wave search window: 120-280ms before R-peak
  const minOffsetSamples = Math.round(SAMPLE_RATE * 0.12);
  const maxOffsetSamples = Math.round(SAMPLE_RATE * 0.28);

  for (const rIdx of rPeakIndices) {
    const searchStart = rIdx - maxOffsetSamples;
    const searchEnd = rIdx - minOffsetSamples;

    if (searchStart < 0 || searchEnd <= searchStart) continue;

    // Find local maximum in the P-wave window (P-wave is a small positive deflection)
    let pPeakIdx = searchStart;
    let pPeakVal = samples[searchStart];

    for (let i = searchStart + 1; i <= searchEnd && i < samples.length; i++) {
      if (samples[i] > pPeakVal) {
        pPeakVal = samples[i];
        pPeakIdx = i;
      }
    }

    // Validate: P-wave should be a local maximum that stands above the baseline
    // Compute local baseline as average of window edges
    const baselineLeft = samples[Math.max(0, searchStart - 5)] ?? 0;
    const baselineRight = samples[Math.min(samples.length - 1, searchEnd + 5)] ?? 0;
    const localBaseline = (baselineLeft + baselineRight) / 2;

    // P-wave should be at least slightly above baseline
    if (pPeakVal > localBaseline + 0.02) {
      const prSamples = rIdx - pPeakIdx;
      const prMs = (prSamples / SAMPLE_RATE) * 1000;

      // Physiological range: 120-200ms
      if (prMs >= 80 && prMs <= 300) {
        prIntervals.push(prMs);
      }
    }
  }

  if (prIntervals.length === 0) return 0;

  const avgPR = prIntervals.reduce((a, b) => a + b, 0) / prIntervals.length;
  return Math.round(avgPR);
}

/**
 * Compute QT interval by detecting T-wave end after each R-peak.
 * Uses slope-threshold method: find where the T-wave downslope crosses near-zero.
 * Returns average QT interval in ms, or 0 if detection fails.
 */
function computeQTInterval(samples: number[], rPeakIndices: number[]): number {
  if (rPeakIndices.length < 2) return 0;

  const qtIntervals: number[] = [];

  // Q-wave is ~30ms before R-peak, T-wave ends 250-450ms after R-peak
  const qOffsetSamples = Math.round(SAMPLE_RATE * 0.03);
  const tSearchStart = Math.round(SAMPLE_RATE * 0.2);
  const tSearchEnd = Math.round(SAMPLE_RATE * 0.5);

  for (let r = 0; r < rPeakIndices.length; r++) {
    const rIdx = rPeakIndices[r];
    const qIdx = rIdx - qOffsetSamples;
    if (qIdx < 0) continue;

    const searchFrom = rIdx + tSearchStart;
    const searchTo = rIdx + tSearchEnd;

    // Don't overlap into the next beat
    const nextR = r + 1 < rPeakIndices.length ? rPeakIndices[r + 1] : samples.length;
    const effectiveEnd = Math.min(searchTo, nextR - Math.round(SAMPLE_RATE * 0.1), samples.length - 1);

    if (searchFrom >= effectiveEnd) continue;

    // Find T-wave peak first (local max in search window)
    let tPeakIdx = searchFrom;
    let tPeakVal = samples[searchFrom];

    for (let i = searchFrom + 1; i <= effectiveEnd; i++) {
      if (samples[i] > tPeakVal) {
        tPeakVal = samples[i];
        tPeakIdx = i;
      }
    }

    // Find T-wave end: where slope approaches zero after T-peak
    // Use a sliding window slope calculation
    const slopeWindow = Math.round(SAMPLE_RATE * 0.02); // 20ms window
    let tEndIdx = tPeakIdx;

    for (let i = tPeakIdx + slopeWindow; i <= effectiveEnd; i++) {
      const slope = (samples[i] - samples[i - slopeWindow]) / slopeWindow;
      if (Math.abs(slope) < 0.005) {
        tEndIdx = i;
        break;
      }
    }

    if (tEndIdx <= tPeakIdx) continue;

    const qtSamples = tEndIdx - qIdx;
    const qtMs = (qtSamples / SAMPLE_RATE) * 1000;

    // Physiological range: 300-500ms
    if (qtMs >= 250 && qtMs <= 550) {
      qtIntervals.push(qtMs);
    }
  }

  if (qtIntervals.length === 0) return 0;

  const avgQT = qtIntervals.reduce((a, b) => a + b, 0) / qtIntervals.length;
  return Math.round(avgQT);
}

/**
 * Classify rhythm based on heart rate and RR interval regularity.
 * Uses coefficient of variation > 25% with irregular morphology check
 * to avoid false positives from respiratory sinus arrhythmia.
 */
function classifyRhythm(heartRate: number, rrIntervals: number[]): string {
  if (rrIntervals.length < 3) return 'Analyzing...';

  const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const variance =
    rrIntervals.reduce((sum, rr) => sum + (rr - meanRR) ** 2, 0) /
    (rrIntervals.length - 1);
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / meanRR) * 100; // Coefficient of variation as percentage

  // Check for respiratory sinus arrhythmia pattern:
  // RSA shows gradual acceleration/deceleration (sinusoidal pattern)
  // True irregularity shows random jumps between intervals
  const hasRespiratoryPattern = detectRespiratoryPattern(rrIntervals);

  // Irregular if CV > 25% AND not a respiratory pattern
  if (cv > 25 && !hasRespiratoryPattern) {
    return 'Irregular Rhythm';
  }

  // Rate-based classification for regular rhythms
  if (heartRate < 60) return 'Sinus Bradycardia';
  if (heartRate > 100) return 'Sinus Tachycardia';
  return 'Normal Sinus Rhythm';
}

/**
 * Detect respiratory sinus arrhythmia (RSA) pattern.
 * RSA shows smooth, gradual changes in RR intervals following breathing.
 * Returns true if the pattern looks like RSA (not true irregularity).
 */
function detectRespiratoryPattern(rrIntervals: number[]): boolean {
  if (rrIntervals.length < 6) return false;

  // Count direction changes: RSA has few direction changes (smooth wave)
  // True irregularity has many random direction changes
  let directionChanges = 0;
  for (let i = 2; i < rrIntervals.length; i++) {
    const prev = rrIntervals[i - 1] - rrIntervals[i - 2];
    const curr = rrIntervals[i] - rrIntervals[i - 1];
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0)) {
      directionChanges++;
    }
  }

  // RSA: smooth wave has few direction changes relative to length
  // Random irregularity: ~50% of intervals change direction
  const changeRate = directionChanges / (rrIntervals.length - 2);
  return changeRate < 0.4; // Smooth pattern = likely RSA
}

/**
 * Estimate signal quality (0-100) based on signal variance and noise.
 * A flat line or extremely noisy signal scores low.
 */
export function estimateSignalQuality(samples: number[]): number {
  if (samples.length < SAMPLE_RATE) return 0;

  let sum = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i];
    sumSq += samples[i] * samples[i];
  }

  const mean = sum / samples.length;
  const variance = sumSq / samples.length - mean * mean;
  const stdDev = Math.sqrt(Math.max(0, variance));

  // A good ECG signal has moderate variance (not flat, not pure noise)
  // Normalized signals from SAMPLE_GAIN=2048 typically have stdDev 0.05-0.5
  if (stdDev < 0.01) return 10;   // Flat line
  if (stdDev > 2.0) return 20;    // Very noisy

  // Check for high-frequency noise by comparing adjacent sample differences
  let diffSum = 0;
  for (let i = 1; i < samples.length; i++) {
    diffSum += Math.abs(samples[i] - samples[i - 1]);
  }
  const avgDiff = diffSum / (samples.length - 1);

  // Ratio of average diff to stdDev: lower = cleaner signal
  const noiseRatio = avgDiff / (stdDev + 0.001);

  // noiseRatio ~0.3-0.8 is typical for clean ECG
  if (noiseRatio < 0.3) return 90;
  if (noiseRatio < 0.6) return 80;
  if (noiseRatio < 1.0) return 65;
  if (noiseRatio < 1.5) return 45;
  return 25;
}

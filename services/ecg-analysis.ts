/**
 * ECG Signal Analysis Service
 *
 * Computes heart rate (BPM), HRV (SDNN), and signal quality from
 * real ECG sample buffers received via BLE from the ESP32.
 */

import { BLE_CONFIG } from '@/constants/ble-constants';

export interface RealTimeMetrics {
  heartRate: number;      // BPM
  hrv: number;            // SDNN in milliseconds
  signalQuality: number;  // 0-100
}

const SAMPLE_RATE = BLE_CONFIG.SAMPLE_RATE; // 250 Hz

/**
 * Analyze an ECG sample buffer and return computed metrics.
 * Expects normalized samples (already divided by SAMPLE_GAIN).
 * Needs at least ~3 seconds of data (750 samples) to produce meaningful results.
 */
export function analyzeECGBuffer(samples: number[]): RealTimeMetrics | null {
  if (samples.length < SAMPLE_RATE * 3) {
    return null; // Not enough data
  }

  // Use the most recent 10 seconds (or whatever is available)
  const windowSize = Math.min(samples.length, SAMPLE_RATE * 10);
  const window = samples.slice(-windowSize);

  const rPeakIndices = detectRPeaks(window);

  if (rPeakIndices.length < 2) {
    return {
      heartRate: 0,
      hrv: 0,
      signalQuality: estimateSignalQuality(window),
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
      signalQuality: estimateSignalQuality(window),
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

  return {
    heartRate: Math.max(30, Math.min(220, heartRate)),
    hrv: Math.max(0, Math.min(200, hrv)),
    signalQuality: estimateSignalQuality(window),
  };
}

/**
 * Detect R-peaks using a simple threshold + refractory period approach.
 * Works well for clean ECG signals from hardware like AD8232.
 */
function detectRPeaks(samples: number[]): number[] {
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
 * Estimate signal quality (0-100) based on signal variance and noise.
 * A flat line or extremely noisy signal scores low.
 */
function estimateSignalQuality(samples: number[]): number {
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

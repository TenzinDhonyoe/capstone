/**
 * ML Inference Service
 *
 * Handles TFLite model loading, ECG beat preprocessing, and inference.
 * Falls back to rule-based PVC detection when TFLite is unavailable.
 *
 * Data flow:
 *   ecgDataBuffer -> detectRPeaks() -> extractBeatWindow() ->
 *   preprocessBeat() -> classifyBeat() -> BeatClassification
 */

import { BLE_CONFIG } from '@/constants/ble-constants';
import { detectRPeaks } from '@/services/ecg-analysis';
import {
  type BeatClassification,
  type BeatLabel,
  type ClassificationSummary,
  type PatternAlert,
  type AlertLevel,
  type ModelStatus,
  getConfidenceTier,
} from '@/services/ml-types';

const SAMPLE_RATE = BLE_CONFIG.SAMPLE_RATE; // 250 Hz

// Beat window: 90 samples before + 90 samples after R-peak at 250Hz
// If resampling to 360Hz, this becomes 180 samples (the model's expected input)
const HALF_WINDOW = 90; // samples at 250Hz (0.36s each side)
const BEAT_WINDOW_SIZE = HALF_WINDOW * 2; // 180 samples

// Minimum buffer edge margin to extract a valid window
const EDGE_MARGIN = HALF_WINDOW;

// ============================================================
// MODEL MANAGEMENT
// ============================================================

let modelStatus: ModelStatus = 'loading';
let tfliteModel: any = null; // Will hold the TFLite model when available

/**
 * Load the TFLite model. Call once on app startup.
 * Currently a stub -- replace with react-native-fast-tflite loading
 * once the .tflite file is available.
 */
export async function loadModel(): Promise<ModelStatus> {
  try {
    // TODO: Replace with actual TFLite model loading:
    // const model = await loadTensorflowModel(
    //   require('@/assets/models/ecg_model.tflite')
    // );
    // tfliteModel = model;

    // For now, use rule-based fallback
    tfliteModel = null;
    modelStatus = 'ready'; // Ready with rule-based fallback
    return modelStatus;
  } catch (error) {
    console.error('Failed to load ML model:', error);
    modelStatus = 'error';
    return modelStatus;
  }
}

export function getModelStatus(): ModelStatus {
  return modelStatus;
}

// ============================================================
// BEAT EXTRACTION
// ============================================================

/**
 * Extract a beat window centered on an R-peak.
 * Returns null if the R-peak is too close to the buffer edges.
 */
export function extractBeatWindow(
  samples: number[],
  rPeakIndex: number
): number[] | null {
  const start = rPeakIndex - HALF_WINDOW;
  const end = rPeakIndex + HALF_WINDOW;

  if (start < 0 || end > samples.length) {
    return null;
  }

  return samples.slice(start, end);
}

// ============================================================
// PREPROCESSING
// ============================================================

/**
 * Preprocess a beat window for model input:
 * 1. Baseline correction (linear detrending)
 * 2. Normalization (zero mean, unit variance)
 */
export function preprocessBeat(window: number[]): number[] {
  const n = window.length;
  if (n === 0) return [];

  // 1. Linear detrending (baseline wander removal)
  const first = window[0];
  const last = window[n - 1];
  const detrended = new Array(n);
  for (let i = 0; i < n; i++) {
    const baseline = first + ((last - first) * i) / (n - 1);
    detrended[i] = window[i] - baseline;
  }

  // 2. Zero mean, unit variance normalization
  let sum = 0;
  for (let i = 0; i < n; i++) sum += detrended[i];
  const mean = sum / n;

  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += (detrended[i] - mean) ** 2;
  const std = Math.sqrt(sumSq / n);

  const normalized = new Array(n);
  const safeStd = std > 1e-6 ? std : 1; // avoid division by zero
  for (let i = 0; i < n; i++) {
    normalized[i] = (detrended[i] - mean) / safeStd;
  }

  return normalized;
}

// ============================================================
// CLASSIFICATION
// ============================================================

/**
 * Classify a single beat using TFLite model or rule-based fallback.
 */
export function classifyBeat(
  preprocessedWindow: number[],
  rawWindow: number[],
  rPeakIndex: number,
  rrIntervals: { prev: number; next: number } | null
): BeatClassification {
  const now = Date.now();

  if (tfliteModel) {
    return classifyWithTFLite(preprocessedWindow, rPeakIndex, now);
  }

  // Rule-based fallback
  return classifyRuleBased(rawWindow, rPeakIndex, rrIntervals, now);
}

/**
 * TFLite model inference (stub until model is available).
 */
function classifyWithTFLite(
  preprocessedWindow: number[],
  rPeakIndex: number,
  timestamp: number
): BeatClassification {
  // TODO: Replace with actual TFLite inference:
  // const input = Float32Array.from(preprocessedWindow);
  // const output = tfliteModel.runSync([input]);
  // const probabilities = output[0]; // [P(N), P(PVC), P(PAC)]

  // Placeholder: classify as Normal with high confidence
  const label: BeatLabel = 'N';
  const confidence = 0.95;

  return {
    label,
    confidence,
    confidenceTier: getConfidenceTier(confidence),
    sampleIndex: rPeakIndex,
    timestamp,
  };
}

/**
 * Rule-based PVC/PAC detection as fallback.
 *
 * PVC indicators:
 * - Premature beat: R-R interval < 80% of running average
 * - Compensatory pause: next R-R > 120% of average
 * - Wide QRS: peak-to-trough amplitude > 1.5x normal in the beat window
 *
 * PAC indicators:
 * - Premature beat similar to PVC but narrower QRS
 */
function classifyRuleBased(
  rawWindow: number[],
  rPeakIndex: number,
  rrIntervals: { prev: number; next: number } | null,
  timestamp: number
): BeatClassification {
  let label: BeatLabel = 'N';
  let confidence = 0.85;

  if (rrIntervals) {
    const avgRR = (rrIntervals.prev + rrIntervals.next) / 2;
    const isPremature = rrIntervals.prev < avgRR * 0.8;
    const hasCompensatoryPause = rrIntervals.next > avgRR * 1.2;

    // Measure QRS width approximation from the raw window
    const qrsWidth = measureQRSWidth(rawWindow);
    const amplitude = measureAmplitude(rawWindow);

    if (isPremature && hasCompensatoryPause) {
      if (qrsWidth > 30 || amplitude > 1.5) {
        // Wide QRS + premature + pause = PVC
        label = 'PVC';
        confidence = isPremature && hasCompensatoryPause ? 0.75 : 0.55;
      } else {
        // Narrow QRS + premature = PAC
        label = 'PAC';
        confidence = 0.6;
      }
    } else if (isPremature) {
      // Just premature, lower confidence
      label = 'PVC';
      confidence = 0.45; // low tier, will show as "Uncertain"
    }
  }

  return {
    label,
    confidence,
    confidenceTier: getConfidenceTier(confidence),
    sampleIndex: rPeakIndex,
    timestamp,
  };
}

/** Approximate QRS width in samples by finding the main deflection span. */
function measureQRSWidth(window: number[]): number {
  const mid = Math.floor(window.length / 2);
  const searchRadius = 25; // ~100ms at 250Hz
  let maxIdx = mid;
  let minIdx = mid;

  for (let i = Math.max(0, mid - searchRadius); i < Math.min(window.length, mid + searchRadius); i++) {
    if (window[i] > window[maxIdx]) maxIdx = i;
    if (window[i] < window[minIdx]) minIdx = i;
  }

  return Math.abs(maxIdx - minIdx);
}

/** Measure peak-to-trough amplitude ratio relative to window std. */
function measureAmplitude(window: number[]): number {
  let max = -Infinity;
  let min = Infinity;
  let sum = 0;
  for (let i = 0; i < window.length; i++) {
    if (window[i] > max) max = window[i];
    if (window[i] < min) min = window[i];
    sum += window[i];
  }
  const mean = sum / window.length;
  let sumSq = 0;
  for (let i = 0; i < window.length; i++) sumSq += (window[i] - mean) ** 2;
  const std = Math.sqrt(sumSq / window.length);
  return std > 1e-6 ? (max - min) / std : 0;
}

// ============================================================
// BUFFER CLASSIFICATION
// ============================================================

/**
 * Classify all new R-peaks in a buffer snapshot.
 * Skips R-peaks too close to edges and already-classified peaks.
 */
export function classifyBuffer(
  bufferSnapshot: number[],
  alreadyClassifiedIndices: Set<number>
): BeatClassification[] {
  if (bufferSnapshot.length < SAMPLE_RATE) return [];

  const rPeakIndices = detectRPeaks(bufferSnapshot);
  const results: BeatClassification[] = [];

  for (let i = 0; i < rPeakIndices.length; i++) {
    const peakIdx = rPeakIndices[i];

    // Skip edges
    if (peakIdx < EDGE_MARGIN || peakIdx > bufferSnapshot.length - EDGE_MARGIN) {
      continue;
    }

    // Skip already classified
    if (alreadyClassifiedIndices.has(peakIdx)) {
      continue;
    }

    const rawWindow = extractBeatWindow(bufferSnapshot, peakIdx);
    if (!rawWindow) continue;

    const preprocessed = preprocessBeat(rawWindow);

    // Compute R-R intervals for rule-based detection
    let rrIntervals: { prev: number; next: number } | null = null;
    if (i > 0 && i < rPeakIndices.length - 1) {
      const prevRR = ((rPeakIndices[i] - rPeakIndices[i - 1]) / SAMPLE_RATE) * 1000;
      const nextRR = ((rPeakIndices[i + 1] - rPeakIndices[i]) / SAMPLE_RATE) * 1000;
      if (prevRR >= 300 && prevRR <= 2000 && nextRR >= 300 && nextRR <= 2000) {
        rrIntervals = { prev: prevRR, next: nextRR };
      }
    }

    const classification = classifyBeat(preprocessed, rawWindow, peakIdx, rrIntervals);
    results.push(classification);
  }

  return results;
}

// ============================================================
// PATTERN DETECTION
// ============================================================

/**
 * Detect clinical patterns from recent classifications.
 * Returns the highest-priority alert, or null if no alert needed.
 */
export function detectPatternAlert(
  classifications: BeatClassification[],
  windowMs: number = 60000
): PatternAlert | null {
  const now = Date.now();
  const recent = classifications.filter(
    (c) => now - c.timestamp < windowMs && c.confidenceTier !== 'low'
  );

  if (recent.length === 0) return null;

  const pvcBeats = recent.filter((c) => c.label === 'PVC' && c.confidenceTier === 'high');
  const pacBeats = recent.filter((c) => c.label === 'PAC' && c.confidenceTier === 'high');

  // Check for bigeminy: every other beat is PVC for 10+ beats
  if (pvcBeats.length >= 5 && recent.length >= 10) {
    const ratio = pvcBeats.length / recent.length;
    if (ratio >= 0.4 && ratio <= 0.6) {
      return {
        level: 'warning',
        title: 'PVC Bigeminy Pattern',
        message: 'Alternating PVC pattern detected. Consider sharing this recording with your healthcare provider.',
        pattern: 'bigeminy',
      };
    }
  }

  // Check for couplets: two consecutive PVCs
  for (let i = 1; i < recent.length; i++) {
    if (recent[i].label === 'PVC' && recent[i - 1].label === 'PVC' &&
        recent[i].confidenceTier === 'high' && recent[i - 1].confidenceTier === 'high') {
      return {
        level: 'warning',
        title: 'PVC Couplet Detected',
        message: 'Two consecutive PVCs detected. Consider sharing this recording with your healthcare provider.',
        pattern: 'couplet',
      };
    }
  }

  // Check for elevated burden: >6 PVCs in 60 seconds
  if (pvcBeats.length > 6) {
    return {
      level: 'info',
      title: 'Elevated PVC Activity',
      message: `${pvcBeats.length} PVCs detected in the last 60 seconds.`,
      pattern: 'elevated_burden',
    };
  }

  // Similar for PACs but calmer
  if (pacBeats.length > 6) {
    return {
      level: 'info',
      title: 'Elevated PAC Activity',
      message: `${pacBeats.length} PACs detected in the last 60 seconds.`,
      pattern: 'elevated_burden',
    };
  }

  return null;
}

// ============================================================
// SUMMARY
// ============================================================

/**
 * Compute a summary of classifications over a time window.
 */
export function computeSummary(
  classifications: BeatClassification[],
  windowMs: number = 60000
): ClassificationSummary {
  const now = Date.now();
  const recent = classifications.filter((c) => now - c.timestamp < windowMs);

  let normalCount = 0;
  let pvcCount = 0;
  let pacCount = 0;
  let possiblePvcCount = 0;
  let possiblePacCount = 0;

  for (const c of recent) {
    if (c.confidenceTier === 'low') {
      // Don't count uncertain classifications
      continue;
    }

    if (c.label === 'N') {
      normalCount++;
    } else if (c.label === 'PVC') {
      if (c.confidenceTier === 'high') pvcCount++;
      else possiblePvcCount++;
    } else if (c.label === 'PAC') {
      if (c.confidenceTier === 'high') pacCount++;
      else possiblePacCount++;
    }
  }

  return {
    totalBeats: recent.length,
    normalCount,
    pvcCount,
    pacCount,
    possiblePvcCount,
    possiblePacCount,
    windowSeconds: windowMs / 1000,
  };
}

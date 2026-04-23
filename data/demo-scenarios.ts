/**
 * Demo ECG Scenarios
 *
 * Synthetic ECG signal generators for use when no hardware is connected
 * (e.g., TestFlight demo, no-device development). Produces samples +
 * classification packets that look to the rest of the app exactly like
 * what the ESP32 would send.
 *
 * Each scenario emits batches at 360 Hz effective sample rate.
 */

import type { ClassificationPacket } from '@/services/ble-manager';

export type DemoScenario =
  | 'normal'
  | 'pvc-heavy'
  | 'pac-heavy'
  | 'bradycardia'
  | 'tachycardia';

export interface DemoScenarioMeta {
  id: DemoScenario;
  label: string;
  description: string;
  icon: 'heart' | 'pulse' | 'pulse-outline' | 'trending-down' | 'trending-up';
}

export const DEMO_SCENARIOS: readonly DemoScenarioMeta[] = [
  {
    id: 'normal',
    label: 'Normal Sinus Rhythm',
    description: '75 BPM, clean PQRST',
    icon: 'heart',
  },
  {
    id: 'pvc-heavy',
    label: 'PVCs (Bigeminy)',
    description: 'Every other beat is a PVC',
    icon: 'pulse',
  },
  {
    id: 'pac-heavy',
    label: 'Frequent PACs',
    description: 'Premature atrial beats',
    icon: 'pulse-outline',
  },
] as const;

// Match BLE_CONFIG.SAMPLE_RATE. Kept local so this module has no cycles.
const SAMPLE_RATE = 360;

// Emit 18 samples every 50ms → 360 Hz effective, close to real firmware cadence.
export const BATCH_SAMPLES = 18;
export const BATCH_INTERVAL_MS = 50;

type BeatVariant = 'N' | 'PVC' | 'PAC';

function gaussian(t: number, amplitude: number, center: number, width: number): number {
  return amplitude * Math.exp(-Math.pow(t - center, 2) / (2 * Math.pow(width, 2)));
}

function generateBeat(durationSec: number, variant: BeatVariant): number[] {
  const samplesPerBeat = Math.round(SAMPLE_RATE * durationSec);
  const rCenter = durationSec * 0.3;
  const beat: number[] = new Array(samplesPerBeat);

  for (let i = 0; i < samplesPerBeat; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;

    if (variant === 'N') {
      v += gaussian(t, 0.12, rCenter - 0.13, 0.025);  // P
      v += gaussian(t, -0.08, rCenter - 0.03, 0.012); // Q
      v += gaussian(t, 1.0, rCenter, 0.012);           // R
      v += gaussian(t, -0.2, rCenter + 0.03, 0.012);   // S
      v += gaussian(t, 0.25, rCenter + 0.17, 0.04);    // T
    } else if (variant === 'PVC') {
      // No P wave, wider QRS, inverted T — the classic PVC morphology
      v += gaussian(t, -0.15, rCenter - 0.04, 0.022);  // Q (deeper)
      v += gaussian(t, 1.2, rCenter, 0.028);            // R (wider + taller)
      v += gaussian(t, -0.45, rCenter + 0.05, 0.026);  // S (deeper + wider)
      v += gaussian(t, -0.22, rCenter + 0.19, 0.05);   // Inverted T
    } else {
      // PAC: abnormal P (earlier + taller), otherwise normal QRST
      v += gaussian(t, 0.18, rCenter - 0.11, 0.02);    // Abnormal P
      v += gaussian(t, -0.08, rCenter - 0.03, 0.012);  // Q
      v += gaussian(t, 0.95, rCenter, 0.012);           // R
      v += gaussian(t, -0.2, rCenter + 0.03, 0.012);   // S
      v += gaussian(t, 0.25, rCenter + 0.17, 0.04);    // T
    }

    v += (Math.random() - 0.5) * 0.02;
    beat[i] = v;
  }

  return beat;
}

function variantForBeat(scenario: DemoScenario, beatIndex: number): BeatVariant {
  if (scenario === 'pvc-heavy') {
    return beatIndex % 2 === 1 ? 'PVC' : 'N';
  }
  if (scenario === 'pac-heavy') {
    return beatIndex % 4 === 3 ? 'PAC' : 'N';
  }
  return 'N';
}

function baseDurationForScenario(scenario: DemoScenario): number {
  if (scenario === 'bradycardia') return 60 / 40;
  if (scenario === 'tachycardia') return 60 / 140;
  return 60 / 75;
}

function beatDuration(scenario: DemoScenario, variant: BeatVariant): number {
  let duration = baseDurationForScenario(scenario);
  if (variant === 'PAC') duration *= 0.7;           // premature — shorter RR
  duration *= 0.97 + Math.random() * 0.06;          // tiny natural variance
  return duration;
}

function labelCode(variant: BeatVariant): 0 | 1 | 2 {
  if (variant === 'PVC') return 1;
  if (variant === 'PAC') return 2;
  return 0;
}

interface PendingClassification {
  fireAtSampleIndex: number;
  packet: ClassificationPacket;
}

export interface DemoState {
  pendingSamples: number[];
  pendingClassifications: PendingClassification[];
  beatIndex: number;
  scheduledSamples: number;   // total samples ever scheduled into pendingSamples
  emittedSamples: number;     // total samples returned to caller
}

export function createDemoState(): DemoState {
  return {
    pendingSamples: [],
    pendingClassifications: [],
    beatIndex: 0,
    scheduledSamples: 0,
    emittedSamples: 0,
  };
}

export interface DemoBatch {
  samples: number[];
  classification: ClassificationPacket | null;
}

/**
 * Produce the next batch of samples for a scenario. Mutates `state`.
 * Emits a ClassificationPacket when a beat's R-peak falls inside the batch,
 * matching how the ESP32 firmware sends labels.
 */
export function nextBatch(
  scenario: DemoScenario,
  state: DemoState,
  batchSize: number = BATCH_SAMPLES
): DemoBatch {
  while (state.pendingSamples.length < batchSize) {
    const variant = variantForBeat(scenario, state.beatIndex);
    const duration = beatDuration(scenario, variant);
    const beat = generateBeat(duration, variant);
    const rPeakOffsetInBeat = Math.round(beat.length * 0.3);
    const rPeakAbsIndex = state.scheduledSamples + rPeakOffsetInBeat;

    state.pendingClassifications.push({
      fireAtSampleIndex: rPeakAbsIndex,
      packet: {
        label: labelCode(variant),
        confidence: 0.95,
        // beatIndex as the sampleIndex — unique across the session, keeps
        // ML context's dedup set from collapsing beats.
        sampleIndex: state.beatIndex,
        heartRate: Math.round(60 / duration),
      },
    });

    state.pendingSamples.push(...beat);
    state.scheduledSamples += beat.length;
    state.beatIndex += 1;
  }

  const samples = state.pendingSamples.splice(0, batchSize);
  state.emittedSamples += batchSize;

  let classification: ClassificationPacket | null = null;
  while (
    state.pendingClassifications.length > 0 &&
    state.pendingClassifications[0].fireAtSampleIndex <= state.emittedSamples
  ) {
    // Last one fired in this batch wins. Batches are 50ms and the shortest
    // beat (tachy at 140 BPM) is ~430ms, so in practice at most one fires.
    classification = state.pendingClassifications.shift()!.packet;
  }

  return { samples, classification };
}

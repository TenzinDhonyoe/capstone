/**
 * ML Classification Types
 *
 * Types for real-time ECG beat classification using TFLite model.
 * The model classifies each heartbeat as Normal, PVC, or PAC.
 */

export type BeatLabel = 'N' | 'PVC' | 'PAC';

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface BeatClassification {
  label: BeatLabel;
  confidence: number;        // 0.0 - 1.0
  confidenceTier: ConfidenceTier;
  sampleIndex: number;       // index into the buffer where R-peak was detected
  timestamp: number;         // Date.now() when classified
}

export interface ClassificationSummary {
  totalBeats: number;
  normalCount: number;
  pvcCount: number;
  pacCount: number;
  possiblePvcCount: number;  // medium confidence PVCs
  possiblePacCount: number;  // medium confidence PACs
  windowSeconds: number;     // time window for this summary
}

export type AlertLevel = 'none' | 'info' | 'warning';

export interface PatternAlert {
  level: AlertLevel;
  title: string;
  message: string;
  pattern: 'isolated' | 'elevated_burden' | 'couplet' | 'bigeminy';
}

export type ModelStatus = 'loading' | 'ready' | 'error' | 'disabled';

export function getConfidenceTier(confidence: number): ConfidenceTier {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function getDisplayLabel(classification: BeatClassification): string {
  if (classification.confidenceTier === 'low') return 'Uncertain';
  if (classification.confidenceTier === 'medium') {
    if (classification.label === 'PVC') return 'Possible PVC';
    if (classification.label === 'PAC') return 'Possible PAC';
    return 'Normal';
  }
  if (classification.label === 'N') return 'Normal';
  return classification.label;
}

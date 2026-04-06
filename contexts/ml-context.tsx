/**
 * ML Classification Context
 *
 * Manages real-time ECG beat classification state, separate from BLE context
 * to avoid unnecessary re-renders in components that don't need ML data.
 *
 * Runs classification on a 500ms timer (NOT every BLE notification)
 * to avoid blocking the waveform rendering.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { InteractionManager } from 'react-native';

import { useBLE } from '@/hooks/use-ble';
import { estimateSignalQuality } from '@/services/ecg-analysis';
import {
  classifyBuffer,
  computeSummary,
  detectPatternAlert,
  getModelStatus,
  loadModel,
} from '@/services/ml-inference';
import type {
  BeatClassification,
  BeatLabel,
  ClassificationSummary,
  ModelStatus,
  PatternAlert,
} from '@/services/ml-types';
import { getConfidenceTier } from '@/services/ml-types';

const CLASSIFICATION_INTERVAL_MS = 500;
const SIGNAL_QUALITY_THRESHOLD = 50;
const MAX_CLASSIFICATIONS = 500; // ~8 minutes at 70bpm
const HALF_WINDOW = 90; // R-peak detection delay in samples
const ESP32_ACTIVE_TIMEOUT_MS = 2000; // suppress fallback if ESP32 sent classification within this window

interface MLContextType {
  // Model state
  modelStatus: ModelStatus;
  isMLEnabled: boolean;

  // Classification results
  classifications: BeatClassification[];
  summary: ClassificationSummary;
  patternAlert: PatternAlert | null;

  // Signal state
  signalQualityOk: boolean;

  // Actions
  setMLEnabled: (enabled: boolean) => void;
  clearClassifications: () => void;
}

const emptySummary: ClassificationSummary = {
  totalBeats: 0,
  normalCount: 0,
  pvcCount: 0,
  pacCount: 0,
  possiblePvcCount: 0,
  possiblePacCount: 0,
  windowSeconds: 60,
};

const MLContext = createContext<MLContextType | undefined>(undefined);

interface MLProviderProps {
  children: ReactNode;
}

const LABEL_MAP: BeatLabel[] = ['N', 'PVC', 'PAC'];

export function MLProvider({ children }: MLProviderProps) {
  const { ecgDataBuffer, isConnected, lastClassification } = useBLE();

  const [modelStatus, setModelStatus] = useState<ModelStatus>('loading');
  const [isMLEnabled, setMLEnabled] = useState(true);
  const [classifications, setClassifications] = useState<BeatClassification[]>([]);
  const [summary, setSummary] = useState<ClassificationSummary>(emptySummary);
  const [patternAlert, setPatternAlert] = useState<PatternAlert | null>(null);
  const [signalQualityOk, setSignalQualityOk] = useState(false);

  // Track which R-peak indices we've already classified to avoid duplicates.
  // We use a ref because this changes on every classification cycle
  // and we don't need re-renders from it.
  const classifiedIndicesRef = useRef<Set<number>>(new Set());
  // Separate dedup set for ESP32 firmware indices (different namespace from buffer indices)
  const esp32IndicesRef = useRef<Set<number>>(new Set());
  const classificationsRef = useRef<BeatClassification[]>([]);
  const lastEsp32TimeRef = useRef(0);
  const bufferLengthRef = useRef(0);

  // Load model on mount
  useEffect(() => {
    loadModel().then((status) => {
      setModelStatus(status);
    });
  }, []);

  // Track buffer length in a ref so the ESP32 effect can read it without re-running on every buffer change
  useEffect(() => {
    bufferLengthRef.current = ecgDataBuffer.length;
  }, [ecgDataBuffer]);

  // Ingest classification packets from ESP32 (takes priority over on-device ML)
  useEffect(() => {
    if (!lastClassification || !isConnected) return;

    const { label, confidence, sampleIndex: firmwareIndex } = lastClassification;

    // Dedup using the firmware's own index namespace (separate from buffer indices)
    if (esp32IndicesRef.current.has(firmwareIndex)) return;
    esp32IndicesRef.current.add(firmwareIndex);

    lastEsp32TimeRef.current = Date.now();

    // Map firmware global counter to an approximate buffer index.
    // The R-peak was detected HALF_WINDOW samples behind the current write position.
    const bufferIndex = Math.max(0, bufferLengthRef.current - HALF_WINDOW);

    // Also mark this buffer-relative index as classified so the fallback
    // timer won't re-classify the same beat from the buffer.
    classifiedIndicesRef.current.add(bufferIndex);

    const beatLabel = LABEL_MAP[label] ?? 'N';
    const classification: BeatClassification = {
      label: beatLabel,
      confidence,
      confidenceTier: getConfidenceTier(confidence),
      sampleIndex: bufferIndex,
      timestamp: Date.now(),
    };

    const updated = [...classificationsRef.current, classification];
    const trimmed = updated.length > MAX_CLASSIFICATIONS
      ? updated.slice(-MAX_CLASSIFICATIONS)
      : updated;

    classificationsRef.current = trimmed;
    setClassifications(trimmed);
    setSummary(computeSummary(trimmed));
    setPatternAlert(detectPatternAlert(trimmed));
  }, [lastClassification, isConnected]);

  // Classification loop on 500ms timer (fallback when ESP32 ML is not sending)
  useEffect(() => {
    if (!isConnected || !isMLEnabled || modelStatus === 'error' || modelStatus === 'loading') {
      return;
    }

    const timer = setInterval(() => {
      // Use InteractionManager to avoid blocking animations
      InteractionManager.runAfterInteractions(() => {
        if (ecgDataBuffer.length < 250) return; // Need at least 1 second

        // Skip if ESP32 is actively sending classifications
        if (Date.now() - lastEsp32TimeRef.current < ESP32_ACTIVE_TIMEOUT_MS) return;

        // Check signal quality
        const quality = estimateSignalQuality(ecgDataBuffer);
        const qualityOk = quality >= SIGNAL_QUALITY_THRESHOLD;
        setSignalQualityOk(qualityOk);

        if (!qualityOk) return;

        // Take a snapshot of the buffer for this classification cycle
        const snapshot = ecgDataBuffer.slice();

        // Classify new R-peaks
        const newClassifications = classifyBuffer(snapshot, classifiedIndicesRef.current);

        if (newClassifications.length > 0) {
          // Mark these peaks as classified
          for (const c of newClassifications) {
            classifiedIndicesRef.current.add(c.sampleIndex);
          }

          // Append to classifications list, trim to max
          const updated = [...classificationsRef.current, ...newClassifications];
          const trimmed = updated.length > MAX_CLASSIFICATIONS
            ? updated.slice(-MAX_CLASSIFICATIONS)
            : updated;

          classificationsRef.current = trimmed;
          setClassifications(trimmed);

          // Update summary and pattern detection
          setSummary(computeSummary(trimmed));
          setPatternAlert(detectPatternAlert(trimmed));
        }
      });
    }, CLASSIFICATION_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isConnected, isMLEnabled, modelStatus, ecgDataBuffer]);

  // Clear classifications when disconnected
  useEffect(() => {
    if (!isConnected) {
      classifiedIndicesRef.current.clear();
      esp32IndicesRef.current.clear();
      lastEsp32TimeRef.current = 0;
      classificationsRef.current = [];
      setClassifications([]);
      setSummary(emptySummary);
      setPatternAlert(null);
      setSignalQualityOk(false);
    }
  }, [isConnected]);

  const clearClassifications = useCallback(() => {
    classifiedIndicesRef.current.clear();
    esp32IndicesRef.current.clear();
    lastEsp32TimeRef.current = 0;
    classificationsRef.current = [];
    setClassifications([]);
    setSummary(emptySummary);
    setPatternAlert(null);
  }, []);

  const value: MLContextType = {
    modelStatus,
    isMLEnabled,
    classifications,
    summary,
    patternAlert,
    signalQualityOk,
    setMLEnabled,
    clearClassifications,
  };

  return <MLContext.Provider value={value}>{children}</MLContext.Provider>;
}

export function useML(): MLContextType {
  const context = useContext(MLContext);
  if (context === undefined) {
    throw new Error('useML must be used within an MLProvider');
  }
  return context;
}

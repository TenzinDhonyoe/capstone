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

import { useECGStream } from '@/hooks/use-ble';
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
  ClassificationSummary,
  ModelStatus,
  PatternAlert,
} from '@/services/ml-types';

const CLASSIFICATION_INTERVAL_MS = 500;
const SIGNAL_QUALITY_THRESHOLD = 50;
const MAX_CLASSIFICATIONS = 500; // ~8 minutes at 70bpm

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

export function MLProvider({ children }: MLProviderProps) {
  const { ecgDataBuffer, isConnected } = useECGStream();

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
  const classificationsRef = useRef<BeatClassification[]>([]);

  // Load model on mount
  useEffect(() => {
    loadModel().then((status) => {
      setModelStatus(status);
    });
  }, []);

  // Classification loop on 500ms timer
  useEffect(() => {
    if (!isConnected || !isMLEnabled || modelStatus === 'error' || modelStatus === 'loading') {
      return;
    }

    const timer = setInterval(() => {
      // Use InteractionManager to avoid blocking animations
      InteractionManager.runAfterInteractions(() => {
        if (ecgDataBuffer.length < 250) return; // Need at least 1 second

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
      classificationsRef.current = [];
      setClassifications([]);
      setSummary(emptySummary);
      setPatternAlert(null);
      setSignalQualityOk(false);
    }
  }, [isConnected]);

  const clearClassifications = useCallback(() => {
    classifiedIndicesRef.current.clear();
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

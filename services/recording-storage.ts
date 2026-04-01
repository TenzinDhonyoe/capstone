import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';

const RECORDINGS_KEY = 'sowa_recordings';

export interface SavedRecording {
  id: string;
  date: string;
  time: string;
  duration: string;
  bpm: number;
  hrv: number;
  prInterval: number;
  qtInterval: number;
  rhythm: string;
  condition: string;
  status: 'optimal' | 'normal' | 'warning' | 'critical';
  hasPathology: boolean;
  pathologyNote: string;
  sampleCount: number;
  // ML classification data (optional for backwards compatibility)
  pvcCount?: number;
  pacCount?: number;
  totalClassifiedBeats?: number;
}

export async function saveRecording(recording: SavedRecording): Promise<void> {
  try {
    const existing = await getRecordings();
    const updated = [recording, ...existing];
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
  } catch {
    // Non-critical — log but don't crash
    console.warn('Failed to save recording');
  }
}

export async function getRecordings(): Promise<SavedRecording[]> {
  try {
    const data = await AsyncStorage.getItem(RECORDINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function getRecordingById(id: string): Promise<SavedRecording | null> {
  const recordings = await getRecordings();
  return recordings.find((r) => r.id === id) ?? null;
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    const recordings = await getRecordings();
    const filtered = recordings.filter((r) => r.id !== id);
    await AsyncStorage.setItem(RECORDINGS_KEY, JSON.stringify(filtered));
    await deleteRawSamples(id);
  } catch {
    console.warn('Failed to delete recording');
  }
}

/**
 * Save raw ECG samples to filesystem for waveform replay.
 */
export async function saveRawSamples(recordingId: string, samples: number[]): Promise<void> {
  try {
    const file = new File(Paths.document, 'recordings', `${recordingId}.json`);
    await file.write(JSON.stringify(samples));
  } catch {
    console.warn('Failed to save raw ECG samples');
  }
}

/**
 * Load raw ECG samples from filesystem.
 * Returns null if no samples exist for this recording.
 */
export async function getRawSamples(recordingId: string): Promise<number[] | null> {
  try {
    const file = new File(Paths.document, 'recordings', `${recordingId}.json`);
    if (!file.exists) return null;
    const data = await file.text();
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Delete raw ECG samples file.
 */
async function deleteRawSamples(recordingId: string): Promise<void> {
  try {
    const file = new File(Paths.document, 'recordings', `${recordingId}.json`);
    if (file.exists) {
      await file.delete();
    }
  } catch {
    // Non-critical
  }
}

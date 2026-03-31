import AsyncStorage from '@react-native-async-storage/async-storage';

const RECORDINGS_KEY = 'sowa_recordings';

export interface SavedRecording {
  id: string;
  date: string;
  time: string;
  duration: string;
  bpm: number;
  hrv: number;
  condition: string;
  status: 'optimal' | 'normal' | 'warning' | 'critical';
  hasPathology: boolean;
  pathologyNote: string;
  sampleCount: number;
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
  } catch {
    console.warn('Failed to delete recording');
  }
}

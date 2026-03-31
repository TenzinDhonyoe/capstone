import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_DEVICE_KEY = 'sowa_last_device';

export async function saveLastDevice(deviceId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_DEVICE_KEY, deviceId);
  } catch {
    // Storage write failed — non-critical, ignore
  }
}

export async function getLastDevice(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_DEVICE_KEY);
  } catch {
    return null;
  }
}

export async function clearLastDevice(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_DEVICE_KEY);
  } catch {
    // Storage delete failed — non-critical, ignore
  }
}

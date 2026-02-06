/**
 * BLE Manager Service - Expo Go Compatible Stub
 * 
 * This is a stub version that works in Expo Go.
 * BLE functionality requires a development build.
 * 
 * Run `npx expo run:ios` or `npx expo run:android` for full BLE support.
 */

import { BLEError, BLEErrorType } from '@/constants/ble-constants';

// Define our own types
export interface BLEDevice {
    id: string;
    name: string | null;
    rssi: number | null;
}

export interface BLESubscription {
    remove: () => void;
}

// BLE is NEVER available in Expo Go - this stub always returns false
// Real implementation is loaded in development builds
export function isBLEAvailable(): boolean {
    console.warn('BLE requires development build. Run: npx expo run:ios');
    return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBleManager(): any {
    return null;
}

export function destroyBleManager(): void {
    // No-op in stub
}

export async function requestBLEPermissions(): Promise<boolean> {
    console.warn('BLE requires development build. Run: npx expo run:ios');
    return false;
}

export async function isBluetoothEnabled(): Promise<boolean> {
    return false;
}

export function waitForBluetoothPowerOn(
    callback: (isPoweredOn: boolean) => void
): BLESubscription | null {
    // Immediately call back with false since BLE unavailable
    setTimeout(() => callback(false), 0);
    return null;
}

export function scanForDevices(
    _onDeviceFound: (device: BLEDevice) => void,
    onError: (error: BLEError) => void
): () => void {
    onError(createBLEError('BLUETOOTH_DISABLED', 'BLE requires development build. Run: npx expo run:ios'));
    return () => { };
}

export async function connectToDevice(_deviceId: string): Promise<BLEDevice> {
    throw createBLEError('BLUETOOTH_DISABLED', 'BLE requires development build');
}

export async function disconnectFromDevice(_deviceId: string): Promise<void> {
    // No-op in stub
}

export function subscribeToECGData(
    _deviceId: string,
    _onData: (samples: number[]) => void,
    onError: (error: BLEError) => void
): BLESubscription | null {
    onError(createBLEError('BLUETOOTH_DISABLED', 'BLE requires development build'));
    return null;
}

export function monitorDeviceConnection(
    _deviceId: string,
    _onDisconnect: () => void
): BLESubscription | null {
    return null;
}

export async function isDeviceConnected(_deviceId: string): Promise<boolean> {
    return false;
}

function createBLEError(
    type: BLEErrorType,
    message: string,
    originalError?: Error
): BLEError {
    return {
        type,
        message,
        originalError,
    };
}

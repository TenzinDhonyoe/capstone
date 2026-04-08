/**
 * BLE Manager Service
 *
 * Provides low-level BLE operations using react-native-ble-plx.
 * This module is safe to import in Expo Go/web and will return
 * graceful "BLE unavailable" errors when native support is missing.
 */

import { PermissionsAndroid, Platform, type Permission } from 'react-native';

import { BLE_CONFIG, ECG_LEADS, BLEError, BLEErrorType, type LeadId } from '@/constants/ble-constants';

type BlePlxModule = typeof import('react-native-ble-plx');
type BleManagerInstance = import('react-native-ble-plx').BleManager;
type BleDevice = import('react-native-ble-plx').Device;
type BleSubscriptionInstance = import('react-native-ble-plx').Subscription;

// Define app-level device type to keep BLE library details encapsulated.
export interface BLEDevice {
    id: string;
    name: string | null;
    rssi: number | null;
}

export interface BLESubscription {
    remove: () => void;
}

interface DecodeResult {
    samples: number[];
    pendingLowByte: number | null;
}

const TARGET_SERVICE_UUID = BLE_CONFIG.ESP32_SERVICE_UUID.toLowerCase();

let bleModuleCache: BlePlxModule | null | undefined;
let bleManager: BleManagerInstance | null = null;

// Maintain byte carry-over per device to support odd-sized BLE notifications.
const ecgDecoderState = new Map<string, { pendingLowByte: number | null }>();

function getBleModule(): BlePlxModule | null {
    if (bleModuleCache !== undefined) {
        return bleModuleCache;
    }

    if (Platform.OS === 'web') {
        bleModuleCache = null;
        return bleModuleCache;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        bleModuleCache = require('react-native-ble-plx') as BlePlxModule;
        return bleModuleCache;
    } catch (error) {
        console.warn('BLE module not available. Build a development client to enable BLE.', error);
        bleModuleCache = null;
        return bleModuleCache;
    }
}

function getBleStatePoweredOnValue(): string {
    const moduleRef = getBleModule();
    if (!moduleRef) {
        return 'PoweredOn';
    }
    return moduleRef.State.PoweredOn;
}

export function isBLEAvailable(): boolean {
    return getBleManager() !== null;
}

export function getBleManager(): BleManagerInstance | null {
    const moduleRef = getBleModule();
    if (!moduleRef) {
        return null;
    }

    if (!bleManager) {
        try {
            bleManager = new moduleRef.BleManager();
        } catch (error) {
            console.warn('BLE manager initialization failed. Use a development build with native BLE support.', error);
            return null;
        }
    }

    return bleManager;
}

export function destroyBleManager(): void {
    if (bleManager) {
        bleManager.destroy();
        bleManager = null;
    }

    ecgDecoderState.clear();
}

export async function requestBLEPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
        return false;
    }

    if (Platform.OS === 'ios') {
        // iOS prompts on first BLE access; no explicit runtime permission API is required.
        return true;
    }

    if (Platform.OS !== 'android') {
        return true;
    }

    const sdkInt = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);

    if (sdkInt >= 31) {
        const permissionsToRequest: Permission[] = [];

        if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN) {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        }
        if (PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT) {
            permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }

        const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);
        return permissionsToRequest.every(
            (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED
        );
    }

    const locationStatus = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
    return locationStatus === PermissionsAndroid.RESULTS.GRANTED;
}

export async function isBluetoothEnabled(): Promise<boolean> {
    const manager = getBleManager();
    if (!manager) {
        return false;
    }

    try {
        const state = await manager.state();
        return state === getBleStatePoweredOnValue();
    } catch {
        return false;
    }
}

export function waitForBluetoothPowerOn(callback: (isPoweredOn: boolean) => void): BLESubscription | null {
    const manager = getBleManager();
    if (!manager) {
        setTimeout(() => callback(false), 0);
        return null;
    }

    const poweredOnValue = getBleStatePoweredOnValue();
    const subscription = manager.onStateChange((state) => {
        callback(state === poweredOnValue);
    }, true);

    return wrapSubscription(subscription);
}

export function scanForDevices(
    onDeviceFound: (device: BLEDevice) => void,
    onError: (error: BLEError) => void
): () => void {
    const manager = getBleManager();
    if (!manager) {
        onError(
            createBLEError('BLUETOOTH_DISABLED', 'BLE not available. Build a development client to use Bluetooth.')
        );
        return () => {
            // noop
        };
    }

    const seenDeviceIds = new Set<string>();

    manager.startDeviceScan(
        null,
        { allowDuplicates: BLE_CONFIG.SCAN_OPTIONS.allowDuplicates },
        (error, device) => {
            if (error) {
                onError(mapBleError(error, 'SCAN_FAILED', 'Failed to scan for BLE devices'));
                return;
            }

            if (!device || !isTargetDevice(device)) {
                return;
            }

            if (seenDeviceIds.has(device.id)) {
                return;
            }

            seenDeviceIds.add(device.id);
            onDeviceFound(toBLEDevice(device));
        }
    );

    return () => {
        manager.stopDeviceScan();
    };
}

export async function connectToDevice(deviceId: string): Promise<BLEDevice> {
    const manager = getBleManager();
    if (!manager) {
        throw createBLEError('BLUETOOTH_DISABLED', 'BLE not available. Build a development client to use Bluetooth.');
    }

    try {
        const connectedDevice = await manager.connectToDevice(deviceId, {
            timeout: BLE_CONFIG.CONNECTION_TIMEOUT_MS,
        });

        const discoveredDevice = await connectedDevice.discoverAllServicesAndCharacteristics();

        try {
            const refreshedDevice = await discoveredDevice.readRSSI();
            return toBLEDevice(refreshedDevice);
        } catch {
            return toBLEDevice(discoveredDevice);
        }
    } catch (error) {
        throw mapBleError(error, 'CONNECTION_FAILED', `Failed to connect to device ${deviceId}`);
    }
}

export async function disconnectFromDevice(deviceId: string): Promise<void> {
    const manager = getBleManager();
    if (!manager) {
        return;
    }

    ecgDecoderState.delete(deviceId);

    try {
        await manager.cancelDeviceConnection(deviceId);
    } catch (error) {
        // Ignore expected disconnect races where device is already disconnected.
        const message = getErrorMessage(error).toLowerCase();
        if (!message.includes('already disconnected') && !message.includes('not connected')) {
            throw mapBleError(error, 'UNKNOWN', `Failed to disconnect from device ${deviceId}`);
        }
    }
}

export function subscribeToAllLeads(
    deviceId: string,
    onData: (lead: LeadId, samples: number[]) => void,
    onError: (error: BLEError) => void
): BLESubscription | null {
    const manager = getBleManager();
    if (!manager) {
        onError(createBLEError('BLUETOOTH_DISABLED', 'BLE not available. Build a development client to use Bluetooth.'));
        return null;
    }

    const ts = Date.now();
    const subscriptions: BleSubscriptionInstance[] = [];
    const transactionIds: string[] = [];

    for (const lead of ECG_LEADS) {
        const decoderKey = `${deviceId}:${lead.id}`;
        const transactionId = `ecg-${lead.id}-${deviceId}-${ts}`;
        transactionIds.push(transactionId);
        ecgDecoderState.set(decoderKey, { pendingLowByte: null });

        const sub = manager.monitorCharacteristicForDevice(
            deviceId,
            BLE_CONFIG.ESP32_SERVICE_UUID,
            lead.uuid,
            (error, characteristic) => {
                if (error) {
                    onError(mapBleError(error, 'UNKNOWN', `Error monitoring ${lead.id} data`));
                    return;
                }

                if (!characteristic?.value) return;

                const state = ecgDecoderState.get(decoderKey) ?? { pendingLowByte: null };
                const { samples, pendingLowByte } = decodeEcgSamples(characteristic.value, state.pendingLowByte);
                ecgDecoderState.set(decoderKey, { pendingLowByte });

                if (samples.length > 0) {
                    onData(lead.id, samples);
                }
            },
            transactionId
        );

        subscriptions.push(sub);
    }

    return {
        remove: () => {
            for (const tid of transactionIds) {
                try { manager.cancelTransaction(tid); } catch { /* noop */ }
            }
            for (const sub of subscriptions) {
                sub.remove();
            }
            for (const lead of ECG_LEADS) {
                ecgDecoderState.delete(`${deviceId}:${lead.id}`);
            }
        },
    };
}

export interface ClassificationPacket {
    label: 0 | 1 | 2;        // 0=Normal, 1=PVC, 2=PAC
    confidence: number;       // 0.0 – 1.0
    sampleIndex: number;
    heartRate: number;        // BPM (float)
}

export function subscribeToClassification(
    deviceId: string,
    onData: (packet: ClassificationPacket) => void,
    onError: (error: BLEError) => void
): BLESubscription | null {
    const manager = getBleManager();
    if (!manager) {
        onError(createBLEError('BLUETOOTH_DISABLED', 'BLE not available.'));
        return null;
    }

    const transactionId = `classify-stream-${deviceId}-${Date.now()}`;

    const subscription = manager.monitorCharacteristicForDevice(
        deviceId,
        BLE_CONFIG.ESP32_SERVICE_UUID,
        BLE_CONFIG.CLASSIFICATION_CHARACTERISTIC_UUID,
        (error, characteristic) => {
            if (error) {
                onError(mapBleError(error, 'UNKNOWN', 'Error while monitoring classification data'));
                return;
            }

            if (!characteristic?.value) {
                return;
            }

            const bytes = decodeBase64ToBytes(characteristic.value);
            if (bytes.length < 8) return;

            const label = bytes[0] as 0 | 1 | 2;
            const confRaw = bytes[1] | (bytes[2] << 8);
            const confidence = confRaw / 10000;
            const sampleIndex = bytes[3] | (bytes[4] << 8);
            const hrRaw = bytes[5] | (bytes[6] << 8);
            const heartRate = hrRaw / 10;

            onData({ label, confidence, sampleIndex, heartRate });
        },
        transactionId
    );

    return {
        remove: () => {
            try {
                manager.cancelTransaction(transactionId);
            } catch {
                // noop
            }
            subscription.remove();
        },
    };
}

export function monitorDeviceConnection(
    deviceId: string,
    onDisconnect: () => void
): BLESubscription | null {
    const manager = getBleManager();
    if (!manager) {
        return null;
    }

    const subscription = manager.onDeviceDisconnected(deviceId, () => {
        onDisconnect();
    });

    return wrapSubscription(subscription);
}

export async function isDeviceConnected(deviceId: string): Promise<boolean> {
    const manager = getBleManager();
    if (!manager) {
        return false;
    }

    try {
        return await manager.isDeviceConnected(deviceId);
    } catch {
        return false;
    }
}

function decodeEcgSamples(base64Value: string, pendingLowByte: number | null): DecodeResult {
    let bytes = decodeBase64ToBytes(base64Value);

    if (pendingLowByte !== null) {
        const merged = new Uint8Array(bytes.length + 1);
        merged[0] = pendingLowByte;
        merged.set(bytes, 1);
        bytes = merged;
    }

    const gain = Math.max(1, Number(BLE_CONFIG.SAMPLE_GAIN));
    const completeByteCount = bytes.length - (bytes.length % 2);
    const samples: number[] = [];

    for (let index = 0; index < completeByteCount; index += 2) {
        const lowByte = bytes[index];
        const highByte = bytes[index + 1];
        const combined = (highByte << 8) | lowByte;
        const signedSample = combined >= 0x8000 ? combined - 0x10000 : combined;
        const normalizedSample = (signedSample - BLE_CONFIG.SAMPLE_OFFSET) / gain;
        samples.push(normalizedSample);
    }

    const nextPendingLowByte = bytes.length % 2 === 1 ? bytes[bytes.length - 1] : null;

    return {
        samples,
        pendingLowByte: nextPendingLowByte,
    };
}

function decodeBase64ToBytes(base64Value: string): Uint8Array {
    if (!base64Value) {
        return new Uint8Array(0);
    }

    if (typeof globalThis.atob === 'function') {
        const binary = globalThis.atob(base64Value);
        const bytes = new Uint8Array(binary.length);

        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index);
        }

        return bytes;
    }

    return decodeBase64Fallback(base64Value);
}

function decodeBase64Fallback(base64Value: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = base64Value.replace(/\s/g, '');
    const output: number[] = [];

    let bitBuffer = 0;
    let bitCount = 0;

    for (let index = 0; index < clean.length; index += 1) {
        const char = clean[index];
        if (char === '=') {
            break;
        }

        const sextet = alphabet.indexOf(char);
        if (sextet < 0) {
            continue;
        }

        bitBuffer = (bitBuffer << 6) | sextet;
        bitCount += 6;

        while (bitCount >= 8) {
            bitCount -= 8;
            output.push((bitBuffer >> bitCount) & 0xff);
        }
    }

    return Uint8Array.from(output);
}

function isTargetDevice(device: BleDevice): boolean {
    const advertisedName = (device.name ?? device.localName ?? '').trim();
    const hasMatchingName = advertisedName
        .toUpperCase()
        .startsWith(BLE_CONFIG.DEVICE_NAME_PREFIX.toUpperCase());

    const advertisedServiceUuids = (device.serviceUUIDs ?? []).map((uuid) => uuid.toLowerCase());
    const hasMatchingService = advertisedServiceUuids.includes(TARGET_SERVICE_UUID);

    return hasMatchingName || hasMatchingService;
}

function toBLEDevice(device: BleDevice): BLEDevice {
    return {
        id: device.id,
        name: device.name ?? device.localName ?? null,
        rssi: device.rssi ?? null,
    };
}

function mapBleError(
    error: unknown,
    fallbackType: BLEErrorType,
    fallbackMessage: string
): BLEError {
    const message = getErrorMessage(error) || fallbackMessage;
    const lowerMessage = message.toLowerCase();

    let type = fallbackType;

    if (lowerMessage.includes('permission') || lowerMessage.includes('authorized')) {
        type = 'PERMISSION_DENIED';
    } else if (
        lowerMessage.includes('bluetooth') &&
        (lowerMessage.includes('off') || lowerMessage.includes('disabled') || lowerMessage.includes('powered'))
    ) {
        type = 'BLUETOOTH_DISABLED';
    } else if (lowerMessage.includes('characteristic')) {
        type = 'CHARACTERISTIC_NOT_FOUND';
    } else if (lowerMessage.includes('service')) {
        type = 'SERVICE_NOT_FOUND';
    } else if (lowerMessage.includes('scan')) {
        type = 'SCAN_FAILED';
    } else if (lowerMessage.includes('not found')) {
        type = 'DEVICE_NOT_FOUND';
    } else if (lowerMessage.includes('connect')) {
        type = 'CONNECTION_FAILED';
    }

    return createBLEError(type, message, error instanceof Error ? error : undefined);
}

function getErrorMessage(error: unknown): string {
    if (typeof error === 'string') {
        return error;
    }

    if (error && typeof error === 'object') {
        const message = Reflect.get(error, 'message');
        if (typeof message === 'string') {
            return message;
        }

        const reason = Reflect.get(error, 'reason');
        if (typeof reason === 'string') {
            return reason;
        }
    }

    return 'Unknown BLE error';
}

function createBLEError(type: BLEErrorType, message: string, originalError?: Error): BLEError {
    return {
        type,
        message,
        originalError,
    };
}

function wrapSubscription(subscription: BleSubscriptionInstance | null): BLESubscription | null {
    if (!subscription) {
        return null;
    }

    return {
        remove: () => subscription.remove(),
    };
}

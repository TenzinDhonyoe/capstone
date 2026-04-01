/**
 * BLE Context Provider
 * 
 * Provides BLE state and actions to the entire app via React Context.
 * Manages device scanning, connection, and ECG data streaming from ESP32.
 * 
 * NOTE: BLE only works in development builds. In Expo Go, all BLE operations
 * are gracefully disabled and the UI shows "BLE not available".
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
import { AppState, AppStateStatus } from 'react-native';

import { BLE_CONFIG, BLEError, ConnectionStatus } from '@/constants/ble-constants';
import {
    connectToDevice,
    destroyBleManager,
    disconnectFromDevice,
    getBleManager,
    isBLEAvailable,
    monitorDeviceConnection,
    requestBLEPermissions,
    scanForDevices,
    subscribeToECGData,
    subscribeToClassification,
    waitForBluetoothPowerOn,
} from '@/services/ble-manager';
import type { ClassificationPacket } from '@/services/ble-manager';
import { getLastDevice, saveLastDevice, clearLastDevice } from '@/services/device-storage';

// Use generic Device type to avoid importing from react-native-ble-plx directly
interface BLEDevice {
    id: string;
    name: string | null;
    rssi: number | null;
}

interface BLEContextType {
    // Bluetooth state
    isBluetoothEnabled: boolean;
    permissionsGranted: boolean;
    isBLESupported: boolean;

    // Connection state
    connectionStatus: ConnectionStatus;
    isScanning: boolean;
    isConnected: boolean;
    connectedDevice: BLEDevice | null;

    // Device discovery
    discoveredDevices: BLEDevice[];

    // ECG data stream
    ecgDataBuffer: number[];

    // ESP32 classification packets
    lastClassification: ClassificationPacket | null;

    // Signal quality (based on connection RSSI)
    signalQuality: number;

    // Error state
    error: BLEError | null;

    // Actions
    requestPermissions: () => Promise<boolean>;
    startScan: () => void;
    stopScan: () => void;
    connectToDevice: (deviceId: string) => Promise<void>;
    disconnect: () => Promise<void>;
    clearError: () => void;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);

interface BLEProviderProps {
    children: ReactNode;
}

export function BLEProvider({ children }: BLEProviderProps) {
    // Check if BLE is available (not in Expo Go)
    const [isBLESupported] = useState(() => isBLEAvailable());

    // Bluetooth state
    const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(false);
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    // Connection state
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [connectedDevice, setConnectedDevice] = useState<BLEDevice | null>(null);

    // Device discovery
    const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);

    // ECG data
    const [ecgDataBuffer, setEcgDataBuffer] = useState<number[]>([]);

    // ESP32 classification
    const [lastClassification, setLastClassification] = useState<ClassificationPacket | null>(null);
    const classificationSubscription = useRef<{ remove: () => void } | null>(null);

    // Signal quality (0-100)
    const [signalQuality, setSignalQuality] = useState(0);

    // Error state
    const [error, setError] = useState<BLEError | null>(null);

    // Subscriptions refs - using 'any' to avoid importing types from react-native-ble-plx
    const bluetoothStateSubscription = useRef<{ remove: () => void } | null>(null);
    const ecgDataSubscription = useRef<{ remove: () => void } | null>(null);
    const connectionMonitorSubscription = useRef<{ remove: () => void } | null>(null);
    const scanStopFunction = useRef<(() => void) | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectAttempts = useRef(0);

    // Computed states
    const isScanning = connectionStatus === 'scanning';
    const isConnected = connectionStatus === 'connected';

    // Initialize BLE manager and bluetooth state monitoring
    useEffect(() => {
        if (!isBLESupported) {
            // BLE not available (e.g., Expo Go) - show warning but don't crash
            console.warn('BLE not available - requires development build (npx expo run:ios/android)');
            return;
        }

        getBleManager();

        bluetoothStateSubscription.current = waitForBluetoothPowerOn((isPoweredOn) => {
            setIsBluetoothEnabled(isPoweredOn);
        });

        // Auto-connect to last known device
        const tryAutoConnect = async () => {
            const lastDeviceId = await getLastDevice();
            if (lastDeviceId) {
                const granted = await requestBLEPermissions();
                if (granted) {
                    setPermissionsGranted(true);
                    // Small delay to let BLE state settle
                    setTimeout(() => {
                        handleConnectToDevice(lastDeviceId);
                    }, 1500);
                }
            }
        };
        tryAutoConnect();

        return () => {
            cleanup();
            destroyBleManager();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Handle app state changes (background/foreground)
    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active' && connectedDevice) {
                // App came to foreground - check if still connected
                // Device connection will be monitored by the subscription
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [connectedDevice]);

    // Cleanup all subscriptions
    const cleanup = useCallback(() => {
        if (bluetoothStateSubscription.current) {
            bluetoothStateSubscription.current.remove();
        }
        if (ecgDataSubscription.current) {
            ecgDataSubscription.current.remove();
        }
        if (classificationSubscription.current) {
            classificationSubscription.current.remove();
        }
        if (connectionMonitorSubscription.current) {
            connectionMonitorSubscription.current.remove();
        }
        if (scanStopFunction.current) {
            scanStopFunction.current();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
    }, []);

    // Request BLE permissions
    const requestPermissions = useCallback(async (): Promise<boolean> => {
        if (!isBLESupported) {
            setError({
                type: 'BLUETOOTH_DISABLED',
                message: 'BLE not available - requires development build',
            });
            return false;
        }
        const granted = await requestBLEPermissions();
        setPermissionsGranted(granted);
        return granted;
    }, [isBLESupported]);

    // Start scanning for devices
    const startScan = useCallback(() => {
        if (!isBLESupported) {
            setError({
                type: 'BLUETOOTH_DISABLED',
                message: 'BLE not available - requires development build',
            });
            return;
        }

        if (!isBluetoothEnabled || !permissionsGranted) {
            setError({
                type: !isBluetoothEnabled ? 'BLUETOOTH_DISABLED' : 'PERMISSION_DENIED',
                message: !isBluetoothEnabled
                    ? 'Bluetooth is not enabled'
                    : 'Bluetooth permissions not granted',
            });
            return;
        }

        setConnectionStatus('scanning');
        setDiscoveredDevices([]);
        setError(null);

        scanStopFunction.current = scanForDevices(
            (device) => {
                const bleDevice: BLEDevice = {
                    id: device.id,
                    name: device.name,
                    rssi: device.rssi,
                };

                setDiscoveredDevices((prev) => {
                    // Avoid duplicates
                    if (prev.find((d) => d.id === bleDevice.id)) {
                        return prev;
                    }
                    return [...prev, bleDevice];
                });

                // Update signal quality based on RSSI
                if (device.rssi) {
                    // Convert RSSI to 0-100 scale (-100 dBm = 0%, -40 dBm = 100%)
                    const quality = Math.min(100, Math.max(0, (device.rssi + 100) * (100 / 60)));
                    setSignalQuality(Math.round(quality));
                }
            },
            (err) => {
                setError(err);
                setConnectionStatus('disconnected');
            }
        );

        // Auto-stop scan after timeout
        setTimeout(() => {
            stopScan();
        }, BLE_CONFIG.SCAN_TIMEOUT_MS);
    }, [isBLESupported, isBluetoothEnabled, permissionsGranted]);

    // Stop scanning
    const stopScan = useCallback(() => {
        if (scanStopFunction.current) {
            scanStopFunction.current();
            scanStopFunction.current = null;
        }
        if (connectionStatus === 'scanning') {
            setConnectionStatus('disconnected');
        }
    }, [connectionStatus]);

    // Connect to a device
    const handleConnectToDevice = useCallback(async (deviceId: string) => {
        if (!isBLESupported) {
            setError({
                type: 'BLUETOOTH_DISABLED',
                message: 'BLE not available - requires development build',
            });
            return;
        }

        stopScan();
        setConnectionStatus('connecting');
        setError(null);

        try {
            const device = await connectToDevice(deviceId);
            const bleDevice: BLEDevice = {
                id: device.id,
                name: device.name,
                rssi: device.rssi,
            };

            setConnectedDevice(bleDevice);
            setConnectionStatus('connected');
            reconnectAttempts.current = 0;

            // Persist for auto-reconnect
            saveLastDevice(deviceId);

            // Start monitoring for disconnection
            connectionMonitorSubscription.current = monitorDeviceConnection(
                deviceId,
                () => handleDisconnection(deviceId)
            );

            // Subscribe to ECG data
            ecgDataSubscription.current = subscribeToECGData(
                deviceId,
                (samples) => {
                    setEcgDataBuffer((prev) => {
                        const newBuffer = [...prev, ...samples];
                        // Keep buffer at max size
                        if (newBuffer.length > BLE_CONFIG.BUFFER_SIZE) {
                            return newBuffer.slice(-BLE_CONFIG.BUFFER_SIZE);
                        }
                        return newBuffer;
                    });
                },
                (err) => {
                    console.error('ECG data error:', err);
                }
            );

            // Subscribe to ESP32 classification results
            classificationSubscription.current = subscribeToClassification(
                deviceId,
                (packet) => {
                    setLastClassification(packet);
                },
                (err) => {
                    console.error('Classification data error:', err);
                }
            );
        } catch (err) {
            setError(err as BLEError);
            setConnectionStatus('disconnected');
            setConnectedDevice(null);
        }
    }, [isBLESupported, stopScan]);

    // Handle unexpected disconnection
    const handleDisconnection = useCallback((deviceId: string) => {
        if (ecgDataSubscription.current) {
            ecgDataSubscription.current.remove();
            ecgDataSubscription.current = null;
        }
        if (classificationSubscription.current) {
            classificationSubscription.current.remove();
            classificationSubscription.current = null;
        }

        if (BLE_CONFIG.AUTO_RECONNECT && reconnectAttempts.current < BLE_CONFIG.RECONNECT_ATTEMPTS) {
            setConnectionStatus('reconnecting');
            reconnectAttempts.current += 1;

            reconnectTimeoutRef.current = setTimeout(() => {
                handleConnectToDevice(deviceId);
            }, BLE_CONFIG.RECONNECT_DELAY_MS);
        } else {
            setConnectionStatus('disconnected');
            setConnectedDevice(null);
            reconnectAttempts.current = 0;
        }
    }, [handleConnectToDevice]);

    // Disconnect from current device
    const disconnect = useCallback(async () => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (ecgDataSubscription.current) {
            ecgDataSubscription.current.remove();
            ecgDataSubscription.current = null;
        }

        if (classificationSubscription.current) {
            classificationSubscription.current.remove();
            classificationSubscription.current = null;
        }

        if (connectionMonitorSubscription.current) {
            connectionMonitorSubscription.current.remove();
            connectionMonitorSubscription.current = null;
        }

        if (connectedDevice) {
            await disconnectFromDevice(connectedDevice.id);
        }

        setConnectedDevice(null);
        setConnectionStatus('disconnected');
        setEcgDataBuffer([]);
        setLastClassification(null);
        reconnectAttempts.current = 0;

        // Clear stored device on manual disconnect
        clearLastDevice();
    }, [connectedDevice]);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: BLEContextType = {
        isBluetoothEnabled,
        permissionsGranted,
        isBLESupported,
        connectionStatus,
        isScanning,
        isConnected,
        connectedDevice,
        discoveredDevices,
        ecgDataBuffer,
        lastClassification,
        signalQuality,
        error,
        requestPermissions,
        startScan,
        stopScan,
        connectToDevice: handleConnectToDevice,
        disconnect,
        clearError,
    };

    return <BLEContext.Provider value={value}>{children}</BLEContext.Provider>;
}

export function useBLE(): BLEContextType {
    const context = useContext(BLEContext);
    if (context === undefined) {
        throw new Error('useBLE must be used within a BLEProvider');
    }
    return context;
}

// Convenience hooks
export function useBLEConnection() {
    const { connectionStatus, isConnected, connectedDevice, connectToDevice, disconnect } = useBLE();
    return { connectionStatus, isConnected, connectedDevice, connectToDevice, disconnect };
}

export function useECGStream() {
    const { ecgDataBuffer, isConnected } = useBLE();
    return { ecgDataBuffer, isConnected };
}

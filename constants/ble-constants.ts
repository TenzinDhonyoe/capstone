/**
 * BLE Configuration Constants for ESP32 ECG Sensor
 * 
 * Replace the UUIDs below with your actual ESP32 firmware UUIDs.
 * These are placeholder values that need to be configured.
 */

export const BLE_CONFIG = {
    // ESP32 BLE Service and Characteristic UUIDs
    // TODO: Replace with actual UUIDs from your ESP32 firmware
    ESP32_SERVICE_UUID: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
    ECG_CHARACTERISTIC_UUID: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',

    // Device identification
    DEVICE_NAME_PREFIX: 'SOWA',

    // Scanning configuration
    SCAN_TIMEOUT_MS: 10000,
    SCAN_OPTIONS: {
        allowDuplicates: false,
    },

    // Connection configuration
    AUTO_RECONNECT: true,
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY_MS: 2000,
    CONNECTION_TIMEOUT_MS: 10000,

    // Data configuration
    SAMPLE_RATE: 250, // Hz - samples per second from ESP32
    BUFFER_SIZE: 2500, // Store ~10 seconds of data
    SAMPLE_GAIN: 2048, // Convert raw int16 samples to render-friendly normalized values
    SAMPLE_OFFSET: 0, // Raw ADC baseline offset (adjust if your ESP32 has DC bias)
} as const;

// Connection status types
export type ConnectionStatus =
    | 'disconnected'
    | 'scanning'
    | 'connecting'
    | 'connected'
    | 'reconnecting';

// BLE Error types for better error handling
export type BLEErrorType =
    | 'BLUETOOTH_DISABLED'
    | 'PERMISSION_DENIED'
    | 'DEVICE_NOT_FOUND'
    | 'CONNECTION_FAILED'
    | 'SERVICE_NOT_FOUND'
    | 'CHARACTERISTIC_NOT_FOUND'
    | 'SCAN_FAILED'
    | 'UNKNOWN';

export interface BLEError {
    type: BLEErrorType;
    message: string;
    originalError?: Error;
}

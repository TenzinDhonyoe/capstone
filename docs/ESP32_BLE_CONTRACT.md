# ESP32 BLE Contract (ECG Stream)

This contract defines the BLE payload and GATT behavior expected by the Sowa mobile app.

## Required GATT Shape

- Device role: BLE peripheral (ESP32)
- App role: BLE central (iOS/Android)
- Service UUID: must match `BLE_CONFIG.ESP32_SERVICE_UUID`
- ECG characteristic UUID: must match `BLE_CONFIG.ECG_CHARACTERISTIC_UUID`
- ECG characteristic properties:
  - `notify` required
  - `read` optional
- ECG characteristic descriptor:
  - CCCD enabled by central during subscription

## Device Identification

At least one of these should match so scanning can discover target devices:

1. Advertised local name starts with `BLE_CONFIG.DEVICE_NAME_PREFIX` (default `SOWA`)
2. Advertised service UUID list includes the configured ECG service UUID

## ECG Payload Format

Notifications are interpreted as a raw stream of contiguous signed 16-bit integers.

- Endianness: little-endian
- Type: `int16`
- Sample packing: 2 bytes per sample
- Sample rate target: 250 Hz

### Byte-to-sample decode

Given byte pair `[low, high]`:

```text
raw = (high << 8) | low
if raw >= 0x8000: raw = raw - 0x10000
```

Example:

- bytes: `0x18 0xFC`
- combined: `0xFC18`
- decoded sample: `-1000`

### Odd-byte packet handling

If a notification ends with one byte, the app carries that byte and combines it with the first byte of the next notification.

## App-side Normalization

Decoded sample is normalized before rendering:

```text
normalized = (rawInt16 - SAMPLE_OFFSET) / SAMPLE_GAIN
```

Default app config:

- `SAMPLE_GAIN = 500`
- `SAMPLE_OFFSET = 0`

Firmware centers at the 2.5V midrail bias (`analogReadMilliVolts() - 2500`),
so `SAMPLE_OFFSET` stays 0. If waveform amplitude is too large/small, tune `SAMPLE_GAIN`.

## Packet Sizing Guidance

For 360 Hz ECG:

- 360 samples/sec = 720 bytes/sec raw payload
- Firmware sends 40 bytes (20 samples) per notification → 18 packets/sec

Keep cadence consistent to reduce jitter in UI rendering.

## Connection and Reliability Guidance

- Start advertising before mobile scan.
- Keep notification stream continuous after central subscribes.
- Avoid changing UUIDs per boot.
- Re-advertise quickly after disconnect so app reconnect can succeed.

## Validation Checklist

- App can discover ESP32 by prefix/service filter.
- App connects and discovers service/characteristic.
- App receives notifications with non-empty values.
- Decoded values include expected positive and negative swings.
- Waveform updates continuously for at least 60 seconds.

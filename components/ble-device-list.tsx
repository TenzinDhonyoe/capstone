/**
 * BLE Device List Component
 * 
 * Displays discovered BLE devices during scanning and allows connection.
 */

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import {
    BorderRadius,
    Spacing,
    StatusColors,
    Typography,
} from '@/constants/theme';
import { useBLE } from '@/hooks/use-ble';
import { useThemeColor } from '@/hooks/use-theme-color';

// Internal device type matching the context
interface BLEDevice {
    id: string;
    name: string | null;
    rssi: number | null;
}

interface BLEDeviceListProps {
    visible: boolean;
    onClose: () => void;
}

export function BLEDeviceList({ visible, onClose }: BLEDeviceListProps) {
    const {
        isBluetoothEnabled,
        permissionsGranted,
        isBLESupported,
        isScanning,
        isConnected,
        connectionStatus,
        connectedDevice,
        discoveredDevices,
        error,
        requestPermissions,
        startScan,
        stopScan,
        connectToDevice,
        disconnect,
        clearError,
    } = useBLE();

    const bg = useThemeColor({}, 'background');
    const cardBg = useThemeColor({}, 'card');
    const cardBorder = useThemeColor({}, 'cardBorder');
    const textColor = useThemeColor({}, 'text');
    const secondaryText = useThemeColor({}, 'textSecondary');

    const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

    const handleConnect = async (device: BLEDevice) => {
        setConnectingDeviceId(device.id);
        try {
            await connectToDevice(device.id);
            onClose();
        } finally {
            setConnectingDeviceId(null);
        }
    };

    const handleScan = async () => {
        if (!permissionsGranted) {
            const granted = await requestPermissions();
            if (!granted) return;
        }
        clearError();
        startScan();
    };

    const getRSSIIcon = (rssi: number | null): 'cellular' | 'cellular-outline' => {
        if (!rssi) return 'cellular-outline';
        return rssi > -60 ? 'cellular' : 'cellular-outline';
    };

    const renderDevice = ({ item }: { item: BLEDevice }) => {
        const isConnecting = connectingDeviceId === item.id;
        const isThisDeviceConnected = connectedDevice?.id === item.id;

        return (
            <TouchableOpacity
                style={[styles.deviceItem, { backgroundColor: cardBg, borderColor: cardBorder }]}
                onPress={() => !isThisDeviceConnected && handleConnect(item)}
                disabled={isConnecting || isThisDeviceConnected}
                activeOpacity={0.7}
            >
                <View style={styles.deviceInfo}>
                    <Ionicons
                        name="hardware-chip-outline"
                        size={24}
                        color={isThisDeviceConnected ? StatusColors.green : textColor}
                    />
                    <View style={styles.deviceText}>
                        <Text style={[styles.deviceName, { color: textColor }]}>
                            {item.name || 'Unknown Device'}
                        </Text>
                        <Text style={[styles.deviceId, { color: secondaryText }]}>
                            {item.id.slice(0, 17)}...
                        </Text>
                    </View>
                </View>
                <View style={styles.deviceActions}>
                    <Ionicons
                        name={getRSSIIcon(item.rssi)}
                        size={18}
                        color={secondaryText}
                    />
                    {isConnecting ? (
                        <ActivityIndicator size="small" color={StatusColors.blue} />
                    ) : isThisDeviceConnected ? (
                        <View style={styles.connectedBadge}>
                            <Text style={styles.connectedText}>Connected</Text>
                        </View>
                    ) : (
                        <Ionicons name="chevron-forward" size={20} color={secondaryText} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: bg }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: textColor }]}>Connect Device</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Ionicons name="close" size={28} color={textColor} />
                    </TouchableOpacity>
                </View>

                {/* Bluetooth Status */}
                {!isBluetoothEnabled && (
                    <View style={[styles.statusBanner, { backgroundColor: StatusColors.red + '20' }]}>
                        <Ionicons name="bluetooth-outline" size={20} color={StatusColors.red} />
                        <Text style={[styles.statusText, { color: StatusColors.red }]}>
                            Bluetooth is disabled. Please enable it in Settings.
                        </Text>
                    </View>
                )}

                {/* Error Banner */}
                {error && (
                    <TouchableOpacity
                        style={[styles.statusBanner, { backgroundColor: StatusColors.orange + '20' }]}
                        onPress={clearError}
                    >
                        <Ionicons name="warning-outline" size={20} color={StatusColors.orange} />
                        <Text style={[styles.statusText, { color: StatusColors.orange }]}>
                            {error.message}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Connected Device */}
                {isConnected && connectedDevice && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: secondaryText }]}>
                            Connected
                        </Text>
                        <View style={[styles.connectedCard, { backgroundColor: cardBg, borderColor: StatusColors.green }]}>
                            <View style={styles.deviceInfo}>
                                <Ionicons name="bluetooth" size={24} color={StatusColors.green} />
                                <View style={styles.deviceText}>
                                    <Text style={[styles.deviceName, { color: textColor }]}>
                                        {connectedDevice.name || 'ECG Sensor'}
                                    </Text>
                                    <Text style={[styles.deviceId, { color: StatusColors.green }]}>
                                        {connectionStatus}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={styles.disconnectButton}
                                onPress={disconnect}
                            >
                                <Text style={styles.disconnectText}>Disconnect</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Available Devices */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: secondaryText }]}>
                            {isScanning ? 'Scanning...' : 'Available Devices'}
                        </Text>
                        {isScanning && (
                            <ActivityIndicator size="small" color={StatusColors.blue} />
                        )}
                    </View>

                    {discoveredDevices.length > 0 ? (
                        <FlatList
                            data={discoveredDevices}
                            keyExtractor={(item) => item.id}
                            renderItem={renderDevice}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons
                                name={isScanning ? 'radio-outline' : 'bluetooth-outline'}
                                size={48}
                                color={secondaryText}
                            />
                            <Text style={[styles.emptyText, { color: secondaryText }]}>
                                {isScanning
                                    ? 'Looking for ECG sensors...'
                                    : 'No devices found. Tap scan to search.'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Scan Button */}
                <TouchableOpacity
                    style={[
                        styles.scanButton,
                        isScanning && styles.scanButtonScanning,
                    ]}
                    onPress={isScanning ? stopScan : handleScan}
                    disabled={!isBluetoothEnabled}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={isScanning ? 'stop' : 'search'}
                        size={20}
                        color="#FFFFFF"
                    />
                    <Text style={styles.scanButtonText}>
                        {isScanning ? 'Stop Scanning' : 'Scan for Devices'}
                    </Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    title: {
        ...Typography.h2,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginBottom: Spacing.md,
    },
    statusText: {
        ...Typography.body,
        flex: 1,
    },
    section: {
        flex: 1,
        marginTop: Spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        ...Typography.caption,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    connectedCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
    },
    deviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        marginBottom: Spacing.sm,
    },
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        flex: 1,
    },
    deviceText: {
        flex: 1,
    },
    deviceName: {
        ...Typography.bodyBold,
    },
    deviceId: {
        ...Typography.small,
        marginTop: 2,
    },
    deviceActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    connectedBadge: {
        backgroundColor: StatusColors.green + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
    },
    connectedText: {
        ...Typography.small,
        color: StatusColors.green,
        fontWeight: '600',
    },
    disconnectButton: {
        backgroundColor: StatusColors.red + '20',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.md,
    },
    disconnectText: {
        ...Typography.body,
        color: StatusColors.red,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: Spacing.xl,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.md,
    },
    emptyText: {
        ...Typography.body,
        textAlign: 'center',
    },
    scanButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: '#1C1C1E',
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.md,
    },
    scanButtonScanning: {
        backgroundColor: StatusColors.orange,
    },
    scanButtonText: {
        ...Typography.bodyBold,
        color: '#FFFFFF',
    },
});

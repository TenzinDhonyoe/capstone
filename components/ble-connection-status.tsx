/**
 * BLE Connection Status Component
 * 
 * Compact connection indicator for headers showing BLE connection state.
 */

import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

import { BorderRadius, Spacing, StatusColors, Typography } from '@/constants/theme';
import { useBLE } from '@/hooks/use-ble';
import { useThemeColor } from '@/hooks/use-theme-color';

interface BLEConnectionStatusProps {
    onPress?: () => void;
    compact?: boolean;
}

export function BLEConnectionStatus({ onPress, compact = false }: BLEConnectionStatusProps) {
    const { connectionStatus, isConnected, connectedDevice, isBluetoothEnabled } = useBLE();

    const secondaryText = useThemeColor({}, 'textSecondary');
    const cardBg = useThemeColor({}, 'card');
    const cardBorder = useThemeColor({}, 'cardBorder');

    // Animation for scanning/connecting states
    const opacity = useSharedValue(1);

    useEffect(() => {
        if (connectionStatus === 'scanning' || connectionStatus === 'connecting' || connectionStatus === 'reconnecting') {
            opacity.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 600 }),
                    withTiming(1, { duration: 600 })
                ),
                -1,
                true
            );
        } else {
            opacity.value = withTiming(1, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionStatus]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return StatusColors.green;
            case 'connecting':
            case 'reconnecting':
                return StatusColors.orange;
            case 'scanning':
                return StatusColors.blue;
            default:
                return isBluetoothEnabled ? secondaryText : StatusColors.red;
        }
    };

    const getStatusIcon = (): React.ComponentProps<typeof Ionicons>['name'] => {
        switch (connectionStatus) {
            case 'connected':
                return 'bluetooth';
            case 'connecting':
            case 'reconnecting':
                return 'sync';
            case 'scanning':
                return 'radio-outline';
            default:
                return isBluetoothEnabled ? 'bluetooth-outline' : 'bluetooth';
        }
    };

    const getStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return connectedDevice?.name || 'Connected';
            case 'connecting':
                return 'Connecting...';
            case 'reconnecting':
                return 'Reconnecting...';
            case 'scanning':
                return 'Scanning...';
            default:
                return isBluetoothEnabled ? 'Not connected' : 'BT Off';
        }
    };

    if (compact) {
        return (
            <TouchableOpacity onPress={onPress} style={styles.compactContainer}>
                <Animated.View style={animatedStyle}>
                    <Ionicons
                        name={getStatusIcon()}
                        size={22}
                        color={getStatusColor()}
                    />
                </Animated.View>
                {isConnected && <View style={[styles.connectedDot, { backgroundColor: StatusColors.green }]} />}
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: cardBg, borderColor: cardBorder }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Animated.View style={[styles.iconContainer, animatedStyle]}>
                <Ionicons
                    name={getStatusIcon()}
                    size={18}
                    color={getStatusColor()}
                />
            </Animated.View>
            <View style={styles.textContainer}>
                <Text
                    style={[styles.statusText, { color: getStatusColor() }]}
                    numberOfLines={1}
                >
                    {getStatusText()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={secondaryText} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        gap: Spacing.xs,
    },
    compactContainer: {
        padding: Spacing.xs,
        position: 'relative',
    },
    iconContainer: {},
    textContainer: {
        maxWidth: 100,
    },
    statusText: {
        ...Typography.small,
        fontWeight: '500',
    },
    connectedDot: {
        position: 'absolute',
        top: Spacing.xs,
        right: Spacing.xs,
        width: 8,
        height: 8,
        borderRadius: BorderRadius.full,
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },
});

'use no memo';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Platform,
    StyleSheet,
    View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Easing,
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface GlassSlideToEnterProps {
    onSlideComplete: () => void;
    onSlideStart?: () => void;
    text?: string;
}

const SLIDER_WIDTH = 340;
const BUTTON_SIZE = 52;
const TRACK_PADDING = 5;
const MAX_SLIDE = SLIDER_WIDTH - BUTTON_SIZE - TRACK_PADDING * 2;

const SPRING_CONFIG = {
    mass: 0.4,
    damping: 25,
    stiffness: 250,
};

export function GlassSlideToEnter({
    onSlideComplete,
    onSlideStart,
    text = 'Slide to enter',
}: GlassSlideToEnterProps) {
    const translateX = useSharedValue(0);
    const isCompleted = useSharedValue(false);
    const hasStartedSliding = useSharedValue(false);

    const panGesture = Gesture.Pan()
        .onStart(() => {
            if (!hasStartedSliding.value && onSlideStart) {
                hasStartedSliding.value = true;
                runOnJS(onSlideStart)();
            }
        })
        .onUpdate((event) => {
            if (isCompleted.value) return;
            const newValue = Math.max(0, Math.min(event.translationX, MAX_SLIDE));
            // Add resistance at the end
            if (newValue > MAX_SLIDE * 0.9) {
                translateX.value = newValue + (event.translationX - newValue) * 0.1;
            } else {
                translateX.value = newValue;
            }
        })
        .onEnd(() => {
            if (isCompleted.value) return;

            if (translateX.value > MAX_SLIDE * 0.8) {
                isCompleted.value = true;
                translateX.value = withTiming(MAX_SLIDE, { duration: 200, easing: Easing.out(Easing.cubic) }, () => {
                    runOnJS(onSlideComplete)();
                    runOnJS(Haptics.notificationAsync)(
                        Haptics.NotificationFeedbackType.Success,
                    );
                });
            } else {
                translateX.value = withSpring(0, SPRING_CONFIG);
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            }
        });

    const buttonStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, MAX_SLIDE * 0.4],
            [0.6, 0],
            Extrapolation.CLAMP,
        ),
        transform: [{
            translateX: interpolate(
                translateX.value,
                [0, MAX_SLIDE],
                [0, 20],
                Extrapolation.CLAMP,
            ),
        }],
    }));

    // Bubble glow as you slide
    const glowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, MAX_SLIDE * 0.5, MAX_SLIDE],
            [0, 0.3, 0.6],
            Extrapolation.CLAMP,
        ),
    }));

    // Generate dots for the track
    const dots = Array.from({ length: 12 }).map((_, i) => (
        <View
            key={i}
            style={[
                styles.trackDot,
                { left: 70 + i * 15, opacity: 0.2 + (i % 2) * 0.1 }
            ]}
        />
    ));

    return (
        <View style={styles.container}>
            {/* Glass Track */}
            <BlurView
                intensity={30}
                tint="light"
                style={styles.track}
            >
                <View style={styles.trackInner}>
                    {/* Subtle gradient overlay */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.2)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Track Dots */}
                    <View style={styles.dotsContainer}>
                        {dots}
                    </View>

                    {/* Text */}
                    <Animated.Text style={[styles.text, textStyle]}>
                        {text}
                    </Animated.Text>

                    {/* Glow trail */}
                    <Animated.View style={[styles.glowTrail, glowStyle]} />

                    {/* Bubble Button */}
                    <GestureDetector gesture={panGesture}>
                        <Animated.View style={[styles.buttonWrapper, buttonStyle]}>
                            <LinearGradient
                                colors={['#E8A89C', '#D4847A', '#C97068']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.button}
                            >
                                <View style={styles.buttonHighlight} />
                                <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.95)" />
                            </LinearGradient>
                        </Animated.View>
                    </GestureDetector>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    track: {
        width: SLIDER_WIDTH,
        height: BUTTON_SIZE + TRACK_PADDING * 2,
        borderRadius: (BUTTON_SIZE + TRACK_PADDING * 2) / 2,
        overflow: 'hidden',
        // Soft shadow like bubbles
        shadowColor: '#C97068',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 6,
    },
    trackInner: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        borderRadius: (BUTTON_SIZE + TRACK_PADDING * 2) / 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 15,
        fontWeight: '500',
        color: '#8B7355',
        letterSpacing: 0.4,
        position: 'absolute',
        zIndex: 2,
    },
    dotsContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
    },
    trackDot: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#8B7355',
    },
    glowTrail: {
        position: 'absolute',
        left: TRACK_PADDING,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: '#E8A89C',
        ...Platform.select({
            ios: {
                shadowColor: '#E8A89C',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 15,
            },
            android: {},
        }),
    },
    buttonWrapper: {
        position: 'absolute',
        left: TRACK_PADDING,
    },
    button: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        // Bubble-like shadow
        shadowColor: '#C97068',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonHighlight: {
        position: 'absolute',
        top: 6,
        left: 10,
        width: 14,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        transform: [{ rotate: '-20deg' }],
    },
});

'use no memo';

import { BrandColors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const NO_TEXTS = ['No', 'Are you sure?', 'Try again!', 'Wrong answer!'];
const HEART_COUNT = 10;
const YES_MAX_SCALE = 1.6;
const YES_SCALE_INCREMENT = 0.15;

interface ValentineSlideProps {
  onAccept: () => void;
}

function CelebrationHeart({ index }: { index: number }) {
  const startX = useRef((Math.random() - 0.5) * (width * 0.8)).current;
  const drift = useRef((Math.random() - 0.5) * 60).current;
  const size = useRef(18 + Math.random() * 14).current;
  const delay = index * 100;
  const targetY = useRef(-(height * 0.5 + Math.random() * 150)).current;

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0);

  // Start animation on mount
  scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
  translateY.value = withDelay(delay, withTiming(targetY, { duration: 2000 }));
  translateX.value = withDelay(delay, withTiming(drift, { duration: 2000 }));
  opacity.value = withDelay(delay + 1000, withTiming(0, { duration: 800 }));

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 80,
          left: width / 2 + startX - size / 2,
        },
        style,
      ]}
    >
      <Ionicons name="heart" size={size} color={BrandColors.accent} />
    </Animated.View>
  );
}

export function ValentineSlide({ onAccept }: ValentineSlideProps) {
  const [noTextIndex, setNoTextIndex] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // No button dodge
  const noTranslateX = useSharedValue(0);
  const noTranslateY = useSharedValue(0);

  // Yes button scale
  const yesScale = useSharedValue(1);
  const currentYesScale = useRef(1);

  // Celebration text
  const celebTextOpacity = useSharedValue(0);

  const noButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: noTranslateX.value },
      { translateY: noTranslateY.value },
    ],
  }));

  const yesButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: yesScale.value }],
  }));

  const celebTextStyle = useAnimatedStyle(() => ({
    opacity: celebTextOpacity.value,
  }));

  const handleNo = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const maxX = width * 0.3;
    const maxY = 120;
    noTranslateX.value = withSpring((Math.random() - 0.5) * 2 * maxX, { damping: 10, stiffness: 200 });
    noTranslateY.value = withSpring((Math.random() - 0.5) * 2 * maxY, { damping: 10, stiffness: 200 });

    const newScale = Math.min(currentYesScale.current + YES_SCALE_INCREMENT, YES_MAX_SCALE);
    currentYesScale.current = newScale;
    yesScale.value = withSpring(newScale, { damping: 8, stiffness: 150 });

    setNoTextIndex((prev) => (prev + 1) % NO_TEXTS.length);
  }, []);

  const handleYes = useCallback(() => {
    if (accepted) return;
    setAccepted(true);
    setShowCelebration(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    celebTextOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));

    timerRef.current = setTimeout(() => {
      onAccept();
    }, 2500);
  }, [accepted, onAccept]);

  return (
    <View style={styles.slide}>
      {/* Celebration overlay */}
      {showCelebration && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: HEART_COUNT }).map((_, i) => (
            <CelebrationHeart key={i} index={i} />
          ))}
        </View>
      )}

      {/* Minion GIF */}
      <View style={styles.heartContainer}>
        <Image
          source={require('@/assets/images/onboarding/minion-minion-loves.gif')}
          style={styles.minionGif}
          resizeMode="contain"
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>Will you be my Valentine?</Text>

      {/* Subtitle */}
      <Text style={styles.subtitle}>There's only one right answer...</Text>

      {/* Celebration message */}
      {accepted && (
        <Animated.Text style={[styles.celebrationText, celebTextStyle]}>
          I love you pookie {'<3'}
        </Animated.Text>
      )}

      {/* Buttons */}
      {!accepted && (
        <View style={styles.buttonsContainer}>
          <Animated.View style={[styles.yesButtonWrapper, yesButtonStyle]}>
            <TouchableOpacity
              style={styles.yesButton}
              onPress={handleYes}
              activeOpacity={0.8}
            >
              <Text style={styles.yesText}>Yes!</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.noButtonWrapper, noButtonStyle]}>
            <TouchableOpacity onPress={handleNo} activeOpacity={0.8}>
              <Text style={styles.noText}>{NO_TEXTS[noTextIndex]}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  heartContainer: {
    marginBottom: Spacing.lg,
  },
  minionGif: {
    width: 200,
    height: 200,
  },
  title: {
    ...Typography.h1,
    fontFamily: 'Outfit_600SemiBold',
    color: BrandColors.accent,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    fontFamily: 'Outfit_400Regular',
    color: '#636E72',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  celebrationText: {
    ...Typography.h2,
    fontFamily: 'Outfit_600SemiBold',
    color: BrandColors.accent,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    minHeight: 160,
  },
  yesButtonWrapper: {
    width: '100%',
  },
  yesButton: {
    backgroundColor: BrandColors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
  },
  yesText: {
    ...Typography.bodyBold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  noButtonWrapper: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    minWidth: 160,
  },
  noText: {
    ...Typography.bodyBold,
    color: '#636E72',
    textAlign: 'center',
  },
});

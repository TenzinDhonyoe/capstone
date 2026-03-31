'use no memo';

import { Button } from '@/components/ui/button';
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
    noTranslateX.value = withTiming((Math.random() - 0.5) * 2 * maxX, { duration: 200 });
    noTranslateY.value = withTiming((Math.random() - 0.5) * 2 * maxY, { duration: 200 });

    const newScale = Math.min(currentYesScale.current + YES_SCALE_INCREMENT, YES_MAX_SCALE);
    currentYesScale.current = newScale;
    yesScale.value = withTiming(newScale, { duration: 200 });

    setNoTextIndex((prev) => (prev + 1) % NO_TEXTS.length);
  }, []);

  const handleYes = useCallback(() => {
    if (accepted) return;
    setAccepted(true);
    setShowCelebration(true);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    celebTextOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
  }, [accepted]);

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
      <View style={styles.gifFrame}>
        <Image
          source={
            accepted
              ? require('@/assets/images/onboarding/yay.gif')
              : require('@/assets/images/onboarding/minion-minion-loves.gif')
          }
          style={styles.minionGif}
          resizeMode="cover"
        />
      </View>

      {/* Title & Subtitle — hidden after accepting */}
      {!accepted && (
        <>
          <Text style={styles.title}>Will you be my Valentine?</Text>
          <Text style={styles.subtitle}>There's only one right answer...</Text>
        </>
      )}

      {/* Celebration message + Continue button */}
      {accepted && (
        <>
          <Animated.Text style={[styles.celebrationText, celebTextStyle]}>
            I love you pookie {'<3'}
          </Animated.Text>
          <View style={styles.continueButtonWrapper}>
            <Button title="Surprises" onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onAccept();
            }} style={{ backgroundColor: '#2D3436' }} textStyle={{ color: '#FFFFFF' }} />
          </View>
        </>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: height * 0.08,
  },
  gifFrame: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  minionGif: {
    width: '100%',
    height: '100%',
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
  continueButtonWrapper: {
    width: '100%',
    marginTop: Spacing.xl,
  },
  buttonsContainer: {
    alignItems: 'center',
    gap: Spacing.md,
    width: '100%',
    minHeight: 160,
  },
  yesButtonWrapper: {
    minWidth: 160,
  },
  yesButton: {
    backgroundColor: BrandColors.accent,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 20,
    alignItems: 'center',
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

import { BrandColors, Spacing, Typography } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, ImageBackground, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface OnboardingSlideProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accentColor?: string;
  imageSource?: any;
}

export function OnboardingSlide({
  icon,
  title,
  description,
  accentColor = BrandColors.accent,
  imageSource,
}: OnboardingSlideProps) {
  // If we have an image, render full-screen background style (like welcome screen)
  if (imageSource) {
    return (
      <ImageBackground
        source={imageSource}
        style={styles.backgroundSlide}
        resizeMode="cover"
      >
        {/* Top fade for soft edge */}
        <LinearGradient
          colors={['#FFFDFB', 'rgba(255,253,251,0.8)', 'rgba(255,253,251,0.3)', 'transparent']}
          locations={[0, 0.2, 0.5, 1]}
          style={styles.topFade}
        />

        {/* Bottom fade so text is legible */}
        <LinearGradient
          colors={['transparent', 'rgba(255,253,251,0.6)', 'rgba(255,253,251,0.95)', '#FFFDFB']}
          locations={[0, 0.45, 0.7, 1]}
          style={styles.bottomFade}
        />

        {/* Spacer to push text to bottom */}
        <View style={styles.spacer} />

        {/* Title and description at bottom */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.textContainerBg}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </Animated.View>
      </ImageBackground>
    );
  }

  // Fallback: icon-based slide
  return (
    <View style={styles.slide}>
      <View style={styles.illustrationArea}>
        <View style={[styles.iconContainer, { shadowColor: accentColor }]}>
          <View style={styles.iconInner}>
            <Ionicons name={icon} size={64} color={accentColor} />
          </View>
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full-screen background slide
  backgroundSlide: {
    width,
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.5,
  },
  topFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: height * 0.25,
  },
  spacer: {
    flex: 1,
  },
  textContainerBg: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  // Icon-based slide (fallback)
  slide: {
    width,
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  illustrationArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconInner: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  textContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },

  // Shared text styles
  title: {
    ...Typography.h1,
    fontFamily: 'Outfit_600SemiBold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    fontFamily: 'Outfit_400Regular',
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.sm,
  },
});

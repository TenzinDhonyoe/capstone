import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingSlide } from '@/components/onboarding-slide';
import { Button } from '@/components/ui/button';
import { PaginationDots } from '@/components/ui/pagination-dots';
import { ValentineSlide } from '@/components/valentine-slide';
import { BrandColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    icon: 'heart-outline' as const,
    title: 'Know your heart',
    description:
      'Sowa captures clinical-grade ECG readings so you can truly understand what makes your heart beat.',
    accentColor: BrandColors.accent,
    image: require('@/assets/images/onboarding/onboard_1.png'),
  },
  {
    id: '2',
    icon: 'pulse-outline' as const,
    title: 'See every rhythm',
    description:
      'Visualize your heart rate, HRV, and patterns in beautiful detail—because every heartbeat tells a love story.',
    accentColor: BrandColors.secondary,
    image: require('@/assets/images/onboarding/onboard_2.png'),
  },
  {
    id: '3',
    icon: 'notifications-outline' as const,
    title: 'Stay in sync',
    description:
      'Get gentle alerts when something\'s off, so you can keep your heart healthy for the ones you cherish.',
    accentColor: '#F4C68C',
    image: require('@/assets/images/onboarding/oboard_3.png'),
  },
  {
    id: '4',
    icon: 'shield-checkmark-outline' as const,
    title: 'Your heart, your data',
    description:
      'All your recordings stored securely in one place, ready to share with your doctor anytime.',
    accentColor: BrandColors.accent,
  },
];

export default function OnboardingSlidesScreen() {
  const { completeOnboarding } = useAuth();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = () => {
    if (isLastSlide) {
      completeOnboarding();
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  };

  const handleBack = () => {
    if (activeIndex === 0) {
      router.back();
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex - 1,
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header: Back button + Pagination dots */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#2D3436" />
          </TouchableOpacity>

          <PaginationDots count={SLIDES.length} activeIndex={activeIndex} />

          {/* Spacer to balance the back button */}
          <View style={styles.headerSpacer} />
        </View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          extraData={activeIndex}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => {
            // Last slide: render Valentine easter egg
            if (index === SLIDES.length - 1) {
              return <ValentineSlide onAccept={completeOnboarding} />;
            }

            return (
              <OnboardingSlide
                icon={item.icon}
                title={item.title}
                description={item.description}
                accentColor={item.accentColor}
                imageSource={item.image}
              />
            );
          }}
        />

        {/* Bottom button — hidden on last slide (Valentine handles its own buttons) */}
        {!isLastSlide && (
          <View style={styles.bottomContainer}>
            <Button
              title="Next"
              onPress={handleNext}
            />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerSpacer: {
    width: 40,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: Spacing.md,
  },
});

'use no memo';

import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { BrandColors, Spacing } from '@/constants/theme';

interface PaginationDotsProps {
  count: number;
  activeIndex: number;
}

function Dot({ isActive }: { isActive: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(isActive ? 24 : 8, { duration: 250 }),
    backgroundColor: withTiming(isActive ? BrandColors.accent : '#D1D5DB', { duration: 250 }),
    opacity: withTiming(isActive ? 1 : 0.6, { duration: 250 }),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function PaginationDots({ count, activeIndex }: PaginationDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} isActive={index === activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

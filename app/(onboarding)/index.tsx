import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Dimensions,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

const { height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();

  return (
    <ImageBackground
      source={require('@/assets/images/bg_first_screen.png')}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Bottom fade so text over image is legible */}
      <LinearGradient
        colors={['transparent', 'rgba(255,253,251,0.6)', 'rgba(255,253,251,0.95)', '#FFFDFB']}
        locations={[0, 0.45, 0.7, 1]}
        style={styles.bottomFade}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Brand */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandText}>sowa</Text>
        </View>

        {/* Spacer above */}
        <View style={styles.spacer} />

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            Your heart,{'\n'}monitored in real time.
          </Text>
        </View>
      </SafeAreaView>

      {/* Bottom button */}
      <View style={styles.buttonWrapper}>
        <Button
          title="Get Started"
          onPress={() => {
            completeOnboarding();
            router.replace('/(tabs)');
          }}
          style={{ backgroundColor: '#2D3436' }}
          textStyle={{ color: '#FFFFFF' }}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#FFFDFB',
  },

  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.55,
  },

  safeArea: {
    flex: 1,
  },

  brandContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 24,
  },
  brandText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3436',
    letterSpacing: 1,
  },

  spacer: {
    flex: 1,
  },

  titleContainer: {
    paddingBottom: 140,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Outfit_500Medium',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 42,
  },

  buttonWrapper: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    alignItems: 'center',
    zIndex: 10,
  },
});

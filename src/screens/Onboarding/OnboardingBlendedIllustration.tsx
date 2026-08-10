import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

interface OnboardingBlendedIllustrationProps {
  source: ImageSourcePropType;
}

/**
 * Portrait onboarding art (Welcome Moses scene, etc.) — sits below the
 * headline on parchment, with soft fades so the artwork meets the screen
 * background instead of reading as a pasted rectangle.
 */
export function OnboardingBlendedIllustration({ source }: OnboardingBlendedIllustrationProps) {
  return (
    <View style={styles.frame}>
      <Image source={source} style={styles.image} resizeMode="contain" />
      <LinearGradient
        colors={[colors.background, `${colors.background}00`]}
        locations={[0, 0.14]}
        style={styles.topFade}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[`${colors.background}00`, colors.background]}
        locations={[0.62, 1]}
        style={styles.bottomFade}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  topFade: {
    ...StyleSheet.absoluteFill,
  },
  bottomFade: {
    ...StyleSheet.absoluteFill,
  },
});

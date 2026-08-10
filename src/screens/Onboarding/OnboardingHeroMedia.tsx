import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme';

export interface OnboardingHeroMediaProps {
  source: ImageSourcePropType;
  /** Bottom-heavy scrim color so overlaid text stays legible regardless of the artwork — defaults to the brand navy. */
  scrimColor?: string;
}

/**
 * Full-bleed background artwork slot for onboarding's highest-impact beats
 * (Welcome, Bombshell, StreakCelebration). Each call site currently points
 * at a transparent 1x1 placeholder under assets/onboarding/ — dropping in a
 * real Higgsfield-generated image at the same filename is the entire
 * integration, no code change required.
 */
export function OnboardingHeroMedia({ source, scrimColor = colors.primary }: OnboardingHeroMediaProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={source} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={[`${scrimColor}00`, `${scrimColor}00`, `${scrimColor}66`]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // react-native-web's Image defaults to the source asset's intrinsic pixel
  // size (from Metro's asset registry); StyleSheet.absoluteFill alone has no
  // width/height keys to override that default, so the image never actually
  // stretches to fill its container without setting them explicitly here.
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});

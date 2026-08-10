import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme';

const SIZE = 60;
const WALL_HEIGHT = 7;
const PRESSED_WALL_HEIGHT = 2;
const FACE_TRAVEL = WALL_HEIGHT - PRESSED_WALL_HEIGHT;
// colors.accent blended ~35% toward colors.accentDark, for the pressed-face tint.
const FACE_PRESSED = '#689ACA';

interface ContinueNodeButtonProps {
  /** 0 = resting (raised), 1 = fully pressed (compressed). Driven by the parent's onPressIn/onPressOut. */
  pressProgress: SharedValue<number>;
  glyph?: string;
}

/**
 * Chunky, toy-like circular "lesson node" button (molded-plastic look: thick
 * beveled side wall + glossy top face + soft ambient shadow). Purely visual —
 * the parent Pressable owns the tap target and drives `pressProgress`.
 */
export function ContinueNodeButton({ pressProgress, glyph = '→' }: ContinueNodeButtonProps) {
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [0.22, 0.1]),
    transform: [
      { scaleX: interpolate(pressProgress.value, [0, 1], [1, 0.8]) },
      { scaleY: interpolate(pressProgress.value, [0, 1], [1, 0.7]) },
    ],
  }));

  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressProgress.value, [0, 1], [colors.accent, FACE_PRESSED]),
    transform: [{ translateY: interpolate(pressProgress.value, [0, 1], [0, FACE_TRAVEL]) }],
  }));

  const glossStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [0.9, 0.35]),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.shadow, shadowStyle]} />
      <View style={styles.wall} />
      <Animated.View style={[styles.face, faceStyle]}>
        <Animated.View style={[styles.gloss, glossStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={styles.glyph}>{glyph}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SIZE,
    height: SIZE + WALL_HEIGHT + 10,
  },
  shadow: {
    position: 'absolute',
    top: SIZE + WALL_HEIGHT - 6,
    left: SIZE * 0.09,
    width: SIZE * 0.82,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.primaryDark,
  },
  wall: {
    position: 'absolute',
    top: WALL_HEIGHT,
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.accentDark,
  },
  face: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SIZE * 0.6,
  },
  glyph: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    transform: [{ translateY: -8 }],
  },
});

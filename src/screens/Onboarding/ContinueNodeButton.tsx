import { View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../theme';

const SIZE = 64;
// Transparent margin around the puck so the soft ground shadow has room to
// bleed outside its silhouette instead of clipping into a hard edge.
const PAD = 14;
const CANVAS = SIZE + PAD * 2;
const CENTER = CANVAS / 2;
const STROKE_WIDTH = 1.5;
const RADIUS = SIZE / 2 - STROKE_WIDTH / 2;
// How far the face sinks toward its base when pressed — the bezel sliver
// below shrinks by the same amount, selling a real compress rather than a
// flat color swap.
const BEZEL = 5;
const PRESSED_BEZEL = 1.5;
const FACE_TRAVEL = BEZEL - PRESSED_BEZEL;
// colors.accent blended ~35% toward colors.accentDark, for the pressed-face tint.
const FACE_PRESSED = '#689ACA';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

interface ContinueNodeButtonProps {
  /** 0 = resting (raised), 1 = fully pressed (compressed). Driven by the parent's onPressIn/onPressOut. */
  pressProgress: SharedValue<number>;
}

/**
 * Glossy, toy-like circular "lesson node" button — a beveled base, a domed
 * face with a soft form-shadow and specular sheen, and a blurred contact
 * shadow, all rendered as one SVG so it looks identical on iOS and Android
 * instead of relying on platform shadow APIs that diverge between them.
 * Purely visual — the parent Pressable owns the tap target and drives
 * `pressProgress`.
 */
export function ContinueNodeButton({ pressProgress }: ContinueNodeButtonProps) {
  const { colors } = useTheme();

  const groundShadowProps = useAnimatedProps(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [0.85, 0.55]),
  }));

  const groupProps = useAnimatedProps(() => ({
    transform: [{ translateY: interpolate(pressProgress.value, [0, 1], [0, FACE_TRAVEL]) }],
  }));

  const faceProps = useAnimatedProps(() => ({
    fill: interpolateColor(pressProgress.value, [0, 1], [colors.accent, FACE_PRESSED]),
  }));

  const sheenProps = useAnimatedProps(() => ({
    opacity: interpolate(pressProgress.value, [0, 1], [0.9, 0.4]),
  }));

  return (
    <View style={{ width: CANVAS, height: CANVAS }}>
      <Svg width={CANVAS} height={CANVAS}>
        <Defs>
          <RadialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.primaryDark} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={colors.primaryDark} stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0.22} />
          </LinearGradient>
          <RadialGradient id="formShade" cx="50%" cy="82%" r="65%">
            <Stop offset="0%" stopColor="#000000" stopOpacity={0.24} />
            <Stop offset="100%" stopColor="#000000" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="sheen" cx="34%" cy="26%" r="55%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Soft blurred contact shadow — no hard edge, unlike a flat-color ellipse. */}
        <AnimatedEllipse
          cx={CENTER}
          cy={SIZE + PAD - 3}
          rx={SIZE * 0.44}
          ry={SIZE * 0.2}
          fill="url(#groundShadow)"
          animatedProps={groundShadowProps}
        />

        {/* Beveled base — a thin sliver of this peeks out below the face at rest, shrinking as the face presses down onto it. */}
        <Circle cx={CENTER} cy={CENTER + BEZEL} r={RADIUS} fill={colors.accentDark} />

        <AnimatedG animatedProps={groupProps}>
          <AnimatedCircle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            animatedProps={faceProps}
            stroke="url(#rim)"
            strokeWidth={STROKE_WIDTH}
          />
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#formShade)" />
          <AnimatedEllipse
            cx={CENTER - SIZE * 0.13}
            cy={CENTER - SIZE * 0.17}
            rx={SIZE * 0.27}
            ry={SIZE * 0.19}
            fill="url(#sheen)"
            animatedProps={sheenProps}
            transform={`rotate(-18 ${CENTER - SIZE * 0.13} ${CENTER - SIZE * 0.17})`}
          />
        </AnimatedG>
      </Svg>
    </View>
  );
}

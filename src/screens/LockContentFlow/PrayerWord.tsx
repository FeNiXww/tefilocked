import { memo, useEffect } from 'react';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../theme';

export type PrayerWordState = 'upcoming' | 'current' | 'completed';

interface PrayerWordProps {
  text: string;
  state: PrayerWordState;
  isLast: boolean;
}

const ILLUMINATION_DURATION = 420;
const EMPHASIS_IN_DURATION = 160;
const EMPHASIS_OUT_DURATION = 90;

function PrayerWordBase({ text, state, isLast }: PrayerWordProps) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const illumination = useSharedValue(state === 'upcoming' ? 0 : 1);
  const emphasis = useSharedValue(state === 'current' ? 1 : 0);

  useEffect(() => {
    const targetIllumination = state === 'upcoming' ? 0 : 1;
    const targetEmphasis = state === 'current' ? 1 : 0;
    if (reduceMotion) {
      illumination.value = targetIllumination;
      emphasis.value = targetEmphasis;
      return;
    }
    illumination.value = withTiming(targetIllumination, {
      duration: ILLUMINATION_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    emphasis.value = withTiming(targetEmphasis, {
      duration: targetEmphasis === 1 ? EMPHASIS_IN_DURATION : EMPHASIS_OUT_DURATION,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, reduceMotion]);

  // Deliberately no `transform` here: nesting many Animated.Text words
  // inside one RTL <Text> paragraph relies on RN flattening them into a
  // single native text run so Hebrew word order stays correct. Adding a
  // `transform` (tried a subtle scale bump on the focus word) forces that
  // Animated.Text out of the flattened run into its own native view —
  // confirmed on-device: word order visibly scrambled. Opacity/color stay
  // inside a flattenable text style and render correctly; keep any future
  // per-word styling to that set.
  //
  // The "current" word used to get a background-color wash instead of just a
  // color shift — dropped because a background box behind one word in a
  // wrapped RTL paragraph reads as an odd floating patch (worse than a plain
  // color change), and needing a different tone per theme just to keep text
  // on top of it readable was a sign the approach was fighting itself.
  // Color alone reads as "this is the focus word" without either problem.
  const animatedStyle = useAnimatedStyle(() => {
    const baseColor = interpolateColor(illumination.value, [0, 1], [colors.textMuted, colors.textPrimary]);
    return {
      opacity: interpolate(illumination.value, [0, 1], [0.45, 1]),
      color: interpolateColor(emphasis.value, [0, 1], [baseColor, colors.accentDark]),
    };
  });

  return <Animated.Text style={animatedStyle}>{isLast ? text : `${text} `}</Animated.Text>;
}

function areEqual(prev: PrayerWordProps, next: PrayerWordProps) {
  return prev.state === next.state && prev.text === next.text && prev.isLast === next.isLast;
}

export const PrayerWord = memo(PrayerWordBase, areEqual);

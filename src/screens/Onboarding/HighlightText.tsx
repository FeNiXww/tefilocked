import { useEffect } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../../theme';

/** Duration of each word's pop-in animation, ms — exported so callers sequencing multiple HighlightTexts (e.g. FadeInLines) know when a given block's reveal actually finishes. */
export const WORD_POP_DURATION_MS = 420;

interface Segment {
  text: string;
  emphasis: boolean;
}

/**
 * Splits `**word word**`-marked runs out of a string into per-word segments,
 * in logical (source) order — safe for RTL Hebrew, since bidi layout re-runs
 * over the concatenated nested-Text content regardless of how many spans it's
 * split across.
 */
function parseSegments(source: string): Segment[] {
  const runs = source.split(/(\*\*[^*]+\*\*)/g).filter((run) => run.length > 0);
  const words: Segment[] = [];
  runs.forEach((run) => {
    const isEmphasis = run.startsWith('**') && run.endsWith('**');
    const clean = isEmphasis ? run.slice(2, -2) : run;
    clean.split(/(\s+)/).forEach((token) => {
      if (token.length === 0) return;
      words.push({ text: token, emphasis: isEmphasis && token.trim().length > 0 });
    });
  });
  return words;
}

function Word({
  text,
  emphasis,
  delay,
  emphasisStyle,
}: {
  text: string;
  emphasis: boolean;
  delay: number;
  emphasisStyle: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    progress.value = 0;
    progress.value = reduceMotion
      ? 1
      : withDelay(delay, withTiming(1, { duration: WORD_POP_DURATION_MS, easing: Easing.out(Easing.back(1.6)) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, delay, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.72 + progress.value * 0.28 }, { translateY: (1 - progress.value) * 6 }],
  }));

  // Whitespace tokens don't need to animate or carry emphasis styling.
  if (text.trim().length === 0) return <Text>{text}</Text>;

  return <Animated.Text style={[emphasis && emphasisStyle, animatedStyle]}>{text}</Animated.Text>;
}

interface HighlightTextProps {
  /** Plain text, with `**phrase**` marking the words that should pop in emphasized. */
  text: string;
  style?: StyleProp<TextStyle>;
  emphasisStyle?: StyleProp<TextStyle>;
  /** Delay between each word's pop-in, ms. */
  staggerMs?: number;
  /** Delay before the first word starts, ms — lets a screen sequence its headline after something else. */
  startDelayMs?: number;
}

const DEFAULT_EMPHASIS: TextStyle = {
  color: colors.accentDark,
  fontWeight: '800',
};

/**
 * Drop-in replacement for a plain headline `<Text>` — reveals word by word
 * with a soft pop, and lets specific phrases (wrapped in `**...**`) stand out
 * in the accent color. The cinematic "text pop-up" beat used across the
 * onboarding narrative screens.
 */
/** Number of per-token reveal steps `text` will animate through — use to sequence a delay after it (e.g. another HighlightText starting once this one finishes). */
export function countRevealSteps(text: string): number {
  return parseSegments(text).length;
}

export function HighlightText({ text, style, emphasisStyle, staggerMs = 42, startDelayMs = 0 }: HighlightTextProps) {
  const words = parseSegments(text);
  return (
    <Text style={style}>
      {words.map((word, index) => (
        <Word
          key={`${index}-${word.text}`}
          text={word.text}
          emphasis={word.emphasis}
          delay={startDelayMs + index * staggerMs}
          emphasisStyle={emphasisStyle ?? DEFAULT_EMPHASIS}
        />
      ))}
    </Text>
  );
}

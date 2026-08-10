import { StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { spacing, typography } from '../../theme';
import { countRevealSteps, HighlightText, WORD_POP_DURATION_MS } from './HighlightText';

/** Gap between each word's reveal — slow enough to read as "popping up one at a time" rather than a blurred fade. */
const WORD_STAGGER_MS = 70;
/** Extra pause after a line finishes revealing before the next line starts. */
const LINE_PAUSE_MS = 200;

interface FadeInLinesProps {
  lines: string[];
  style?: StyleProp<TextStyle>;
  emphasisStyle?: StyleProp<TextStyle>;
}

/**
 * Reveals a short passage word by word, line by line, centered on screen —
 * the onboarding "reflection card" beat that mirrors the user's own answers
 * back to them. Each line is a HighlightText, so `**phrase**` markers pop in
 * emphasized in the app's accent blue. A line's start delay is timed to land
 * only once the previous line has fully finished popping in (its last word's
 * delay + pop duration + a pause), so the passage reveals as one unhurried
 * sequence instead of overlapping bursts.
 */
export function FadeInLines({ lines, style, emphasisStyle }: FadeInLinesProps) {
  let cumulativeDelay = 0;

  return (
    <View style={styles.container}>
      {lines.map((line, index) => {
        const startDelay = cumulativeDelay;
        const steps = countRevealSteps(line);
        cumulativeDelay = startDelay + (steps - 1) * WORD_STAGGER_MS + WORD_POP_DURATION_MS + LINE_PAUSE_MS;

        return (
          <HighlightText
            key={`${index}-${line}`}
            text={line}
            style={[styles.line, style]}
            emphasisStyle={emphasisStyle}
            staggerMs={WORD_STAGGER_MS}
            startDelayMs={startDelay}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    alignItems: 'center',
  },
  line: {
    ...typography.heading,
    fontSize: 21,
    textAlign: 'center',
    lineHeight: 30,
  },
});

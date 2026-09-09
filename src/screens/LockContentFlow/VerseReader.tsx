import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';
import type { Verse } from '../../content/types';
import { tokenizePrayer, type TokenizedVerse } from './tokenizePrayer';
import { PrayerWord, type PrayerWordState } from './PrayerWord';

// Anti-cheat floor: even a full-length prayer scrolled to the bottom in one
// fling can't complete faster than this many ms/word — see
// `computeTimeReadyCeiling`. Chosen well below a genuine reading pace so it
// never becomes a felt "wait," only a floor under an instant flick.
const MS_PER_WORD = 140;
// Very short items (a one-line blessing) still get a brief minimum dwell so
// completion never feels instantaneous, matching the old fits-on-screen
// behavior this replaces.
const MIN_TOTAL_DWELL_MS = 900;
// How often the time-based gate re-checks itself. Scroll-driven progress is
// also recomputed on every scroll event, independent of this tick.
const TIME_GATE_TICK_MS = 120;

interface VerseLayout {
  y: number;
  height: number;
}

interface VerseReaderProps {
  verses: Verse[];
  onReachEnd: () => void;
}

function getWordState(globalIndex: number, highestCompleted: number, currentIndex: number): PrayerWordState {
  if (globalIndex <= highestCompleted) return 'completed';
  if (globalIndex === currentIndex) return 'current';
  return 'upcoming';
}

/**
 * Guided word-by-word reading: the whole prayer is rendered up front (never
 * hidden). `highestCompletedIndex` tracks the last word genuinely read, and
 * the word right after it is always the "current" focus — so word 0 starts
 * as the focus even before any progress exists, and the last word becomes
 * completed (not stuck as "current forever") the moment it's reached.
 *
 * Two independent gates both have to agree a word has been read — scroll
 * position (has the reading line actually passed it?) and elapsed time (has
 * enough time passed to have read this many words?) — so neither an instant
 * scroll-to-bottom nor leaving the screen idle can fake progress alone; the
 * effective ceiling is always the stricter of the two, and it only moves
 * forward (see `tick`).
 */
export function VerseReader({ verses, onReachEnd }: VerseReaderProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const tokenized = useMemo(() => tokenizePrayer(verses), [verses]);
  const { totalWords } = tokenized;

  const [highestCompletedIndex, setHighestCompletedIndex] = useState(-1);
  const [reachedEnd, setReachedEnd] = useState(false);

  const highestCompletedRef = useRef(-1);
  const reachedEndRef = useRef(false);
  const startTimestamp = useRef(Date.now());
  const scrollOffsetY = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);
  const verseLayouts = useRef<(VerseLayout | undefined)[]>([]);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Slower than MS_PER_WORD alone for short items, so a 2-word blessing
  // still takes at least MIN_TOTAL_DWELL_MS to fully illuminate.
  const totalDwellMs = useMemo(() => Math.max(totalWords * MS_PER_WORD, MIN_TOTAL_DWELL_MS), [totalWords]);

  const currentIndex = totalWords === 0 ? -1 : Math.min(totalWords - 1, highestCompletedIndex + 1);

  const fireOnce = useCallback(() => {
    if (reachedEndRef.current) return;
    reachedEndRef.current = true;
    setReachedEnd(true);
    onReachEnd();
  }, [onReachEnd]);

  // A new prayer means every gate re-locks from scratch.
  useEffect(() => {
    highestCompletedRef.current = -1;
    setHighestCompletedIndex(-1);
    reachedEndRef.current = false;
    setReachedEnd(false);
    startTimestamp.current = Date.now();
    scrollOffsetY.current = 0;
    contentHeight.current = 0;
    verseLayouts.current = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses]);

  // Highest global word index that's scrolled up into (or past) the visible
  // viewport — the *bottom* edge of the viewport, not the top. The top edge
  // would seem more conservative (nothing credited at rest), but it's
  // actually unreachable for the last screenful of any tall content: at max
  // scroll the viewport's top can only reach `contentHeight - viewportHeight`,
  // which for ordinary screens sits a full screen short of the true bottom —
  // the tail of the prayer could never be marked read. The bottom edge does
  // reach the true content bottom at max scroll. The tradeoff — the first
  // screenful is "reachable" without scrolling — isn't a real hole: the time
  // gate below still throttles how fast that reachable ceiling actually gets
  // credited, so it surfaces as the same gradual per-word reveal as
  // fits-on-screen content, never an instant grant.
  const computeScrollCeiling = useCallback((): number => {
    if (viewportHeight.current === 0) return -1; // nothing measured yet — don't unlock anything from scroll alone
    // Nothing to scroll to (a short blessing that fits on screen): the scroll
    // gate has no signal to give, so step aside entirely and let the time
    // gate alone govern — matching the old fits-on-screen dwell behavior.
    if (contentHeight.current > 0 && contentHeight.current <= viewportHeight.current) return totalWords - 1;
    const readingLineY = scrollOffsetY.current + viewportHeight.current;
    let ceiling = -1;
    for (let i = 0; i < tokenized.verses.length; i++) {
      const tv: TokenizedVerse = tokenized.verses[i];
      if (tv.words.length === 0) continue;
      const layout = verseLayouts.current[i];
      if (!layout) break; // not measured yet — don't extend the ceiling past what's known
      if (readingLineY >= layout.y + layout.height) {
        ceiling = tv.endIndex; // whole verse passed — keep checking the next one
        continue;
      }
      if (readingLineY >= layout.y) {
        const fraction = layout.height > 0 ? (readingLineY - layout.y) / layout.height : 0;
        const completedInVerse = Math.floor(fraction * tv.words.length);
        if (completedInVerse > 0) ceiling = tv.startIndex + completedInVerse - 1;
      }
      break; // reading line is inside (or hasn't reached) this verse — stop here either way
    }
    return ceiling;
  }, [tokenized, totalWords]);

  // Highest global word index that natural reading speed could have reached
  // by now, regardless of scroll — the anti-instant-scroll floor.
  const computeTimeReadyCeiling = useCallback((): number => {
    if (totalWords === 0) return -1;
    const elapsed = Date.now() - startTimestamp.current;
    const fraction = Math.min(1, elapsed / totalDwellMs);
    return Math.min(totalWords - 1, Math.floor(fraction * totalWords) - 1);
  }, [totalWords, totalDwellMs]);

  const tick = useCallback(() => {
    if (totalWords === 0) return;
    const candidate = Math.min(computeScrollCeiling(), computeTimeReadyCeiling());
    if (candidate > highestCompletedRef.current) {
      highestCompletedRef.current = candidate;
      setHighestCompletedIndex(candidate);
      if (candidate >= totalWords - 1) fireOnce();
    }
  }, [totalWords, computeScrollCeiling, computeTimeReadyCeiling, fireOnce]);

  // Time gate ticks on its own clock; the scroll gate recomputes on every
  // scroll event too, so real scrolling never waits for this interval.
  useEffect(() => {
    if (totalWords === 0) {
      // Nothing to progress through — fall back to the old short-item dwell.
      const t = setTimeout(fireOnce, MIN_TOTAL_DWELL_MS);
      return () => clearTimeout(t);
    }
    tickTimer.current = setInterval(tick, TIME_GATE_TICK_MS);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
    };
  }, [totalWords, tick, fireOnce]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetY.current = e.nativeEvent.contentOffset.y;
      tick();
    },
    [tick]
  );

  return (
    <View style={styles.wrap}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        scrollEventThrottle={16}
        onLayout={(e: LayoutChangeEvent) => {
          viewportHeight.current = e.nativeEvent.layout.height;
          tick();
        }}
        onContentSizeChange={(_width, height) => {
          contentHeight.current = height;
          tick();
        }}
      >
        {tokenized.verses.map((tv, verseIndex) => (
          <View
            key={tv.verse.number}
            style={styles.verseBlock}
            onLayout={(e: LayoutChangeEvent) => {
              verseLayouts.current[verseIndex] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
              tick();
            }}
          >
            {tokenized.verses.length > 1 && <Text style={styles.verseNumber}>{tv.verse.number}</Text>}
            <Text style={styles.verseText}>
              {tv.words.map((word, i) => (
                <PrayerWord
                  key={word.key}
                  text={word.text}
                  isLast={i === tv.words.length - 1}
                  state={getWordState(word.globalIndex, highestCompletedIndex, currentIndex)}
                />
              ))}
            </Text>
          </View>
        ))}
        {/* Trailing spacer so the true bottom of the text clears the fixed
            continue button below, and the scroll-to-end check has a
            reachable target even on very long chapters. */}
        <View style={styles.endSpacer} />
      </ScrollView>
      {!reachedEnd && (
        <View style={styles.scrollHint} pointerEvents="none">
          <Text style={styles.scrollHintText}>המשיכו לגלול לקריאה מלאה ↓</Text>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  verseBlock: {
    marginBottom: spacing.lg,
    alignItems: 'flex-end',
  },
  verseNumber: {
    ...typography.verseNumber,
    marginBottom: spacing.xs,
  },
  verseText: {
    ...typography.verseText,
    textAlign: 'right',
    alignSelf: 'stretch',
  },
  endSpacer: {
    height: spacing.xxl,
  },
  scrollHint: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollHintText: {
    ...typography.caption,
  },
  });
}

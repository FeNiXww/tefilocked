import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

// Niqqud (vowel points, ֑-ׇ) are separate combining code points in JS
// strings, so counting raw .length would make vocalized words look much
// "longer" than their letter count and throw off the reading pace.
const HEBREW_LETTER_REGEX = /[א-ת]/g;
const BASE_WORD_MS = 260;
const MS_PER_LETTER = 12;
const MAX_EXTRA_MS = 200;

function wordDelay(word: string): number {
  const letters = word.match(HEBREW_LETTER_REGEX)?.length ?? word.length;
  return BASE_WORD_MS + Math.min(letters * MS_PER_LETTER, MAX_EXTRA_MS);
}

interface HighlightedPrayerTextProps {
  text: string;
  onComplete: () => void;
}

export function HighlightedPrayerText({ text, onComplete }: HighlightedPrayerTextProps) {
  const words = text.split(/\s+/).filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popAnim = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  const scrollRef = useRef<ScrollView>(null);
  const wordYPositions = useRef<number[]>([]);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (words.length === 0) {
      onCompleteRef.current();
      return;
    }

    let cancelled = false;
    let index = 0;
    wordYPositions.current = [];
    setCurrentIndex(0);

    const popIn = () => {
      popAnim.setValue(0);
      // Native-driven transform/opacity crashes Fabric's SurfaceMountingManager
      // on some Android versions — see Paywall/index.tsx for details.
      Animated.timing(popAnim, { toValue: 1, duration: 160, useNativeDriver: false }).start();
    };
    popIn();

    const scheduleNext = () => {
      timeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        index += 1;
        if (index >= words.length) {
          onCompleteRef.current();
          return;
        }
        setCurrentIndex(index);
        popIn();
        scheduleNext();
      }, wordDelay(words[index]));
    };
    scheduleNext();

    return () => {
      cancelled = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // Re-runs only when the prayer text itself changes; `text` is the sole
    // driver of the reading sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    if (currentIndex < 0) return;
    if (contentHeight.current <= viewportHeight.current) return;
    const activeY = wordYPositions.current[currentIndex];
    if (activeY == null || !scrollRef.current) return;
    const targetY = Math.max(0, activeY - viewportHeight.current / 2);
    scrollRef.current.scrollTo({ y: targetY, animated: true });
  }, [currentIndex]);

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      onLayout={(e: LayoutChangeEvent) => {
        viewportHeight.current = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_width, height) => {
        contentHeight.current = height;
      }}
    >
      <View style={styles.wordWrap}>
        {words.map((word, idx) => {
          const isRead = idx < currentIndex;
          const isActive = idx === currentIndex;
          return (
            <Animated.Text
              key={`${idx}-${word}`}
              onLayout={(e: LayoutChangeEvent) => {
                wordYPositions.current[idx] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.word,
                isRead && styles.wordRead,
                !isRead && !isActive && styles.wordUpcoming,
                isActive && styles.wordActive,
                isActive && {
                  opacity: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                  transform: [
                    { scale: popAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                  ],
                },
              ]}
            >
              {word}
            </Animated.Text>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    maxHeight: '50%',
    width: '100%',
  },
  wordWrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  word: {
    ...typography.heading,
    fontSize: 22,
    marginHorizontal: spacing.xs / 2,
    marginVertical: spacing.xs / 2,
  },
  wordUpcoming: {
    color: colors.textMuted,
    opacity: 0.35,
  },
  wordRead: {
    color: colors.textPrimary,
    opacity: 1,
  },
  wordActive: {
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 4,
  },
});

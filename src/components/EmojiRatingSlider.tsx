import { useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

export interface RatingBucket {
  value: number;
  emoji: string;
  label: string;
}

interface EmojiRatingSliderProps {
  buckets: RatingBucket[];
  initialValue?: number;
  onValueChange?: (value: number) => void;
}

const TRACK_INSET = 14;

/**
 * Generic 1-N emoji/label rating slider — used for the "connection to
 * Hashem" check-in step and reused as-is by the onboarding demo slide.
 *
 * Built on a plain PanResponder + View track rather than a native slider
 * component: inside the lock-screen intercept overlay the native slider's
 * gesture recognizer wasn't reliably receiving touch/drag events, so this
 * keeps the whole gesture in JS where tap-anywhere and drag both just work.
 */
export function EmojiRatingSlider({ buckets, initialValue, onValueChange }: EmojiRatingSliderProps) {
  const sorted = [...buckets].sort((a, b) => a.value - b.value);
  const [value, setValue] = useState(initialValue ?? sorted[Math.floor(sorted.length / 2)].value);
  const [trackWidth, setTrackWidth] = useState(0);
  const current = sorted.find((b) => b.value === value) ?? sorted[0];

  // Mirrored into refs so the PanResponder instance (created once below) can
  // always read the latest values without needing to be recreated per render.
  const valueRef = useRef(value);
  valueRef.current = value;
  const trackWidthRef = useRef(trackWidth);
  trackWidthRef.current = trackWidth;
  const trackRef = useRef<View>(null);
  // Absolute screen X of the track's left edge, captured via measure() on
  // layout. `locationX` from the gesture event is relative to whatever view
  // is currently under the finger and gets unreliable/jumpy on fast drags
  // (a known RN PanResponder quirk), so we instead use the touch's stable
  // page-absolute X (pageX) and subtract this fixed offset ourselves.
  const trackPageXRef = useRef(0);

  const commitValue = (next: number) => {
    if (next === valueRef.current) return;
    setValue(next);
    onValueChange?.(next);
  };

  const selectFromLocalX = (x: number) => {
    const usable = trackWidthRef.current - TRACK_INSET * 2;
    if (usable <= 0) return;
    const ratio = Math.min(1, Math.max(0, (x - TRACK_INSET) / usable));
    const index = Math.round(ratio * (sorted.length - 1));
    const bucket = sorted[index];
    if (bucket) commitValue(bucket.value);
  };

  const selectFromPageX = (pageX: number) => selectFromLocalX(pageX - trackPageXRef.current);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => selectFromPageX(evt.nativeEvent.pageX),
      onPanResponderMove: (evt, gestureState) => selectFromPageX(gestureState.moveX || evt.nativeEvent.pageX),
    })
  ).current;

  const handleAccessibilityAction = (actionName: string) => {
    const index = sorted.findIndex((b) => b.value === valueRef.current);
    if (actionName === 'increment' && index < sorted.length - 1) commitValue(sorted[index + 1].value);
    if (actionName === 'decrement' && index > 0) commitValue(sorted[index - 1].value);
  };

  const activeIndex = sorted.findIndex((b) => b.value === value);
  const innerWidth = Math.max(0, trackWidth - TRACK_INSET * 2);
  const fillWidth = sorted.length > 1 ? (activeIndex / (sorted.length - 1)) * innerWidth : innerWidth;

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{current.emoji}</Text>
      <View
        ref={trackRef}
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => {
          setTrackWidth(e.nativeEvent.layout.width);
          trackRef.current?.measure((_x, _y, _w, _h, pageX) => {
            trackPageXRef.current = pageX;
          });
        }}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="דירוג הקשר"
        accessibilityValue={{ min: sorted[0].value, max: sorted[sorted.length - 1].value, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => handleAccessibilityAction(e.nativeEvent.actionName)}
      >
        <View style={styles.trackLine} />
        <View style={[styles.trackFill, { width: fillWidth }]} />
        {/* Decorative only — pointerEvents="none" so touches always fall through to the track's PanResponder above, never get swallowed by the dots. */}
        <View style={styles.dotsRow} pointerEvents="none">
          {sorted.map((bucket) => (
            <View key={bucket.value} style={[styles.dot, bucket.value === value && styles.dotActive]} />
          ))}
        </View>
      </View>
      <Text style={styles.label}>{current.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
  },
  emoji: {
    fontSize: 56,
  },
  track: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: TRACK_INSET,
  },
  trackLine: {
    position: 'absolute',
    left: TRACK_INSET,
    right: TRACK_INSET,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfacePressed,
  },
  trackFill: {
    position: 'absolute',
    left: TRACK_INSET,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.surfacePressed,
    borderWidth: 2,
    borderColor: colors.background,
  },
  dotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
  },
});
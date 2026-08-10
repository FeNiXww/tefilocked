import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { ContentItem } from '../../content/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, spacing, typography } from '../../theme';
import { HighlightedPrayerText } from './HighlightedPrayerText';

interface ContentDisplayProps {
  content: ContentItem;
  onContinue: () => void;
  continuing: boolean;
  heading?: string;
  continueLabel?: string;
}

export function ContentDisplay({ content, onContinue, continuing, heading, continueLabel }: ContentDisplayProps) {
  const [isFullyRead, setIsFullyRead] = useState(false);
  const buttonAnim = useSharedValue(0);

  // A new content item (e.g. moving from the "content" step to the
  // "verse" step) means the reading gate must re-lock.
  useEffect(() => {
    setIsFullyRead(false);
    buttonAnim.value = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content.id]);

  useEffect(() => {
    if (!isFullyRead) return;
    buttonAnim.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.back(1.4)) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullyRead]);

  const canContinue = isFullyRead && !continuing;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + buttonAnim.value * 0.65,
    transform: [{ scale: 0.9 + buttonAnim.value * 0.1 }],
  }));

  return (
    <View style={styles.container}>
      {heading ? <Text style={styles.heading}>{heading}</Text> : null}
      <HighlightedPrayerText text={content.hebrewText} onComplete={() => setIsFullyRead(true)} />
      {content.translation ? <Text style={styles.translation}>{content.translation}</Text> : null}
      <Text style={styles.source}>{content.source}</Text>
      <Animated.View style={[styles.buttonWrap, animatedStyle]}>
        <PrimaryButton
          label={continuing ? 'רגע...' : (continueLabel ?? 'המשך')}
          onPress={onContinue}
          disabled={!canContinue}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heading: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  translation: {
    ...typography.bodySecondary,
    textAlign: 'center',
  },
  source: {
    ...typography.caption,
  },
  buttonWrap: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});

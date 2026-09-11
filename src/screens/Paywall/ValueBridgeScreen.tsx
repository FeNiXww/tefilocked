import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getOnboardingFullAnswers } from '../../data/storage/mmkv';
import { INITIAL_ONBOARDING_ANSWERS, type OnboardingAnswers } from '../Onboarding/onboardingState';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const CONTENT_START_DELAY_MS = 150;
const CAPTION_DELAY_MS = CONTENT_START_DELAY_MS + 500;
const CONTINUE_DELAY_MS = CAPTION_DELAY_MS + 550;

// Source illustration's own pixel aspect ratio — used so the image scales
// without distortion. The full illustration now (dove, "vs" badge, pastry,
// and both of its own tag captions), not a cropped fragment of it.
const COMPARE_IMAGE_ASPECT_RATIO = 480 / 325;
const COMPARE_IMAGE: ImageSourcePropType = require('../../../assets/onboarding/value-bridge-compare.png');

/**
 * The paywall's opening beat — a value bridge shown BEFORE any price, so
 * "why pay for this" already has an answer before the ask. The illustration
 * is the whole point of this screen (an ordinary purchase against a lasting
 * habit), so it's sized to be the dominant thing on screen, not a small
 * supporting graphic — everything else here is one short personalized line
 * and the continue button. The illustration's own accent color was
 * re-graded to Tefillok's gold rather than left as-is.
 */
export function ValueBridgeScreen({ onNext }: { onNext: () => void }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const reduceMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();
  // Sized directly off the window instead of a percentage of an ambiguous
  // (content-sized, not stretch-sized) parent, which resolved inconsistently.
  // Matches the ScrollView's own horizontal padding (spacing.xl on each
  // side, see Paywall/index.tsx) — fills that full width.
  const compareImageWidth = windowWidth - spacing.xl * 2;
  const compareImageHeight = compareImageWidth / COMPARE_IMAGE_ASPECT_RATIO;
  const answers = getOnboardingFullAnswers<OnboardingAnswers>() ?? INITIAL_ONBOARDING_ANSWERS;
  const [canContinue, setCanContinue] = useState(reduceMotion);

  useEffect(() => {
    if (reduceMotion) return;
    const timer = setTimeout(() => setCanContinue(true), CONTINUE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  return (
    <View style={styles.container}>
      <View style={styles.stage}>
        <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(CONTENT_START_DELAY_MS).duration(550)}>
          <Image
            source={COMPARE_IMAGE}
            style={{ width: compareImageWidth, height: compareImageHeight }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text
          entering={reduceMotion ? undefined : FadeIn.delay(CAPTION_DELAY_MS).duration(450)}
          style={styles.compareText}
        >
          {answers.name ? `הרגל שנשאר איתך, ${answers.name}.` : 'הרגל שנשאר איתך.'}
        </Animated.Text>
      </View>

      {canContinue && (
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(400)} style={styles.buttonWrap}>
          <PrimaryButton label="המשך" onPress={onNext} variant="accent" style={styles.button} />
        </Animated.View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.xl,
      minHeight: 420,
      justifyContent: 'center',
    },
    stage: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    compareText: {
      ...typography.heading,
      fontSize: 17,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingHorizontal: spacing.md,
    },
    // The button's own `alignSelf: 'stretch'` (see PrimaryButton.tsx) only
    // does anything if ITS direct parent is itself stretched to a definite
    // width — `container` above is centered (shrink-wraps its children by
    // default), so without this the button had nothing to stretch against
    // and rendered pill-sized around its label instead of full width.
    buttonWrap: {
      alignSelf: 'stretch',
    },
    button: {
      alignSelf: 'stretch',
    },
  });
}

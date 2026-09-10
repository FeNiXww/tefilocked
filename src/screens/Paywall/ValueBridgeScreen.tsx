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
const COMPARE_IMAGE_NATIVE_WIDTH = 582;
const COMPARE_IMAGE_ASPECT_RATIO = COMPARE_IMAGE_NATIVE_WIDTH / 344;
const COMPARE_IMAGE: ImageSourcePropType = require('../../../assets/onboarding/value-bridge-compare.png');

// The two caption pills' Hebrew text used to be baked into the PNG itself,
// which went blurry as soon as the illustration was scaled past its native
// 582px width (see ValueBridgeScreen's width comment below). The pills'
// background/border/icon are still part of the artwork — only the text
// area of each was painted over to match its background — and the text
// itself is now real RN <Text>, positioned and rotated to match the
// original artwork's layout, so it stays crisp at any display size.
// Geometry (center/size/rotation) was measured directly off the source
// PNG's pixels, in the image's own 582×344 native coordinate space.
const COMPARE_TAGS = [
  { text: 'שלווה פנימית', centerX: 155.3, centerY: 67.9, width: 139, fontSize: 20, angleDeg: -6.79 },
  { text: 'במחיר של מאפה בחודש.', centerX: 408.6, centerY: 299.3, width: 193, fontSize: 17, angleDeg: -3.67 },
] as const;
const COMPARE_TAG_TEXT_COLOR = '#17130f';

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
  // Bled edge-to-edge (full window width, canceling the ScrollView's own
  // spacing.xl horizontal padding via negative margin below) rather than
  // capped to the content width — this is the screen's whole point, so it
  // should read as bigger than the surrounding text/button content.
  const compareImageWidth = windowWidth;
  const compareImageHeight = compareImageWidth / COMPARE_IMAGE_ASPECT_RATIO;
  const compareImageScale = compareImageWidth / COMPARE_IMAGE_NATIVE_WIDTH;
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
        <Animated.View
          entering={reduceMotion ? undefined : FadeIn.delay(CONTENT_START_DELAY_MS).duration(550)}
          style={{ marginHorizontal: -spacing.xl }}
        >
          <View style={{ width: compareImageWidth, height: compareImageHeight }}>
            <Image
              source={COMPARE_IMAGE}
              style={{ width: compareImageWidth, height: compareImageHeight }}
              resizeMode="contain"
            />
            {COMPARE_TAGS.map((tag) => {
              // Padded past the artwork-measured size so the real system
              // font (wider/narrower than whatever the original artwork
              // used) has room to breathe — numberOfLines +
              // adjustsFontSizeToFit then shrinks to fit that box instead
              // of wrapping or clipping the tail of the sentence off.
              const boxWidth = tag.width * compareImageScale * 1.15;
              const boxHeight = tag.fontSize * compareImageScale * 1.6;
              return (
                <Text
                  key={tag.text}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={[
                    styles.tagText,
                    {
                      left: tag.centerX * compareImageScale - boxWidth / 2,
                      top: tag.centerY * compareImageScale - boxHeight / 2,
                      width: boxWidth,
                      height: boxHeight,
                      lineHeight: boxHeight,
                      fontSize: tag.fontSize * compareImageScale,
                      transform: [{ rotate: `${tag.angleDeg}deg` }],
                    },
                  ]}
                >
                  {tag.text}
                </Text>
              );
            })}
          </View>
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
    tagText: {
      position: 'absolute',
      overflow: 'visible',
      textAlign: 'center',
      fontWeight: '800',
      color: COMPARE_TAG_TEXT_COLOR,
      writingDirection: 'rtl',
      includeFontPadding: false,
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

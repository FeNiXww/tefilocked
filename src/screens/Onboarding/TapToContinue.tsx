import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SparkleBackground } from '../../components/SparkleBackground';
import { colors, spacing, typography } from '../../theme';
import { ContinueNodeButton } from './ContinueNodeButton';
import { HighlightText } from './HighlightText';
import { OnboardingBlendedIllustration } from './OnboardingBlendedIllustration';
import { OnboardingHeroMedia } from './OnboardingHeroMedia';

interface TapToContinueProps {
  onNext: () => void;
  /** Supports `**phrase**` markers — those words pop in emphasized, accent-colored. */
  headline: string;
  body?: string;
  /** "hero" = full-bleed navy background, centered giant text (the Welcome beat). "light" = parchment background, centered headline (Problem/Solution/Bridge beats). */
  variant?: 'hero' | 'light';
  /** "hero" variant only — full-bleed artwork behind the navy backdrop, see OnboardingHeroMedia. */
  heroMedia?: ImageSourcePropType;
  /** "light" variant — artwork below the headline, faded into the parchment background (Welcome). */
  illustration?: ImageSourcePropType;
  children?: ReactNode;
}

const HEADLINE_STAGGER_MS = 130;
const BODY_EXTRA_DELAY_MS = 260;

/**
 * Full-bleed "tap anywhere to continue" narrative screen — the reference
 * app's Welcome/Problem/Solution/Bridge beats. No back arrow by design:
 * these are quick emotional beats, not decisions to revisit. The headline
 * pops in word by word (see HighlightText); the body and hint settle in
 * just after, so the beat reads as one small performance rather than a
 * static card appearing.
 */
export function TapToContinue({
  onNext,
  headline,
  body,
  variant = 'light',
  heroMedia,
  illustration,
  children,
}: TapToContinueProps) {
  const insets = useSafeAreaInsets();
  const fade = useSharedValue(0);
  const bodyFade = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const headlineWords = Math.max(1, headline.trim().split(/\s+/).length);
  const bodyStartDelay = headlineWords * HEADLINE_STAGGER_MS + BODY_EXTRA_DELAY_MS;

  useEffect(() => {
    fade.value = reduceMotion ? 1 : withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    bodyFade.value = reduceMotion
      ? 1
      : withDelay(bodyStartDelay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [{ translateY: (1 - fade.value) * 12 }],
  }));

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: bodyFade.value,
    transform: [{ translateY: (1 - bodyFade.value) * 8 }],
  }));

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
  };

  const handlePressOut = () => {
    pressProgress.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handlePress = () => {
    onNext();
  };

  const isHero = variant === 'hero';
  const hasIllustration = !isHero && !!illustration;

  return (
    <Pressable
      style={[
        styles.container,
        isHero && styles.heroContainer,
        hasIllustration && styles.containerWithIllustration,
        { paddingTop: (hasIllustration ? spacing.xxl : 0) + insets.top, paddingBottom: insets.bottom },
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
    >
      {!isHero && <SparkleBackground tone="navy" starCount={6} />}
      {isHero && heroMedia && <OnboardingHeroMedia source={heroMedia} />}
      <Animated.View style={[styles.content, fadeStyle]}>
        <HighlightText
          text={headline}
          style={isHero ? styles.heroHeadline : styles.lightHeadline}
          emphasisStyle={isHero ? styles.heroEmphasis : undefined}
          staggerMs={HEADLINE_STAGGER_MS}
        />
        {body ? (
          <Animated.Text style={[isHero ? styles.heroBody : styles.lightBody, bodyStyle]}>{body}</Animated.Text>
        ) : null}
        {children}
      </Animated.View>
      {hasIllustration ? (
        <Animated.View style={[styles.illustrationSlot, bodyStyle]} pointerEvents="none">
          <OnboardingBlendedIllustration source={illustration} />
        </Animated.View>
      ) : null}
      <View style={[styles.arrowBadgeWrap, { bottom: spacing.xl + insets.bottom }]} pointerEvents="none">
        <ContinueNodeButton pressProgress={pressProgress} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerWithIllustration: {
    justifyContent: 'flex-start',
    paddingTop: spacing.xxl,
  },
  illustrationSlot: {
    flex: 1,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.xxl + 52,
  },
  heroContainer: {
    backgroundColor: colors.primary,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
  },
  heroHeadline: {
    ...typography.hero,
    fontSize: 40,
    color: colors.background,
    textAlign: 'center',
  },
  heroEmphasis: {
    color: colors.accentLight,
  },
  heroBody: {
    ...typography.body,
    color: colors.accentLight,
    textAlign: 'center',
  },
  lightHeadline: {
    ...typography.hero,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  lightBody: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  arrowBadgeWrap: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
  },
});

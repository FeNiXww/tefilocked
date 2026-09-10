import { useEffect, useMemo } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { headlineFontFamily, useTheme, type ThemeColors, type Spacing, type Typography } from '../../../theme';
import { ContinueNodeButton } from '../ContinueNodeButton';
import { OnboardingAtmosphere } from '../motion/OnboardingAtmosphere';
import { WORLD } from '../motion/tokens';
import { ThemeToggleButton } from '../ThemeToggleButton';
import type { PagerPageProps } from './OnboardingPager';
import { usePageActive, usePageProgress } from './pagerAnimations';

const PHASE_1_TEXT = 'זה פשוט: פעם ביום, חוסמים לך את האפליקציות.';
const PHASE_2_TEXT = 'ברגע שמתפללים, האפליקציות שלך נפתחות.';

type BrandKey = 'youtube' | 'snapchat' | 'tiktok' | 'instagram';

interface BrandConfig {
  key: string;
  icon: BrandKey;
  gradient: readonly [string, string, ...string[]];
  iconColor: string;
}

// Order matches the reference beat: YouTube, Snapchat, TikTok, Instagram.
const BRANDS: BrandConfig[] = [
  { key: 'youtube', icon: 'youtube', gradient: ['#FF0000', '#CC0000'], iconColor: '#FFFFFF' },
  { key: 'snapchat', icon: 'snapchat', gradient: ['#FFFC00', '#FFE600'], iconColor: '#111111' },
  { key: 'tiktok', icon: 'tiktok', gradient: ['#0A0A0A', '#242424'], iconColor: '#25F4EE' },
  { key: 'instagram', icon: 'instagram', gradient: ['#F58529', '#DD2A7B', '#8134AF'], iconColor: '#FFFFFF' },
];

const LOCK_GRADIENT = ['#F6E7BE', '#C79A3D', '#8A6A24'] as const;

const TABLETS_ILLUSTRATION = require('../../../../assets/onboarding/moses-tablets.png') as ImageSourcePropType;

interface LockSlot {
  iconOpacity: SharedValue<number>;
  iconScale: SharedValue<number>;
  iconDim: SharedValue<number>;
  lockOpacity: SharedValue<number>;
  lockScale: SharedValue<number>;
  lockTranslateY: SharedValue<number>;
}

/** All the motion state for one icon+lock pair. Memoized so its identity is stable across renders — the choreography effect below depends on it. */
function useLockSlot(): LockSlot {
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconDim = useSharedValue(1);
  const lockOpacity = useSharedValue(0);
  const lockScale = useSharedValue(1.5);
  const lockTranslateY = useSharedValue(-40);

  return useMemo(
    () => ({ iconOpacity, iconScale, iconDim, lockOpacity, lockScale, lockTranslateY }),
    [iconOpacity, iconScale, iconDim, lockOpacity, lockScale, lockTranslateY]
  );
}

const hit = (style: Haptics.ImpactFeedbackStyle) => Haptics.impactAsync(style).catch(() => {});

/**
 * Screen 3 — "The Lockdown": the app's core mechanic acted out as a loop.
 * Icons pop in → padlocks slam shut → a pause to let it land → the release.
 * The whole sequence is driven from JS (setTimeout chains assigning
 * `withSpring`/`withTiming` onto shared values) rather than worklets, since
 * it's a long, branching timeline mixed with `expo-haptics` calls — much
 * easier to read and cancel cleanly than chaining `runOnJS` callbacks.
 */
export function ScreenThree({ index, scrollX, pageWidth, onComplete }: PagerPageProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const progress = usePageProgress(scrollX, index, pageWidth);
  const isActive = usePageActive(scrollX, index, pageWidth);
  const reducedMotion = useReducedMotion();
  const pressProgress = useSharedValue(0);

  const slot0 = useLockSlot();
  const slot1 = useLockSlot();
  const slot2 = useLockSlot();
  const slot3 = useLockSlot();
  const slots = useMemo(() => [slot0, slot1, slot2, slot3], [slot0, slot1, slot2, slot3]);

  const phase1Opacity = useSharedValue(0);
  const phase2Opacity = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      slots.forEach((slot) => {
        slot.iconOpacity.value = 1;
        slot.iconScale.value = 1;
        slot.iconDim.value = 1;
        slot.lockOpacity.value = 0;
        slot.lockScale.value = 1;
        slot.lockTranslateY.value = 0;
      });
      phase1Opacity.value = 1;
      phase2Opacity.value = 0;
      return;
    }

    if (!isActive) return;

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timeouts.push(setTimeout(resolve, ms));
      });

    async function loop() {
      while (!cancelled) {
        // Reset to hidden/unlocked-but-invisible before each pass.
        slots.forEach((slot) => {
          slot.iconOpacity.value = 0;
          slot.iconScale.value = 0;
          slot.iconDim.value = 1;
          slot.lockOpacity.value = 0;
          slot.lockScale.value = 1.5;
          slot.lockTranslateY.value = -40;
        });
        phase2Opacity.value = 0;
        phase1Opacity.value = withTiming(1, { duration: 350 });

        // Phase 1 — icons pop in, staggered 75ms apart, bouncy overshoot.
        for (let i = 0; i < slots.length; i++) {
          if (cancelled) return;
          await wait(i === 0 ? 350 : 75);
          if (cancelled) return;
          const slot = slots[i];
          slot.iconOpacity.value = withTiming(1, { duration: 120 });
          slot.iconScale.value = withSequence(
            withSpring(1.1, { damping: 6, stiffness: 260, mass: 0.5 }),
            withSpring(1, { damping: 11, stiffness: 220, mass: 0.6 })
          );
          hit(Haptics.ImpactFeedbackStyle.Light);
        }

        await wait(600);
        if (cancelled) return;

        // Phase 2 — padlocks slam down from above, staggered, heavy spring.
        for (let i = 0; i < slots.length; i++) {
          if (cancelled) return;
          const slot = slots[i];
          slot.lockOpacity.value = 1;
          slot.lockTranslateY.value = withSpring(0, { damping: 12, stiffness: 300, mass: 1.1 });
          slot.lockScale.value = withSpring(1, { damping: 10, stiffness: 260, mass: 1.1 });
          slot.iconScale.value = withSequence(
            withTiming(0.9, { duration: 110, easing: Easing.out(Easing.quad) }),
            withSpring(0.92, { damping: 8, stiffness: 200 })
          );
          slot.iconDim.value = withTiming(0.55, { duration: 200 });
          hit(Haptics.ImpactFeedbackStyle.Heavy);
          await wait(80);
        }

        await wait(1200);
        if (cancelled) return;

        // Phase 3 — release: text crossfades, locks spring up and away.
        phase1Opacity.value = withTiming(0, { duration: 350 });
        phase2Opacity.value = withTiming(1, { duration: 350 });
        slots.forEach((slot) => {
          slot.lockTranslateY.value = withTiming(-46, { duration: 260, easing: Easing.out(Easing.cubic) });
          slot.lockScale.value = withTiming(0.6, { duration: 260 });
          slot.lockOpacity.value = withTiming(0, { duration: 220 });
          slot.iconScale.value = withSpring(1, { damping: 9, stiffness: 240 });
          slot.iconDim.value = withTiming(1, { duration: 260 });
        });
        hit(Haptics.ImpactFeedbackStyle.Medium);
        await wait(90);
        if (cancelled) return;
        hit(Haptics.ImpactFeedbackStyle.Light);

        await wait(3000);
        if (cancelled) return;

        // Crossfade back to the phase-1 text just before the loop restarts.
        phase2Opacity.value = withTiming(0, { duration: 300 });
        phase1Opacity.value = withTiming(1, { duration: 300 });
        await wait(300);
      }
    }

    loop();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [isActive, reducedMotion, slots, phase1Opacity, phase2Opacity]);

  const containerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(progress.value, [-1, 0], [28, 0], Extrapolation.CLAMP);
    const opacity = interpolate(progress.value, [-1, -0.35, 0], [0, 0.3, 1], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });
  const headline1Style = useAnimatedStyle(() => ({ opacity: phase1Opacity.value }));
  const headline2Style = useAnimatedStyle(() => ({ opacity: phase2Opacity.value }));

  const handlePressIn = () => {
    pressProgress.value = withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) });
    hit(Haptics.ImpactFeedbackStyle.Rigid);
  };
  const handlePressOut = () => {
    pressProgress.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.quad) });
    hit(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 72 }]}>
      <OnboardingAtmosphere world={WORLD.lockdown} richness="balanced" />
      <ThemeToggleButton />

      <Animated.View style={[styles.headlineWrap, containerStyle]}>
        <Animated.Text style={[styles.headline, headline1Style]}>{PHASE_1_TEXT}</Animated.Text>
        <Animated.Text style={[styles.headline, headline2Style]}>{PHASE_2_TEXT}</Animated.Text>
      </Animated.View>

      <View style={styles.iconsRow}>
        {BRANDS.map((brand, i) => (
          <LockedSocialIcon key={brand.key} brand={brand} slot={slots[i]} />
        ))}
      </View>

      <Image source={TABLETS_ILLUSTRATION} style={styles.tabletsImage} resizeMode="contain" />

      <Pressable
        style={[styles.continueWrap, { bottom: spacing.xl + insets.bottom }]}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onComplete}
      >
        <ContinueNodeButton pressProgress={pressProgress} />
      </Pressable>
    </View>
  );
}

function LockedSocialIcon({ brand, slot }: { brand: BrandConfig; slot: LockSlot }) {
  const { colors, spacing, typography } = useTheme();
  const styles = createStyles(colors, spacing, typography);
  const iconStyle = useAnimatedStyle(() => ({
    opacity: slot.iconOpacity.value * slot.iconDim.value,
    transform: [{ scale: slot.iconScale.value }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: slot.lockOpacity.value,
    transform: [{ translateY: slot.lockTranslateY.value }, { scale: slot.lockScale.value }],
  }));

  return (
    <View style={styles.iconSlot}>
      <Animated.View style={[styles.iconBadge, iconStyle]}>
        <LinearGradient
          colors={brand.gradient}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <FontAwesome6 name={brand.icon} brand size={26} color={brand.iconColor} />
      </Animated.View>

      {/* Shadow lives on this outer, non-clipped wrapper; the gradient fill and icon are clipped inside. */}
      <Animated.View style={[styles.lockShadowWrap, lockStyle]}>
        <View style={styles.lockBadgeInner}>
          <LinearGradient
            colors={LOCK_GRADIENT}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="lock-closed" size={18} color={colors.primaryDark} />
        </View>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors, spacing: Spacing, typography: Typography) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    headlineWrap: {
      height: 100,
      width: '100%',
    },
    headline: {
      ...typography.hero,
      fontFamily: headlineFontFamily,
      fontSize: 26,
      textAlign: 'center',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    iconsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.lg,
      marginTop: spacing.xxl * 2,
    },
    tabletsImage: {
      flex: 1,
      width: '100%',
      marginTop: spacing.xl,
    },
    iconSlot: {
      width: 64,
      alignItems: 'center',
    },
    iconBadge: {
      width: 60,
      height: 60,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    lockShadowWrap: {
      position: 'absolute',
      top: -16,
      width: 34,
      height: 34,
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 8,
    },
    lockBadgeInner: {
      flex: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    continueWrap: {
      position: 'absolute',
      right: spacing.xl,
    },
  });
}

import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '../../../haptics';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { PermissionCard } from '../../../components/PermissionCard';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useAndroidLockingPermissions } from '../../../native/appLocking/useAndroidLockingPermissions';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../../theme';
import type { StepComponentProps } from '../onboardingState';
import { OnboardingScreenShell } from '../OnboardingScreenShell';

/**
 * The onboarding's permission-setup beat — placed right after CoreLoopDemo,
 * once the user has actually experienced the pray-to-unlock loop themselves,
 * so "why does this need system permissions" already has an answer before
 * it's asked. Android-only: iOS's Screen Time permission is a single
 * FamilyControls runtime prompt handled elsewhere (IOSLockList), not a
 * two-step Settings walkthrough, so this step is excluded from
 * ONBOARDING_STEPS entirely on iOS rather than rendering something empty here.
 *
 * Deliberately minimal: the two PermissionCards are the only actions on the
 * page while setup is incomplete — no duplicate "grant" CTA competing with
 * them. The continue button only appears once both are actually granted, so
 * it never has to explain itself.
 */
export function PermissionSetup({ onNext, onBack, progress }: StepComponentProps) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const { status, granted, attempted, requestUsageAccess, requestOverlay } = useAndroidLockingPermissions();
  const grantedCount = (status?.usageStats ? 1 : 0) + (status?.overlay ? 1 : 0);

  // Usage access is asked first — it's the simpler concept ("which app is
  // open") — and overlay only becomes the emphasized card once it's done,
  // so the two Settings trips never feel like they were dumped on the user
  // at once.
  const usageIsNext = !status?.usageStats;

  const reduceMotion = useReducedMotion();
  const successOpacity = useSharedValue(granted ? 1 : 0);
  const successTranslate = useSharedValue(granted ? 0 : 8);
  const wasGranted = useRef(granted);

  useEffect(() => {
    if (granted && !wasGranted.current) {
      successOpacity.value = reduceMotion ? 1 : withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      successTranslate.value = reduceMotion ? 0 : withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
      haptics.success();
    }
    wasGranted.current = granted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [granted, reduceMotion]);

  const successStyle = useAnimatedStyle(() => ({
    opacity: successOpacity.value,
    transform: [{ translateY: successTranslate.value }],
  }));

  return (
    <OnboardingScreenShell onBack={onBack} progress={progress} tone="accent">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>הגדרה חד-פעמית</Text>
          {!granted && (
            <View
              style={styles.counterPill}
              accessibilityLabel={`${grantedCount} מתוך 2 הרשאות הושלמו`}
            >
              <Text style={styles.counterPillText}>{grantedCount}/2</Text>
            </View>
          )}
        </View>

        {!granted && <Text style={styles.subtitle}>רק שתי הרשאות קטנות כדי שתפילוק תוכל לעבוד</Text>}

        <View style={styles.cards}>
          <PermissionCard
            icon="eye-outline"
            title="גישה לנתוני שימוש"
            what="מזהה איזו אפליקציה פתוחה כרגע"
            granted={!!status?.usageStats}
            deniedAfterAttempt={attempted.usageStats && !status?.usageStats}
            onPress={requestUsageAccess}
            emphasized={usageIsNext || !!status?.usageStats}
          />
          <PermissionCard
            icon="layers-outline"
            title="הצגה מעל אפליקציות אחרות"
            what="מציגה את מסך התפילה כשצריך"
            granted={!!status?.overlay}
            deniedAfterAttempt={attempted.overlay && !status?.overlay}
            onPress={requestOverlay}
            emphasized={!usageIsNext || !!status?.overlay}
          />
        </View>

        {granted && (
          <>
            <Animated.View style={[styles.successRow, successStyle]}>
              <View style={styles.successBadge}>
                <Ionicons name="checkmark" size={18} color={colors.background} />
              </View>
              <Text style={styles.successText}>הכול מוכן</Text>
            </Animated.View>

            <PrimaryButton label="המשך" variant="accent" glow onPress={onNext} style={styles.continueButton} />
          </>
        )}
      </View>
    </OnboardingScreenShell>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.title,
    textAlign: 'right',
  },
  counterPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.accentLight,
  },
  // `accentLight` is a fixed light tone in both themes (see colors.ts), so
  // this text is fixed to match rather than pulled from the theme, which
  // would otherwise hand dark mode its light pastel-blue `accentDark`
  // (meant for text on a dark background) against this always-light pill.
  counterPillText: {
    ...typography.caption,
    color: lightColors.accentDark,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'right',
  },
  cards: {
    gap: spacing.md,
  },
  successRow: {
    flexDirection: 'row-reverse',
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  successBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    ...typography.heading,
  },
  continueButton: {
    marginTop: spacing.sm,
  },
  });
}

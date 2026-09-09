import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SparkleBackground } from '../../components/SparkleBackground';
import { haptics } from '../../haptics';
import { billingSummary, type SubscriptionPlan } from '../../subscriptions/pricing';
import { getOfferings, purchasePackage } from '../../subscriptions/revenueCatConfig';
import { startTrial } from '../../subscriptions/subscriptionState';
import { scheduleTrialEndingReminder } from '../../subscriptions/trialReminder';
import { spacing, useTheme, type ThemeColors } from '../../theme';
import { JourneyPreviewScreen } from './JourneyPreviewScreen';
import { PlanScreen } from './PlanScreen';
import { TrialReminderScreen } from './TrialReminderScreen';

interface PaywallProps {
  /** Called once a purchase has gone through and the trial has been recorded — the caller takes the user into the app. */
  onTrialStarted: () => void;
}

const PAGE_COUNT = 3;
const GENERIC_PURCHASE_ERROR = 'משהו השתבש בעת הרכישה. נסו שוב.';

/**
 * The gate between onboarding and the app itself, presented as a short
 * 3-screen sequence (a cinematic preview of the week ahead → a heads-up that
 * a reminder is coming → plan + CTA) rather than one long scroll — each
 * screen builds a bit more value before the ask.
 *
 * The final CTA opens real Play Billing/StoreKit via RevenueCat
 * (subscriptions/revenueCatConfig.ts) for the selected plan's package in the
 * current offering. The 3-day free trial itself is the store's own
 * introductory offer (configured per-product in App Store Connect / Play
 * Console) — startTrial() below only mirrors that into local state so the
 * rest of the app (trial countdown copy, the "ending soon" reminder) has a
 * timestamp to read without querying RevenueCat everywhere.
 */
export function Paywall({ onTrialStarted }: PaywallProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [pageIndex, setPageIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entrance = useSharedValue(0);

  const goToPage = (index: number) => {
    entrance.value = 0;
    setPageIndex(index);
    entrance.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  };

  useEffect(() => {
    entrance.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [{ translateY: (1 - entrance.value) * 16 }],
  }));

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    haptics.selection();
    setSelectedPlan(plan);
    setError(null);
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const offerings = await getOfferings();
      const pkg = selectedPlan === 'yearly' ? offerings.current?.annual : offerings.current?.monthly;
      if (!pkg) throw new Error(`No "${selectedPlan}" package in the current offering`);

      const entitlementActive = await purchasePackage(pkg);
      if (!entitlementActive) throw new Error('Purchase completed but no active entitlement was granted');

      // Mirror into local state — see the module comment for why. The trial
      // length here is cosmetic (TRIAL_DURATION_MS); the store's own
      // introductory offer is what actually governs billing.
      startTrial(selectedPlan);
      await scheduleTrialEndingReminder().catch(() => {});
      onTrialStarted();
    } catch (err) {
      const userCancelled = (err as { userCancelled?: boolean } | null)?.userCancelled;
      if (!userCancelled) {
        console.warn('[tefillok] Purchase failed:', err);
        setError(GENERIC_PURCHASE_ERROR);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <SparkleBackground tone="accent" starCount={10} />

      <View style={styles.dots} pointerEvents="none">
        {Array.from({ length: PAGE_COUNT }).map((_, index) => (
          <View key={index} style={[styles.dot, index === pageIndex && styles.dotActive]} />
        ))}
      </View>

      {pageIndex > 0 && (
        <Pressable style={styles.backButton} onPress={() => goToPage(pageIndex - 1)} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={entranceStyle}>
          {pageIndex === 0 && <JourneyPreviewScreen onNext={() => goToPage(1)} />}
          {pageIndex === 1 && <TrialReminderScreen onNext={() => goToPage(2)} />}
          {pageIndex === 2 && (
            <PlanScreen
              selectedPlan={selectedPlan}
              onSelectPlan={handleSelectPlan}
              busy={busy}
              onConfirm={handleConfirm}
              error={error}
            />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl + spacing.sm,
    flexGrow: 1,
    justifyContent: 'center',
  },
  dots: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 22,
  },
  backButton: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    zIndex: 10,
  },
  backArrow: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  });
}

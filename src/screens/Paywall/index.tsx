import { useEffect, useState } from 'react';
import { BackHandler, DeviceEventEmitter, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { DEV_RESET_ONBOARDING_EVENT } from '../../dev/devReset';
import { haptics } from '../../haptics';
import { hasSeenPaywallExitOffer, markPaywallExitOfferSeen } from '../../data/storage/mmkv';
import { billingSummary, type SubscriptionPlan } from '../../subscriptions/pricing';
import { getOfferings, purchasePackage, purchasePlanForExitOffer } from '../../subscriptions/revenueCatConfig';
import { startTrial } from '../../subscriptions/subscriptionState';
import { scheduleTrialEndingReminder } from '../../subscriptions/trialReminder';
import { spacing, useTheme, type ThemeColors } from '../../theme';
import { OnboardingAtmosphere } from '../Onboarding/motion/OnboardingAtmosphere';
import { WORLD } from '../Onboarding/motion/tokens';
import { PaywallExitOfferScreen } from './PaywallExitOfferScreen';
import { shouldShowPaywallExitOffer } from './paywallExitOffer';
import { PlanScreen } from './PlanScreen';
import { TrialReminderScreen } from './TrialReminderScreen';
import { ValueBridgeScreen } from './ValueBridgeScreen';

interface PaywallProps {
  /** Called once a purchase has gone through and the trial has been recorded — the caller takes the user into the app. */
  onTrialStarted: () => void;
}

const PAGE_COUNT = 3;
const LAST_PAGE_INDEX = PAGE_COUNT - 1;
const GENERIC_PURCHASE_ERROR = 'משהו השתבש בעת הרכישה. נסו שוב.';

/**
 * The gate between onboarding and the app itself, presented as a short
 * 3-screen sequence (a value bridge → a heads-up that a reminder is coming →
 * plan + CTA) rather than one long scroll — each screen builds a bit more
 * value before the ask. The "here's your first week" preview now lives in
 * onboarding itself (see Onboarding/steps/FirstWeekStep.tsx), right after
 * the commitment/setup steps — there wasn't a good reason to make the user
 * wait until the paywall to see it.
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
  const [showExitOffer, setShowExitOffer] = useState(false);

  const entrance = useSharedValue(0);

  const goToPage = (index: number) => {
    entrance.value = 0;
    setPageIndex(index);
    entrance.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
  };

  // Backing out of the final pricing page shows a one-time exit offer (see
  // PaywallExitOfferScreen) instead of just stepping back — but only once
  // per install (hasSeenPaywallExitOffer), so it can never be farmed by
  // repeatedly opening/backing out of the paywall.
  const handleBack = () => {
    if (shouldShowPaywallExitOffer(pageIndex, LAST_PAGE_INDEX, hasSeenPaywallExitOffer())) {
      markPaywallExitOfferSeen();
      setShowExitOffer(true);
      return;
    }
    goToPage(pageIndex - 1);
  };

  useEffect(() => {
    if (pageIndex === 0 && !showExitOffer) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showExitOffer) {
        setShowExitOffer(false);
        goToPage(LAST_PAGE_INDEX - 1);
      } else {
        handleBack();
      }
      return true;
    });
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, showExitOffer]);

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

      // The exit-offer screen quotes a deeper one-time price — genuinely
      // configured on both stores (see revenueCatConfig.ts), so this
      // requests that specific offer instead of the package's default price
      // whenever it's actually available to this user, falling back to the
      // regular package otherwise. This never charges more than what's on screen.
      const entitlementActive = showExitOffer ? await purchasePlanForExitOffer(pkg) : await purchasePackage(pkg);
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
      <OnboardingAtmosphere world={showExitOffer ? WORLD.paywallExitOffer : WORLD.paywall} richness="balanced" />

      {!showExitOffer && (
        <View style={styles.dots} pointerEvents="none">
          {Array.from({ length: PAGE_COUNT }).map((_, index) => (
            <View key={index} style={[styles.dot, index === pageIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      {pageIndex > 0 && !showExitOffer && (
        <Pressable style={styles.backButton} onPress={handleBack} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
      )}

      {/* Dev-only escape hatch for re-running onboarding without reinstalling
          — stripped from release builds by __DEV__, same mechanism as the
          Settings screen's "reset onboarding" row (see devReset.ts). */}
      {__DEV__ && (
        <Pressable
          style={styles.devResetButton}
          onPress={() => DeviceEventEmitter.emit(DEV_RESET_ONBOARDING_EVENT)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="איפוס אונבורדינג (כלי פיתוח)"
        >
          <Text style={styles.devResetText}>DEV ↺</Text>
        </Pressable>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={entranceStyle}>
          {showExitOffer ? (
            <PaywallExitOfferScreen
              selectedPlan={selectedPlan}
              onSelectPlan={handleSelectPlan}
              busy={busy}
              onConfirm={handleConfirm}
              onLeave={() => {
                setShowExitOffer(false);
                goToPage(LAST_PAGE_INDEX - 1);
              }}
              error={error}
            />
          ) : (
            <>
              {pageIndex === 0 && <ValueBridgeScreen onNext={() => goToPage(1)} />}
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
            </>
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
  devResetButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.danger,
  },
  devResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  });
}

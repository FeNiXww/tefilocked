import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { PrimaryButton } from '../../components/PrimaryButton';
import { TextLinkButton } from '../../components/TextLinkButton';
import { getOnboardingGender } from '../../data/storage/mmkv';
import { FocalLight } from '../Onboarding/motion/OnboardingLight';
import { pickG } from '../Onboarding/onboardingState';
import { EXIT_OFFER_YEARLY, exitOfferBillingSummary, PRICING, type SubscriptionPlan } from '../../subscriptions/pricing';
import { TRIAL_LENGTH_DAYS } from '../../subscriptions/trialConfig';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

interface PaywallExitOfferScreenProps {
  selectedPlan: SubscriptionPlan;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  busy: boolean;
  onConfirm: () => void;
  onLeave: () => void;
  error?: string | null;
}

/**
 * Shown once, instead of immediately exiting, when the user backs out of the
 * pricing screen — a final, honest invitation, not a dark pattern. Quotes a
 * genuinely cheaper one-time price (EXIT_OFFER_YEARLY) backed by a real
 * store offer on both platforms — a Google Play "offer" on the yearly base
 * plan (Android) and an App Store Connect Promotional Offer (iOS), both
 * named exit-offer-55 / exit_offer_55 and priced at the same ₪53.50. See
 * purchasePlanForExitOffer in revenueCatConfig.ts, which `onConfirm`
 * (driven by Paywall/index.tsx) requests instead of the regular price — so
 * what's shown here is what's actually charged, for whichever store the
 * user happens to be on.
 *
 * `hasSeenPaywallExitOffer` in mmkv (see Paywall/index.tsx) makes sure this
 * only ever shows once per install — backing out a second time exits for real.
 */
export function PaywallExitOfferScreen({ selectedPlan, onSelectPlan, busy, onConfirm, onLeave, error }: PaywallExitOfferScreenProps) {
  const { colors, scheme, typography } = useTheme();
  const styles = createStyles(colors, scheme === 'dark', typography);
  const reduceMotion = useReducedMotion();
  const gender = getOnboardingGender();

  // The offer is yearly-only — a deeper discount only makes sense against
  // the plan it's discounting. Force 'yearly' regardless of whatever was
  // selected back on the pricing page, so `onConfirm` (driven by
  // `selectedPlan` in Paywall/index.tsx) purchases the right package even if
  // the user had monthly selected before backing out into this screen.
  useEffect(() => {
    if (selectedPlan !== 'yearly') onSelectPlan('yearly');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.iconStage}>
        <FocalLight size={200} tone="warm" peakOpacity={0.26} revealDurationMs={700} style={styles.glow} />
        <View style={styles.iconWrap}>
          <Ionicons name="hand-left-outline" size={30} color={lightColors.accentDark} />
        </View>
      </View>

      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(450)} style={styles.textBlock}>
        <Text style={styles.title}>חכה רגע.</Text>
        <Text style={styles.subtitle}>לא היינו רוצים שזה ייגמר כאן.</Text>
        <Text style={styles.body}>הנה מחיר מיוחד להתחלה שלך — חד-פעמי, למי שכבר כמעט יצא.</Text>
      </Animated.View>

      <View style={styles.offerCard}>
        <View style={styles.discountBadge}>
          <Text style={styles.discountBadgeText}>{`הנחה חד-פעמית ${EXIT_OFFER_YEARLY.savingsPercentLabel}`}</Text>
        </View>
        <Text style={styles.offerTitle}>שנתי</Text>
        <View style={styles.priceRow}>
          <Text style={styles.strikethroughPrice}>{PRICING.yearly.priceLabel}</Text>
          <Text style={styles.offerPrice}>{EXIT_OFFER_YEARLY.priceLabel}</Text>
          <Text style={styles.period}>{EXIT_OFFER_YEARLY.periodLabel}</Text>
        </View>
        <Text style={styles.equivalent}>{`שווה ל-${EXIT_OFFER_YEARLY.monthlyEquivalentLabel} לחודש`}</Text>
        <View style={styles.trialTag}>
          <Text style={styles.trialTagText}>{TRIAL_LENGTH_DAYS} ימים בחינם</Text>
        </View>
      </View>

      <PrimaryButton
        label={busy ? 'רגע...' : 'כן, אני רוצה להתחיל'}
        onPress={onConfirm}
        disabled={busy}
        variant="accent"
        glow
        style={styles.confirmButton}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.billingSummary}>{exitOfferBillingSummary()}</Text>

      <TextLinkButton label={pickG(gender, 'לא תודה, אני יוצא', 'לא תודה, אני יוצאת')} onPress={onLeave} />
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean, typography: Typography) {
  return StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: spacing.md,
    },
    iconStage: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 80,
      marginBottom: spacing.xs,
    },
    glow: {
      position: 'absolute',
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.accentLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textBlock: {
      alignItems: 'center',
      gap: 4,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.hero,
      fontSize: 26,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.heading,
      fontSize: 17,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    body: {
      ...typography.bodySecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    offerCard: {
      alignSelf: 'stretch',
      alignItems: 'center',
      borderRadius: 20,
      backgroundColor: isDark ? `${colors.primary}33` : colors.accentLight,
      borderWidth: 2,
      borderColor: colors.accent,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.sm,
    },
    discountBadge: {
      position: 'absolute',
      top: -12,
      backgroundColor: colors.success,
      borderRadius: 10,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    discountBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.background,
    },
    offerTitle: {
      ...typography.body,
      fontWeight: '700',
      color: isDark ? colors.textPrimary : lightColors.primary,
      marginTop: spacing.xs,
    },
    priceRow: {
      flexDirection: 'row-reverse',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 2,
    },
    strikethroughPrice: {
      ...typography.bodySecondary,
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    offerPrice: {
      ...typography.hero,
      fontSize: 26,
      color: isDark ? colors.textPrimary : lightColors.primary,
    },
    period: {
      ...typography.bodySecondary,
    },
    equivalent: {
      ...typography.caption,
      marginTop: 2,
    },
    trialTag: {
      marginTop: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trialTagText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.accentDark,
    },
    confirmButton: {
      alignSelf: 'stretch',
      marginTop: spacing.sm,
    },
    errorText: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.danger,
      textAlign: 'center',
    },
    billingSummary: {
      ...typography.caption,
      fontWeight: '600',
      color: colors.textSecondary,
      textAlign: 'center',
    },
  });
}

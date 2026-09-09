import { Pressable, StyleSheet, Text, View } from 'react-native';
import { haptics } from '../../haptics';
import { PRICING, type SubscriptionPlan } from '../../subscriptions/pricing';
import { TRIAL_LENGTH_DAYS } from '../../subscriptions/trialConfig';
import { lightColors, spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const PLAN_TITLES: Record<SubscriptionPlan, string> = {
  monthly: 'חודשי',
  yearly: 'שנתי',
};

interface PlanOptionCardProps {
  plan: SubscriptionPlan;
  selected: boolean;
  onSelect: (plan: SubscriptionPlan) => void;
}

export function PlanOptionCard({ plan, selected, onSelect }: PlanOptionCardProps) {
  const { colors, scheme, typography } = useTheme();
  const styles = createStyles(colors, scheme === 'dark', typography);
  const isYearly = plan === 'yearly';
  const option = isYearly ? PRICING.yearly : PRICING.monthly;

  const handlePress = () => {
    haptics.selection();
    onSelect(plan);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${PLAN_TITLES[plan]}, ${option.priceLabel} ${option.periodLabel}`}
      style={[styles.card, selected && styles.cardSelected]}
    >
      {isYearly && (
        <View style={styles.bestValueBadge}>
          <Text style={styles.bestValueText}>הכי משתלם</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={[styles.title, selected && styles.titleSelected]}>{PLAN_TITLES[plan]}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.price, selected && styles.titleSelected]}>{option.priceLabel}</Text>
            <Text style={styles.period}>{option.periodLabel}</Text>
          </View>
          {isYearly && (
            <>
              <Text style={styles.equivalent}>{`שווה ל-${PRICING.yearly.monthlyEquivalentLabel} לחודש`}</Text>
              <Text style={styles.savings}>{`חוסכים ${PRICING.yearly.savingsLabel} בשנה (${PRICING.yearly.savingsPercentLabel})`}</Text>
            </>
          )}
          <View style={styles.trialTag}>
            <Text style={styles.trialTagText}>{TRIAL_LENGTH_DAYS} ימים בחינם</Text>
          </View>
        </View>
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean, typography: Typography) {
  return StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  // `accentLight` is a fixed near-white tone in both themes (see colors.ts)
  // — fine for a small decorative badge, but a whole selected card filled
  // with it reads as a blown-out white flash against the dark background.
  // In dark mode, use a low-opacity tint of `primary` instead.
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: isDark ? `${colors.primary}33` : colors.accentLight,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.background,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-end',
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  // In light mode `cardSelected`'s background stays fixed-light, so pin to
  // the light-mode value there. In dark mode `cardSelected` is now a dark
  // tint, so the reactive `textPrimary` (light text) works against it.
  titleSelected: {
    color: isDark ? colors.textPrimary : lightColors.primary,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  price: {
    ...typography.heading,
    fontSize: 22,
  },
  period: {
    ...typography.bodySecondary,
  },
  equivalent: {
    ...typography.caption,
  },
  savings: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '700',
  },
  trialTag: {
    marginTop: 4,
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
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  });
}

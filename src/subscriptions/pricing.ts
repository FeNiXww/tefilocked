import { TRIAL_LENGTH_DAYS } from './trialConfig';

// Fixed prices used for the paywall's display copy — the actual charge comes
// from whatever price is configured on the RevenueCat/store-side product
// (org.tefillok.app.premium.monthly / .yearly), not from these constants.
// Keep these in sync with the store listing so the copy the user sees before
// paying matches what they're actually charged.
export const PRICING = {
  monthly: {
    plan: 'monthly' as const,
    price: 9.9,
    priceLabel: '₪9.90',
    periodLabel: 'לחודש',
  },
  yearly: {
    plan: 'yearly' as const,
    // Scaled from the original 99.90 by the same ratio as the monthly price
    // (9.90 / 14.90), so the yearly plan keeps the same relative discount.
    price: 66.38,
    priceLabel: '₪66.38',
    periodLabel: 'לשנה',
    // 66.38 / 12, rounded to the agorot the store would actually charge.
    monthlyEquivalentLabel: '₪5.53',
    // (9.90 × 12) − 66.38 = 52.42, ≈44% of the monthly-equivalent annual cost.
    savingsLabel: '₪52.42',
    savingsPercentLabel: '44%',
  },
} as const;

export type SubscriptionPlan = keyof typeof PRICING;

export function billingSummary(plan: SubscriptionPlan): string {
  const option = PRICING[plan];
  return `${TRIAL_LENGTH_DAYS} ימים בחינם. לאחר מכן ${option.priceLabel} ${option.periodLabel}.`;
}

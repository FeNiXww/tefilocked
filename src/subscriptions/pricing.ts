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
    // ~30% off the monthly-equivalent annual cost (9.90 × 12 = 118.80):
    // 118.80 × 0.70 = 83.16, rounded to ₪83.00 — the nearest price ending
    // both App Store Connect and Google Play actually allow for ILS, and
    // the exact figure both stores are configured to charge.
    price: 83.0,
    priceLabel: '₪83.00',
    periodLabel: 'לשנה',
    // 83.00 / 12, rounded to the agorot the store would actually charge.
    monthlyEquivalentLabel: '₪6.92',
    // (9.90 × 12) − 83.00 = 35.80, ~30% of the monthly-equivalent annual cost.
    savingsLabel: '₪35.80',
    savingsPercentLabel: '30%',
  },
} as const;

export type SubscriptionPlan = keyof typeof PRICING;

export function billingSummary(plan: SubscriptionPlan): string {
  const option = PRICING[plan];
  return `${TRIAL_LENGTH_DAYS} ימים בחינם. לאחר מכן ${option.priceLabel} ${option.periodLabel}.`;
}

// The Google Play "offer" id configured on the yearly base plan (Play
// Console → Subscriptions → yearly → Offers), scoped to new subscribers who
// have never had this subscription before. Used by revenueCatConfig.ts to
// find the matching SubscriptionOption on Android so the exit-offer screen's
// purchase actually requests this offer instead of the base plan's default
// price.
export const EXIT_OFFER_ANDROID_OFFER_ID = 'exit-offer-55';

// The App Store Connect Promotional Offer identifier configured on the
// Yearly subscription (Subscriptions → Yearly → Subscription Pricing →
// Promotional Offers → "Exit Offer 55"). Used by revenueCatConfig.ts to find
// the matching discount on the iOS package and request it (signed via
// RevenueCat's already-configured in-app-purchase key) instead of the
// regular price.
export const EXIT_OFFER_IOS_DISCOUNT_ID = 'exit_offer_55';

// The exit-offer's price — genuinely configured in both stores as ₪53.50
// for the first year (Google Play: 35.57% off the current ₪83.00 base;
// App Store Connect: a Promotional Offer at this exact price). Those
// percentages/mechanisms are implementation details chosen to land on this
// same price on both platforms; the *marketing* framing stays "55% off",
// matching 55% off the theoretical monthly-derived annual cost
// (9.90 × 12 = 118.80 → × 0.45 = 53.46 ≈ this real ₪53.50).
export const EXIT_OFFER_YEARLY = {
  plan: 'yearly' as const,
  price: 53.5,
  priceLabel: '₪53.50',
  periodLabel: 'לשנה',
  // 53.50 / 12, rounded to the agorot the store would actually charge.
  monthlyEquivalentLabel: '₪4.46',
  // (9.90 × 12) − 53.50 = 65.30, ~55% of the monthly-equivalent annual cost.
  savingsLabel: '₪65.30',
  savingsPercentLabel: '55%',
} as const;

/**
 * Same as billingSummary, but quoting the exit offer's discounted yearly
 * price instead of the regular one — and, since the discount is one-time
 * (see the "הנחה חד-פעמית" badge on PaywallExitOfferScreen), spelling out
 * that it only covers the first year and renews at the regular yearly price
 * after that, rather than implying the discounted price recurs forever.
 */
export function exitOfferBillingSummary(): string {
  return `${TRIAL_LENGTH_DAYS} ימים בחינם. לאחר מכן ${EXIT_OFFER_YEARLY.priceLabel} לשנה הראשונה, ולאחר מכן ${PRICING.yearly.priceLabel} לשנה.`;
}

import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { storage, StorageKeys } from '../data/storage/mmkv';
import { EXIT_OFFER_ANDROID_OFFER_ID, EXIT_OFFER_IOS_DISCOUNT_ID } from './pricing';

// Get these from the RevenueCat dashboard once the project is created there
// (Project settings -> API keys). Separate keys per platform.
const REVENUECAT_API_KEYS = {
  ios: 'appl_SCfBEZpsxfOPpLDdQiYqUSlzmTF',
  android: 'goog_FerVquisyruWzCGINGmeoQMIioB',
};

// Configure this entitlement identifier to match the one product tier in
// the RevenueCat dashboard — there's no free tier, so "active" is the only
// meaningful state besides "no entitlement".
export const PREMIUM_ENTITLEMENT_ID = 'premium_access';

let configured = false;
// Falls back gracefully when the native Purchases module isn't linked (Expo
// Go) — a real dev/production build always has it and this stays true.
let nativeAvailable = true;

export function configureRevenueCat(): void {
  if (configured) return;
  configured = true;
  const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
  if (apiKey.startsWith('REPLACE_WITH_')) {
    // Dashboard project/keys don't exist yet — configuring with this placeholder
    // doesn't fail, it just makes every later SDK call (offerings, customer info,
    // entitlement sync) reject and log via the native SDK's own console.error,
    // which LogBox surfaces as an on-screen redbox in dev builds. Skip
    // configuring entirely and use the same mocked fallback as Expo Go until
    // real keys are set.
    nativeAvailable = false;
    console.warn('[tefillok] RevenueCat API key not set — subscription features are mocked.');
    return;
  }
  try {
    Purchases.configure({ apiKey });
  } catch {
    nativeAvailable = false;
    console.warn('[tefillok] RevenueCat unavailable (Expo Go?) — subscription features are mocked.');
  }
}

function cacheEntitlementState(customerInfo: CustomerInfo): boolean {
  const active = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== undefined;
  storage.set(StorageKeys.entitlementActive, active);
  return active;
}

/** Checks RevenueCat, falling back to the last-cached MMKV value if offline or unavailable. */
export async function hasPremiumEntitlement(): Promise<boolean> {
  if (!nativeAvailable) return storage.getBoolean(StorageKeys.entitlementActive) ?? false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return cacheEntitlementState(customerInfo);
  } catch {
    return storage.getBoolean(StorageKeys.entitlementActive) ?? false;
  }
}

export async function getOfferings() {
  if (!nativeAvailable) throw new Error('RevenueCat unavailable');
  return Purchases.getOfferings();
}

export async function purchasePackage(pkg: Parameters<typeof Purchases.purchasePackage>[0]) {
  if (!nativeAvailable) throw new Error('RevenueCat unavailable');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return cacheEntitlementState(customerInfo);
}

/**
 * Purchases `pkg` for the exit-offer screen's discounted price when the
 * current user is genuinely eligible for it on their platform, falling back
 * to the package's regular price otherwise — so the caller never needs its
 * own platform branching, and never risks charging a price the UI didn't
 * show.
 *
 * Android: a real Google Play "offer" on the yearly base plan
 * (EXIT_OFFER_ANDROID_OFFER_ID, see pricing.ts) — Play only includes it in
 * `subscriptionOptions` when the signed-in account actually qualifies (see
 * the offer's eligibility rule in Play Console), so no separate eligibility
 * check is needed here.
 *
 * iOS: a real App Store Connect Promotional Offer
 * (EXIT_OFFER_IOS_DISCOUNT_ID) — signed on RevenueCat's servers via the
 * in-app-purchase key already configured for this app in the RevenueCat
 * dashboard (Apps → iOS app → In-app purchase key configuration).
 * `getPromotionalOffer` both signs the request and checks eligibility
 * (Apple only allows a subscriber to redeem a given promotional offer once),
 * returning undefined for ineligible users.
 */
export async function purchasePlanForExitOffer(pkg: PurchasesPackage): Promise<boolean> {
  if (!nativeAvailable) throw new Error('RevenueCat unavailable');

  if (Platform.OS === 'android') {
    const option = pkg.product.subscriptionOptions?.find((o) => o.id.endsWith(`:${EXIT_OFFER_ANDROID_OFFER_ID}`));
    if (option) {
      const { customerInfo } = await Purchases.purchaseSubscriptionOption(option);
      return cacheEntitlementState(customerInfo);
    }
  } else if (Platform.OS === 'ios') {
    const discount = pkg.product.discounts?.find((d) => d.identifier === EXIT_OFFER_IOS_DISCOUNT_ID);
    if (discount) {
      const promotionalOffer = await Purchases.getPromotionalOffer(pkg.product, discount);
      if (promotionalOffer) {
        const { customerInfo } = await Purchases.purchaseDiscountedPackage(pkg, promotionalOffer);
        return cacheEntitlementState(customerInfo);
      }
    }
  }

  return purchasePackage(pkg);
}

export async function restorePurchases(): Promise<boolean> {
  if (!nativeAvailable) return storage.getBoolean(StorageKeys.entitlementActive) ?? false;
  const customerInfo = await Purchases.restorePurchases();
  return cacheEntitlementState(customerInfo);
}

/**
 * Live entitlement updates (e.g. a trial lapsing mid-session) instead of only
 * re-checking on next cold start. Returns an unsubscribe function.
 */
export function subscribeToEntitlementChanges(onChange: (active: boolean) => void): () => void {
  if (!nativeAvailable) return () => {};
  const listener = (customerInfo: CustomerInfo) => onChange(cacheEntitlementState(customerInfo));
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { storage, StorageKeys } from '../data/storage/mmkv';

// Get these from the RevenueCat dashboard once the project is created there
// (Project settings -> API keys). Separate keys per platform.
const REVENUECAT_API_KEYS = {
  ios: 'REPLACE_WITH_REVENUECAT_IOS_KEY',
  android: 'REPLACE_WITH_REVENUECAT_ANDROID_KEY',
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
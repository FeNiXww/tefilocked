/**
 * The pure decision behind subscriptionState.ts's hasAppAccess()/
 * getSubscriptionStatus() — extracted the same way paywallExitOffer.ts
 * extracts its own back-button branching, so this can be unit-tested
 * without an mmkv/react-native dependency (see vitest.config.mts).
 */

/**
 * Conceptual states the rest of the app can gate on. Only TRIAL_ACTIVE is
 * ever written directly (by startTrial in subscriptionState.ts) — the rest
 * are derived from timestamps/entitlement so they stay correct without
 * anything having to "tick" a status field over time.
 *
 * SUBSCRIBED means "RevenueCat/Play Billing reported an active entitlement"
 * (see revenueCatConfig.ts's cacheEntitlementState, set on purchase, restore,
 * and any live entitlement-change callback).
 */
export type SubscriptionStatus = 'NO_SUBSCRIPTION' | 'TRIAL_ACTIVE' | 'TRIAL_ENDING' | 'SUBSCRIBED' | 'TRIAL_EXPIRED';

export function computeSubscriptionStatus(params: {
  entitlementActive: boolean;
  trialEndsAt: number | null;
  now: number;
  reminderLeadMs: number;
}): SubscriptionStatus {
  if (params.entitlementActive) return 'SUBSCRIBED';
  if (params.trialEndsAt === null) return 'NO_SUBSCRIPTION';
  if (params.now >= params.trialEndsAt) return 'TRIAL_EXPIRED';
  if (params.trialEndsAt - params.now <= params.reminderLeadMs) return 'TRIAL_ENDING';
  return 'TRIAL_ACTIVE';
}

/**
 * True for an active/ending trial or a confirmed subscription, false once
 * the trial has lapsed without converting. Deliberately does NOT treat "a
 * trial was ever started" as permanent access — see subscriptionState.ts's
 * hasAppAccess() doc comment for why that used to be a real bug (free
 * access forever after one trial, never revoked), and for why the caller
 * must keep `entitlementActive` fresh via RevenueCat for this to stay
 * correct for converted subscribers once their local trial mirror expires.
 */
export function computeHasAppAccess(status: SubscriptionStatus): boolean {
  return status === 'TRIAL_ACTIVE' || status === 'TRIAL_ENDING' || status === 'SUBSCRIBED';
}

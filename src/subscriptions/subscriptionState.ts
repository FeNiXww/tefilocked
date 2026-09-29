import { storage, StorageKeys } from '../data/storage/mmkv';
import { computeHasAppAccess, computeSubscriptionStatus, type SubscriptionStatus } from './subscriptionAccess';
import { TRIAL_DURATION_MS, TRIAL_REMINDER_LEAD_MS } from './trialConfig';
import type { SubscriptionPlan } from './pricing';

export type { SubscriptionPlan, SubscriptionStatus };

function readTimestamp(key: string): number | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function getSelectedPlan(): SubscriptionPlan | null {
  const raw = storage.getString(StorageKeys.trialPlan);
  return raw === 'monthly' || raw === 'yearly' ? raw : null;
}

export function getTrialStartedAt(): number | null {
  return readTimestamp(StorageKeys.trialStartedAt);
}

export function getTrialEndsAt(): number | null {
  return readTimestamp(StorageKeys.trialEndsAt);
}

export function isTrialReminderScheduled(): boolean {
  return storage.getBoolean(StorageKeys.trialReminderScheduled) ?? false;
}

export function markTrialReminderScheduled(): void {
  storage.set(StorageKeys.trialReminderScheduled, true);
}

/**
 * Records the plan the user picked and starts the local trial clock — see
 * trialConfig.ts's TRIAL_LENGTH_DAYS for the length. Called from the paywall
 * CTA right after a real RevenueCat purchase succeeds; the store's own
 * introductory offer is what actually governs billing, this just gives the
 * rest of the app (trial countdown copy, the "ending soon" reminder) a local
 * timestamp to read.
 */
export function startTrial(plan: SubscriptionPlan): void {
  const now = Date.now();
  storage.set(StorageKeys.trialPlan, plan);
  storage.set(StorageKeys.trialStartedAt, String(now));
  storage.set(StorageKeys.trialEndsAt, String(now + TRIAL_DURATION_MS));
  storage.set(StorageKeys.trialReminderScheduled, false);
}

export function getSubscriptionStatus(): SubscriptionStatus {
  return computeSubscriptionStatus({
    entitlementActive: storage.getBoolean(StorageKeys.entitlementActive) ?? false,
    trialEndsAt: getTrialEndsAt(),
    now: Date.now(),
    reminderLeadMs: TRIAL_REMINDER_LEAD_MS,
  });
}

/**
 * Gate App.tsx uses to decide Paywall vs. Home. See subscriptionAccess.ts's
 * computeHasAppAccess for the actual logic (and its test coverage) —
 * `getSubscriptionStatus()`'s SUBSCRIBED check depends on the locally cached
 * `entitlementActive` flag, which is only as fresh as the last RevenueCat
 * call (purchase, restore, or a live entitlement-change event). See App.tsx's
 * mount/foreground reconciliation, which calls hasPremiumEntitlement() before
 * trusting this, so a converted subscriber whose local TRIAL_DURATION_MS
 * mirror has expired isn't locked out before that cache catches up.
 */
export function hasAppAccess(): boolean {
  return computeHasAppAccess(getSubscriptionStatus());
}

/**
 * Wipes every trial/entitlement flag, so `hasAppAccess()` goes back to false
 * and the paywall is reachable again. Dev-only: without this, "reset
 * onboarding" (see dev/devReset.ts) only cleared the onboarding-complete
 * flag — once a test trial had ever been started on a device, every
 * subsequent onboarding run would skip straight past the paywall into the
 * app, since hasAppAccess() stays true forever once a trial has started.
 * Never called from production code paths.
 */
export function resetSubscriptionStateForTesting(): void {
  storage.set(StorageKeys.trialPlan, '');
  storage.set(StorageKeys.trialStartedAt, '');
  storage.set(StorageKeys.trialEndsAt, '');
  storage.set(StorageKeys.trialReminderScheduled, false);
  storage.set(StorageKeys.entitlementActive, false);
}

/**
 * The inverse of resetSubscriptionStateForTesting: flips hasAppAccess() to
 * true without going through a real RevenueCat purchase, so a dev build can
 * jump straight from onboarding into the app past the paywall. Sets
 * entitlementActive directly (rather than startTrial) so it persists across
 * reloads without depending on TRIAL_DURATION_MS ever expiring. Never called
 * from production code paths.
 */
export function grantAppAccessForTesting(): void {
  storage.set(StorageKeys.entitlementActive, true);
}

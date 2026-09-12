import { createMMKV } from 'react-native-mmkv';
import { ALL_CONTENT_TYPES } from '../../content/types';
import type { ContentType } from '../../content/types';

interface MinimalStorage {
  set(key: string, value: boolean | string | number): void;
  getString(key: string): string | undefined;
  getBoolean(key: string): boolean | undefined;
}

function createInMemoryStorage(): MinimalStorage {
  const map = new Map<string, boolean | string | number>();
  return {
    set: (key, value) => void map.set(key, value),
    getString: (key) => (typeof map.get(key) === 'string' ? (map.get(key) as string) : undefined),
    getBoolean: (key) => (typeof map.get(key) === 'boolean' ? (map.get(key) as boolean) : undefined),
  };
}

// Single MMKV instance for everything that needs fast synchronous
// key-value reads: settings, questionnaire answers, locked-app list,
// entitlement cache, and the recently-shown-content ring buffers
// (src/content/index.ts). Higher-volume time-series data (mood/unlock
// history, streaks) lives in expo-sqlite instead — see db.ts.
//
// Falls back to an in-memory store when the native MMKV module isn't linked
// (Expo Go) so the app is still previewable there — a real dev/production
// build always has the native module and never touches this fallback.
export const storage: MinimalStorage = (() => {
  try {
    return createMMKV({ id: 'tefillok' });
  } catch {
    console.warn('[tefillok] MMKV unavailable (Expo Go?) — using in-memory storage fallback.');
    return createInMemoryStorage();
  }
})();

export const StorageKeys = {
  onboardingComplete: 'onboarding.complete',
  questionnaireAnswers: 'onboarding.questionnaireAnswers',
  onboardingName: 'onboarding.name',
  onboardingGender: 'onboarding.gender',
  onboardingFullAnswers: 'onboarding.fullAnswers',
  preferredContentTypes: 'preferences.contentTypes',
  lockedAppPackages: 'locking.androidPackages',
  lockedAppSelectionData: 'locking.iosSelectionData',
  pendingLockedApp: 'locking.pendingTarget',
  entitlementActive: 'subscription.entitlementActive',
  calendarIntegrationEnabled: 'preferences.calendarIntegrationEnabled',
  trialPlan: 'subscription.trialPlan',
  trialStartedAt: 'subscription.trialStartedAt',
  trialEndsAt: 'subscription.trialEndsAt',
  trialReminderScheduled: 'subscription.trialReminderScheduled',
  reviewPrompted: 'preferences.reviewPrompted',
  lastKnownStreak: 'streak.lastKnown',
  pendingHanukkiahCompletionCelebration: 'streak.pendingHanukkiahCompletionCelebration',
  zmanimLocation: 'zmanim.location',
  zmanimLocationDenied: 'zmanim.locationDenied',
  userNusach: 'preferences.nusach',
  themeMode: 'preferences.themeMode',
  paywallExitOfferSeen: 'paywall.exitOfferSeen',
  streakProtectionEnabled: 'streak.protectShabbatHolidays',
} as const;

export type StoredGender = 'man' | 'woman';
export type StoredThemeMode = 'light' | 'dark' | 'system';

export function getStoredThemeMode(): StoredThemeMode {
  const raw = storage.getString(StorageKeys.themeMode);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function setStoredThemeMode(mode: StoredThemeMode): void {
  storage.set(StorageKeys.themeMode, mode);
}

export function isOnboardingComplete(): boolean {
  return storage.getBoolean(StorageKeys.onboardingComplete) ?? false;
}

export function setOnboardingComplete(complete: boolean): void {
  storage.set(StorageKeys.onboardingComplete, complete);
}

/** Whether the one-time paywall exit offer (see Paywall/PaywallExitOfferScreen.tsx) has already been shown on this install — backing out of the pricing screen a second time exits normally instead of showing it again. */
export function hasSeenPaywallExitOffer(): boolean {
  return storage.getBoolean(StorageKeys.paywallExitOfferSeen) ?? false;
}

export function markPaywallExitOfferSeen(): void {
  storage.set(StorageKeys.paywallExitOfferSeen, true);
}

export function isReviewPrompted(): boolean {
  return storage.getBoolean(StorageKeys.reviewPrompted) ?? false;
}

export function markReviewPrompted(): void {
  storage.set(StorageKeys.reviewPrompted, true);
}

/**
 * The last streak count Home actually displayed, persisted across app
 * restarts/backgrounding — the Home screen compares this against a freshly
 * computed `getCurrentStreak()` on every focus to detect a real streak break
 * (a positive last-known value that just dropped to zero) so it can play the
 * חנוכייה "goes dark" cinematic instead of silently resetting the row.
 */
export function getLastKnownStreak(): number {
  return Number(storage.getString(StorageKeys.lastKnownStreak) ?? '0');
}

export function setLastKnownStreak(streak: number): void {
  storage.set(StorageKeys.lastKnownStreak, String(streak));
}

/**
 * A חנוכייה-just-became-fully-lit event that hasn't been shown to the user
 * yet — set atomically by db.ts's `recordUnlockEvent` at the exact moment
 * that transition happens (not derived from "is the חנוכייה currently
 * complete", which would replay on every app open). Most completions happen
 * while the user is mid-way through an app-lock interception (see
 * App.tsx/LockContentFlow) with nowhere to present a celebration screen, so
 * this survives background/force-close/process death until whichever
 * Tefillok screen next checks it — see Home's tryShowPendingCelebration —
 * can actually show it and clear it.
 */
export function isPendingHanukkiahCompletionCelebration(): boolean {
  return storage.getBoolean(StorageKeys.pendingHanukkiahCompletionCelebration) ?? false;
}

export function setPendingHanukkiahCompletionCelebration(pending: boolean): void {
  storage.set(StorageKeys.pendingHanukkiahCompletionCelebration, pending);
}

export function getPreferredContentTypes(): ContentType[] {
  const raw = storage.getString(StorageKeys.preferredContentTypes);
  if (!raw) return ALL_CONTENT_TYPES;
  try {
    return JSON.parse(raw) as ContentType[];
  } catch {
    console.warn('[tefillok] Corrupted preferredContentTypes in storage — falling back to all content types.');
    return ALL_CONTENT_TYPES;
  }
}

export function setPreferredContentTypes(types: ContentType[]): void {
  storage.set(StorageKeys.preferredContentTypes, JSON.stringify(types));
  storage.set(StorageKeys.questionnaireAnswers, JSON.stringify({ selectedContentTypes: types }));
}

export function getOnboardingName(): string {
  return storage.getString(StorageKeys.onboardingName) ?? '';
}

export function setOnboardingName(name: string): void {
  storage.set(StorageKeys.onboardingName, name);
}

/**
 * Dedicated gender accessor (independent of the full-answers blob below) so
 * screens outside the onboarding flow — the Settings gender editor, the
 * prayer mood picker — can read/write it without touching the rest of the
 * onboarding answers. Falls back to the full-answers blob for users who
 * onboarded before this dedicated key existed.
 */
export function getOnboardingGender(): StoredGender | null {
  const stored = storage.getString(StorageKeys.onboardingGender);
  if (stored === 'man' || stored === 'woman') return stored;
  return getOnboardingFullAnswers<{ gender: StoredGender | null }>()?.gender ?? null;
}

export function setOnboardingGender(gender: StoredGender): void {
  storage.set(StorageKeys.onboardingGender, gender);
}

/** Persists the whole in-progress/completed onboarding answers object as one JSON blob — read back by `useOnboardingState` to resume/derive downstream copy. */
export function setOnboardingFullAnswers(answers: unknown): void {
  storage.set(StorageKeys.onboardingFullAnswers, JSON.stringify(answers));
}

export function getOnboardingFullAnswers<T>(): T | null {
  const raw = storage.getString(StorageKeys.onboardingFullAnswers);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('[tefillok] Corrupted onboardingFullAnswers in storage — ignoring.');
    return null;
  }
}

export interface PendingLockedApp {
  packageName: string;
  timestamp: number;
}

// How long a captured interception target stays valid for resuming. Bounds
// the blast radius of resuming a flow the user has long since walked away
// from (e.g. reopening the app days later) while still surviving a realistic
// "backgrounded mid-prayer, process reclaimed, user comes back" gap.
const PENDING_LOCKED_APP_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Durable record of which app the current lock interception is for. React
 * state alone (the LockContentFlow prop chain) doesn't survive the host
 * process being killed while backgrounded mid-prayer — this is the fallback
 * App.tsx reads on startup to resume the same interception instead of
 * dropping the user on the normal Home screen. Cleared once the flow
 * actually finishes (see useLockContentFlow's finishAndUnlock).
 */
export function setPendingLockedApp(packageName: string): void {
  storage.set(StorageKeys.pendingLockedApp, JSON.stringify({ packageName, timestamp: Date.now() } satisfies PendingLockedApp));
}

export function getPendingLockedApp(): PendingLockedApp | null {
  const raw = storage.getString(StorageKeys.pendingLockedApp);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingLockedApp;
    if (Date.now() - parsed.timestamp > PENDING_LOCKED_APP_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    console.warn('[tefillok] Corrupted pendingLockedApp in storage — ignoring.');
    return null;
  }
}

export function clearPendingLockedApp(): void {
  storage.set(StorageKeys.pendingLockedApp, '');
}

export interface StoredZmanimLocation {
  latitude: number;
  longitude: number;
  /** Meters above sea level, when the device fix included it — 0 (sea level) is the honest default otherwise, not a guess. */
  elevation: number;
  timestamp: number;
}

/**
 * A one-time-fetched, cached coordinate for zmanim calculation — see
 * src/native/location.ts, which is the only place that writes this. A home
 * location doesn't meaningfully change minute-to-minute, so this is reused
 * across app opens rather than re-requesting GPS every time.
 */
export function getStoredZmanimLocation(): StoredZmanimLocation | null {
  const raw = storage.getString(StorageKeys.zmanimLocation);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredZmanimLocation;
  } catch {
    console.warn('[tefillok] Corrupted zmanimLocation in storage — ignoring.');
    return null;
  }
}

export function setStoredZmanimLocation(location: StoredZmanimLocation): void {
  storage.set(StorageKeys.zmanimLocation, JSON.stringify(location));
}

/** Set once the user has declined the zmanim location prompt, so the app doesn't re-prompt every time a time-sensitive item is opened — only a deliberate re-ask (e.g. from Settings) should clear this. */
export function isZmanimLocationDenied(): boolean {
  return storage.getBoolean(StorageKeys.zmanimLocationDenied) ?? false;
}

export function setZmanimLocationDenied(denied: boolean): void {
  storage.set(StorageKeys.zmanimLocationDenied, denied);
}

export type UserNusach = 'ashkenaz' | 'sefard' | 'edot_hamizrach' | 'unknown';

/**
 * Defaults to `'unknown'` — the app has never asked, and per the nusach UX
 * decision (src/content/research/nusach-ux-decision.md) should not infer
 * this from weak signals or force a choice during onboarding without a real
 * product reason. Present only as a future explicit Settings choice.
 */
export function getUserNusach(): UserNusach {
  const stored = storage.getString(StorageKeys.userNusach);
  if (stored === 'ashkenaz' || stored === 'sefard' || stored === 'edot_hamizrach') return stored;
  return 'unknown';
}

export function setUserNusach(nusach: UserNusach): void {
  storage.set(StorageKeys.userNusach, nusach);
}


/**
 * Defaults to `true` — a missed prayer on Shabbat/Yom Tov (when phone use is
 * halachically restricted) shouldn't read as a broken streak, so this
 * protection is on unless the user explicitly turns it off in Settings. See
 * `getCurrentStreak` in db.ts, the only place that reads this.
 */
export function isStreakProtectionEnabled(): boolean {
  return storage.getBoolean(StorageKeys.streakProtectionEnabled) ?? true;
}

export function setStreakProtectionEnabled(enabled: boolean): void {
  storage.set(StorageKeys.streakProtectionEnabled, enabled);
}

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
  entitlementActive: 'subscription.entitlementActive',
  calendarIntegrationEnabled: 'preferences.calendarIntegrationEnabled',
} as const;

export type StoredGender = 'man' | 'woman';

export function isOnboardingComplete(): boolean {
  return storage.getBoolean(StorageKeys.onboardingComplete) ?? false;
}

export function setOnboardingComplete(complete: boolean): void {
  storage.set(StorageKeys.onboardingComplete, complete);
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

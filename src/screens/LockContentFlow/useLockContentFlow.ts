import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { pickContentForMood, pickPrayer } from '../../content';
import type { ContentItem, ContentType, Mood } from '../../content/types';
import { getCurrentStreak, recordUnlockEvent } from '../../data/storage/db';
import { grantTemporaryUnlock, unlockAndLaunchAndroidApp } from '../../native/appLocking';

// The daily "prayer to unlock" ritual: connection check-in -> mood check-in
// -> a curated personal prayer -> "I've prayed today" -> pick how long the
// next unlock lasts -> a completion screen with the updated streak and the
// verse of the day -> the actual unlock.
export type LockContentFlowStep = 'connection' | 'mood' | 'prayer' | 'duration' | 'completion' | 'unlocked';

const DEFAULT_UNLOCK_MINUTES = 15;

export interface LockContentFlowState {
  step: LockContentFlowStep;
  connectionRating: number | null;
  selectedMood: Mood | null;
  prayerItem: ContentItem | null;
  prayerLoading: boolean;
  verseItem: ContentItem | null;
  streak: number;
}

export interface UseLockContentFlowOptions {
  preferredContentTypes: ContentType[];
  lockedAppPackage?: string;
  onUnlocked?: () => void;
}

export function useLockContentFlow({ preferredContentTypes, lockedAppPackage, onUnlocked }: UseLockContentFlowOptions) {
  const [state, setState] = useState<LockContentFlowState>({
    step: 'connection',
    connectionRating: null,
    selectedMood: null,
    prayerItem: null,
    prayerLoading: false,
    verseItem: null,
    streak: 0,
  });

  // The chosen unlock duration only needs to survive from `selectDuration`
  // to `finishAndUnlock` a moment later — a ref avoids threading it through
  // state (and the type churn of an extra field nothing else reads).
  const pendingUnlockMinutesRef = useRef<number>(DEFAULT_UNLOCK_MINUTES);

  const submitConnection = useCallback((rating: number) => {
    setState((prev) => ({ ...prev, step: 'mood', connectionRating: rating }));
  }, []);

  const selectMood = useCallback(
    (mood: Mood) => {
      const prayerItem = pickContentForMood(mood, preferredContentTypes);
      setState((prev) => ({ ...prev, step: 'prayer', selectedMood: mood, prayerItem, prayerLoading: false }));
    },
    [preferredContentTypes]
  );

  const confirmPrayed = useCallback(() => {
    setState((prev) => ({ ...prev, step: 'duration' }));
  }, []);

  const selectDuration = useCallback(
    (minutes: number) => {
      pendingUnlockMinutesRef.current = minutes;
      setState((prev) => {
        if (prev.selectedMood && prev.prayerItem && prev.connectionRating != null) {
          recordUnlockEvent({
            occurredAt: new Date(),
            mood: prev.selectedMood,
            connectionRating: prev.connectionRating,
            contentId: prev.prayerItem.id,
            lockedAppPackage,
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
          });
        }
        return {
          ...prev,
          step: 'completion',
          streak: getCurrentStreak(),
          verseItem: pickPrayer(prev.prayerItem?.id),
        };
      });
    },
    [lockedAppPackage]
  );

  const finishAndUnlock = useCallback(async () => {
    // Both platforms unlock every blocked app for the chosen duration, then
    // re-lock together. Android additionally foregrounds the specific app
    // that triggered the lock directly, since there's no OS-level "just
    // opened" signal to rely on the way iOS's shield removal has.
    const minutes = pendingUnlockMinutesRef.current;
    if (Platform.OS === 'android') {
      unlockAndLaunchAndroidApp(lockedAppPackage, minutes);
    } else {
      await grantTemporaryUnlock(minutes);
    }

    setState((prev) => ({ ...prev, step: 'unlocked' }));
    onUnlocked?.();
  }, [lockedAppPackage, onUnlocked]);

  return { state, submitConnection, selectMood, confirmPrayed, selectDuration, finishAndUnlock };
}

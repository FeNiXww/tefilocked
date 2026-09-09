import { useCallback, useEffect, useState } from 'react';
import { getRemainingUnlockSeconds, relockNow, setUnlockDuration } from './index';

/**
 * Single shared read/write surface for the temporary-unlock countdown. The
 * native module (TemporaryUnlockController on Android, the shared-defaults
 * budget on iOS) is the actual source of truth and survives app restarts and
 * backgrounding on its own; this hook just polls it and optimistically
 * reflects writes immediately so the UI never waits for the next poll tick.
 * The Home screen's countdown display and its timer editor both consume one
 * instance of this hook so they can never show two different numbers.
 */
export function useUnlockTimer() {
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingUnlockSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingUnlockSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /** Replace the active grant with exactly `minutes` from now — never additive to whatever's left. */
  const applyDuration = useCallback(async (minutes: number) => {
    setRemainingSeconds(Math.round(minutes * 60));
    await setUnlockDuration(minutes);
    setRemainingSeconds(getRemainingUnlockSeconds());
  }, []);

  /** Drop the grace period immediately — the lock system treats this exactly like natural expiry. */
  const reset = useCallback(async () => {
    setRemainingSeconds(0);
    await relockNow();
    setRemainingSeconds(getRemainingUnlockSeconds());
  }, []);

  return { remainingSeconds, applyDuration, reset };
}

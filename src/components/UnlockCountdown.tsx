import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { getRemainingUnlockSeconds } from '../native/appLocking';
import { colors, typography } from '../theme';

function formatRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Blue countdown to the next re-lock, shown while a temporary unlock is active; renders nothing otherwise. */
export function UnlockCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState(() => getRemainingUnlockSeconds());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingUnlockSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (remainingSeconds <= 0) return null;

  return <Text style={styles.text}>האפליקציות ננעלות שוב בעוד {formatRemaining(remainingSeconds)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...typography.bodySecondary,
    color: colors.accentDark,
    fontWeight: '700',
    textAlign: 'center',
  },
});

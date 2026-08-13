import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getPreferredContentTypes } from '../../data/storage/mmkv';
import { getCurrentStreak, getStreakCandles, hasCompletedToday, type StreakCandle } from '../../data/storage/db';
import { scheduleMotivationalMessages, syncDailyReminder } from '../../notifications/streakReminders';
import { LockContentFlow } from '../LockContentFlow';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { MagenDavidStreak } from '../../components/MagenDavidStreak';
import { FlameIcon } from '../../components/FlameIcon';
import { HanukkiahStreakRow } from '../../components/HanukkiahStreakRow';
import { SparkleBackground } from '../../components/SparkleBackground';
import { Logo } from '../../components/Logo';
import { UnlockCountdown } from '../../components/UnlockCountdown';
import { celebrateStreakWidget, syncStreakWidget } from '../../widgets/syncStreakWidget';
import { colors, spacing, typography } from '../../theme';

/** Extra space so the tab bar never covers the חנוכייה pedestal and day labels. */
const TAB_BAR_CLEARANCE = 88;

export function Home() {
  const insets = useSafeAreaInsets();
  const [showingFlow, setShowingFlow] = useState(false);
  const [streak, setStreak] = useState(() => getCurrentStreak());
  const [litToday, setLitToday] = useState(() => hasCompletedToday());
  const [streakCandles, setStreakCandles] = useState<StreakCandle[]>(() => getStreakCandles());

  // Bottom-tab screens stay mounted across tab switches, so a streak change
  // from elsewhere (e.g. a real lock/unlock event while this tab wasn't
  // active) wouldn't otherwise be picked up until an unrelated re-render —
  // refetch every time this tab regains focus, not just after its own CTA.
  // Re-syncing the reminder here too means opening the app after already
  // praying today (e.g. from a stale notification) cancels it immediately.
  useFocusEffect(
    useCallback(() => {
      const nextStreak = getCurrentStreak();
      setStreak(nextStreak);
      const candles = getStreakCandles();
      setStreakCandles(candles);
      const lit = hasCompletedToday();
      setLitToday(lit);
      syncDailyReminder(lit).catch(() => {});
      scheduleMotivationalMessages(lit).catch(() => {});
      syncStreakWidget(nextStreak, lit, candles.map((c) => c.completed));
    }, [])
  );

  const handleUnlocked = useCallback(() => {
    setShowingFlow(false);
    const nextStreak = getCurrentStreak();
    setStreak(nextStreak);
    const candles = getStreakCandles();
    setStreakCandles(candles);
    setLitToday(true);
    syncDailyReminder(true).catch(() => {});
    scheduleMotivationalMessages(true).catch(() => {});
    celebrateStreakWidget(nextStreak, candles.map((c) => c.completed));
  }, []);

  if (showingFlow) {
    return <LockContentFlow preferredContentTypes={getPreferredContentTypes()} onUnlocked={handleUnlocked} />;
  }

  return (
    <View style={styles.container}>
      <SparkleBackground tone="navy" />

      <View style={[styles.header, { top: insets.top + spacing.md }]}>
        <Logo variant="mark" size={30} />
        <Text style={styles.brand}>תפילוק</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xxl + 36, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
      <View style={styles.heroCard}>
        <View style={styles.starRow}>
          <FlameIcon size={30} lit={litToday} tiltDeg={-16} />
          <MagenDavidStreak streak={streak} litToday={litToday} size={128} />
          <FlameIcon size={30} lit={litToday} tiltDeg={16} />
        </View>

        <View style={styles.streakStat}>
          <AnimatedCounter value={streak} style={[styles.streakNumber, litToday && styles.streakNumberLit]} />
          <Text style={[styles.streakLabel, litToday && styles.streakLabelLit]}>ימי רצף</Text>
        </View>

        <Text style={styles.greeting}>{litToday ? 'התפילה של היום נרשמה' : 'מוכן לרגע של תפילה?'}</Text>
        <UnlockCountdown />
      </View>

      <View style={styles.weekCard}>
        <View style={styles.weekHeader}>
          <Text style={styles.weekTitle}>החנוכייה שלך</Text>
          {!litToday && <Text style={styles.hint}>הקש על הנר כדי להתחיל</Text>}
        </View>
        <HanukkiahStreakRow candles={streakCandles} streak={streak} onStartToday={() => setShowingFlow(true)} />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  header: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  brand: {
    ...typography.eyebrow,
    color: colors.primary,
  },
  heroCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  streakStat: {
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  streakNumber: {
    ...typography.title,
    fontSize: 40,
  },
  streakNumberLit: {
    color: colors.accentDark,
  },
  streakLabel: {
    ...typography.bodySecondary,
  },
  streakLabelLit: {
    color: colors.accentDark,
  },
  greeting: {
    ...typography.heading,
    textAlign: 'center',
  },
  weekCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    overflow: 'visible',
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  weekHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekTitle: {
    ...typography.heading,
    fontSize: 16,
  },
  hint: {
    ...typography.caption,
  },
});

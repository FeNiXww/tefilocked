import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getAnalyticsSummary, getCurrentStreak, getUnlockTrend } from '../../data/storage/db';
import type { TrendRange } from '../../data/storage/db';
import { colors, spacing, typography } from '../../theme';
import { LineChart } from './LineChart';
import { MoodBreakdown } from './MoodBreakdown';
import { RangeToggle } from './RangeToggle';
import { StatTile } from './StatTile';

const RANGE_DAYS: Record<TrendRange, number> = { '7D': 7, '30D': 30, '3M': 90, '1Y': 365 };

function formatAvg(value: number | null): string {
  return value == null ? '—' : value.toFixed(1);
}

export function Insights() {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<TrendRange>('30D');
  // Bumped on every focus so the memos below recompute — this tab can stay
  // mounted while an unlock happens elsewhere, so a plain one-time useMemo
  // would show stale numbers until some unrelated re-render.
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((key) => key + 1);
    }, [])
  );

  // Streak stays "always current" — exempt from the range toggle, since it's
  // inherently about consecutive-days-through-today (see architecture plan).
  const streak = useMemo(() => getCurrentStreak(), [refreshKey]);
  const summary = useMemo(() => getAnalyticsSummary(RANGE_DAYS[range]), [range, refreshKey]);
  const trend = useMemo(() => getUnlockTrend(range), [range, refreshKey]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: spacing.xl + insets.top, paddingBottom: spacing.xl + insets.bottom }]}
    >
      <Text style={styles.title}>המסע שלך</Text>

      <View style={styles.tileGrid}>
        <StatTile emoji="🔥" value={String(streak)} label="רצף נוכחי" index={0} />
        <StatTile emoji="🙏" value={String(summary.totalUnlocks)} label="סה״כ תפילות" index={1} />
        <StatTile emoji="😊" value={formatAvg(summary.avgConnection)} label="קשר ממוצע" index={2} />
        <StatTile emoji="🙂" value={formatAvg(summary.avgMood)} label="מצב רוח ממוצע" index={3} />
      </View>

      <RangeToggle value={range} onChange={setRange} />

      <LineChart buckets={trend} />

      <MoodBreakdown byMood={summary.byMood} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    ...typography.title,
  },
  tileGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
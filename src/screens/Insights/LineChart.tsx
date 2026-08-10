import { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';
import type { TrendBucket } from '../../data/storage/db';
import { colors, spacing, typography } from '../../theme';

const VALUE_MIN = 1;
const VALUE_MAX = 5;
const GRID_VALUES = [5, 3, 1];
const CHART_HEIGHT = 176;
// Must comfortably clear the marker halo at the top/bottom of the value
// range — otherwise a point at a perfect 5.0 or 1.0 gets its halo clipped
// by the SVG canvas edge.
const CHART_VERTICAL_PADDING = 20;
const Y_AXIS_WIDTH = 24;
const RIGHT_MARGIN = 8;
const HORIZONTAL_PADDING = spacing.xl * 2 + spacing.lg * 2 + spacing.lg * 2;
// Below this many total real data points, the chart reads as a stray mark
// rather than a trend — show a caption explaining why, instead of leaving
// the viewer to wonder if it's broken.
const SPARSE_DATA_THRESHOLD = 6;

interface LineChartProps {
  buckets: TrendBucket[];
}

interface Point {
  x: number;
  y: number;
  value: number;
}

/**
 * Groups consecutive non-null values into separate point runs instead of one
 * line joining every real value regardless of gap size — with a sparse
 * history (most days having no unlock at all), a single connect-the-dots
 * line across weeks of nulls reads as one bogus diagonal stroke.
 */
function buildSegments(
  buckets: TrendBucket[],
  stepX: number,
  plotX0: number,
  scaleY: (value: number) => number,
  getValue: (bucket: TrendBucket) => number | null
): Point[][] {
  const segments: Point[][] = [];
  let current: Point[] = [];
  buckets.forEach((bucket, index) => {
    const value = getValue(bucket);
    if (value == null) {
      if (current.length > 0) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: plotX0 + index * stepX, y: scaleY(value), value });
  });
  if (current.length > 0) segments.push(current);
  return segments;
}

/** Returns the single most recent real point across all of a series' segments. */
function getLastPoint(segments: Point[][]): Point | null {
  const lastSegment = segments[segments.length - 1];
  return lastSegment ? lastSegment[lastSegment.length - 1] : null;
}

function Series({
  segments,
  color,
  gradientId,
  baselineY,
}: {
  segments: Point[][];
  color: string;
  gradientId: string;
  baselineY: number;
}) {
  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.12} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {segments.map((segment, i) => {
        // A single isolated point has no line to fill under — the area
        // fill only makes sense once there's an actual span to ground.
        if (segment.length < 2) return null;
        const first = segment[0];
        const last = segment[segment.length - 1];
        const fillPoints = [...segment, { x: last.x, y: baselineY }, { x: first.x, y: baselineY }];
        return (
          <Polygon
            key={`fill-${i}`}
            points={fillPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill={`url(#${gradientId})`}
          />
        );
      })}

      {segments.map((segment, i) => (
        <Polyline
          key={`line-${i}`}
          points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* A surface-colored ring lifts each dot off the gridlines/other
          series and gives sparse, isolated points real visual weight
          instead of reading as a stray speck (see dataviz mark spec: a
          2px surface ring, never a border, separates overlapping marks). */}
      {segments.flatMap((segment, si) =>
        segment.map((p, pi) => <Circle key={`ring-${si}-${pi}`} cx={p.x} cy={p.y} r={6.5} fill={colors.surface} />)
      )}
      {segments.flatMap((segment, si) =>
        segment.map((p, pi) => <Circle key={`dot-${si}-${pi}`} cx={p.x} cy={p.y} r={4.5} fill={color} />)
      )}
    </>
  );
}

function formatValue(value: number | null): string {
  return value == null ? '—' : value.toFixed(1);
}

// A long-running user's data eventually fills most of the requested range,
// but a new one's real activity often sits in only the last few days of a
// 30D/3M/1Y window — plotting the full requested range then reads as mostly
// blank canvas with a tiny illegible cluster pinned to the right edge.
// Trimming to the span that actually has data (with one bucket of lead-in
// so the first point doesn't start flush against the axis) keeps the chart
// proportioned to what it's actually showing.
function trimToDataRange(buckets: TrendBucket[]): TrendBucket[] {
  const firstRealIndex = buckets.findIndex((b) => b.avgConnection != null || b.avgMood != null);
  if (firstRealIndex <= 0) return buckets;
  return buckets.slice(Math.max(0, firstRealIndex - 1));
}

export function LineChart({ buckets: allBuckets }: LineChartProps) {
  const buckets = trimToDataRange(allBuckets);
  const width = Dimensions.get('window').width - HORIZONTAL_PADDING;
  const plotX0 = Y_AXIS_WIDTH;
  const plotWidth = Math.max(0, width - plotX0 - RIGHT_MARGIN);
  const stepX = buckets.length > 1 ? plotWidth / (buckets.length - 1) : 0;

  const scaleY = (value: number) =>
    CHART_VERTICAL_PADDING +
    (1 - (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * (CHART_HEIGHT - CHART_VERTICAL_PADDING * 2);

  const hasData = buckets.some((b) => b.unlockCount > 0);
  const labelStride = Math.max(1, Math.ceil(buckets.length / 6));

  const connectionSegments = buildSegments(buckets, stepX, plotX0, scaleY, (b) => b.avgConnection);
  const moodSegments = buildSegments(buckets, stepX, plotX0, scaleY, (b) => b.avgMood);
  const totalRealPoints =
    connectionSegments.reduce((sum, s) => sum + s.length, 0) + moodSegments.reduce((sum, s) => sum + s.length, 0);
  const isSparse = hasData && totalRealPoints < SPARSE_DATA_THRESHOLD;

  // Current-value readouts live in the legend, not as floating labels on the
  // plot — with sparse, clustered data the two series' latest points can sit
  // only a few pixels apart, and nudging label pills apart to avoid overlap
  // just detaches them from their points and reads as noise. The legend has
  // no collision risk regardless of how tight the data gets.
  const connectionLastValue = getLastPoint(connectionSegments)?.value ?? null;
  const moodLastValue = getLastPoint(moodSegments)?.value ?? null;

  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    // Re-plays on every range switch (buckets identity changes), giving each
    // new trend a small "settle in" instead of popping in instantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, reduceMotion]);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 8 }],
  }));

  return (
    <View style={styles.card}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.chartConnection }]} />
          <Text style={styles.legendLabel}>קשר עם ה׳</Text>
          <Text style={[styles.legendValue, { color: colors.chartConnection }]}>{formatValue(connectionLastValue)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.chartMood }]} />
          <Text style={styles.legendLabel}>מצב רוח</Text>
          <Text style={[styles.legendValue, { color: colors.chartMood }]}>{formatValue(moodLastValue)}</Text>
        </View>
      </View>

      {hasData ? (
        <Animated.View style={revealStyle}>
          <Svg width={width} height={CHART_HEIGHT}>
            {GRID_VALUES.map((value) => (
              <Line
                key={value}
                x1={plotX0}
                y1={scaleY(value)}
                x2={width}
                y2={scaleY(value)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            <Series
              segments={connectionSegments}
              color={colors.chartConnection}
              gradientId="chartConnectionFill"
              baselineY={scaleY(VALUE_MIN)}
            />
            <Series
              segments={moodSegments}
              color={colors.chartMood}
              gradientId="chartMoodFill"
              baselineY={scaleY(VALUE_MIN)}
            />
          </Svg>
          <View style={styles.yAxisLabels} pointerEvents="none">
            {GRID_VALUES.map((value) => (
              <Text key={value} style={[styles.yAxisLabel, { top: scaleY(value) - 7 }]}>
                {value}
              </Text>
            ))}
          </View>
        </Animated.View>
      ) : (
        <View style={[styles.emptyState, { height: CHART_HEIGHT }]}>
          <Text style={styles.emptyEmoji}>📈</Text>
          <Text style={styles.emptyText}>עוד אין מספיק נתונים לתקופה הזו</Text>
        </View>
      )}

      <View style={styles.xAxisRow}>
        {buckets.map((bucket, index) =>
          index % labelStride === 0 || index === buckets.length - 1 ? (
            <Text key={index} style={styles.xAxisLabel}>
              {bucket.bucketLabel}
            </Text>
          ) : null
        )}
      </View>

      {isSparse && <Text style={styles.sparseHint}>ככל שתתפלל יותר, כך תראה כאן מגמה מלאה יותר</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    gap: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  legendValue: {
    ...typography.caption,
    fontWeight: '800',
  },
  yAxisLabels: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: Y_AXIS_WIDTH,
    height: CHART_HEIGHT,
  },
  yAxisLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 11,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    ...typography.caption,
    textAlign: 'center',
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: Y_AXIS_WIDTH,
  },
  xAxisLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  sparseHint: {
    ...typography.caption,
    textAlign: 'center',
  },
});

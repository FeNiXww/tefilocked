import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { TrendBucket } from '../../data/storage/db';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

const AnimatedG = Animated.createAnimatedComponent(G);

const VALUE_MIN = 1;
const VALUE_MAX = 5;
const GRID_VALUES = [5, 3, 1];
// +48% over the old 176px — the chart is meant to be the visual centerpiece
// of the screen, not a cramped strip.
const CHART_HEIGHT = 260;
// Must comfortably clear the marker glow (r=13 at its largest) at the top/
// bottom of the value range, or a point at a perfect 5.0/1.0 gets clipped.
const CHART_VERTICAL_PADDING = 28;
const Y_AXIS_WIDTH = 26;
const RIGHT_MARGIN = 16;
const HORIZONTAL_PADDING = spacing.xl * 2 + spacing.lg * 2 + spacing.xl * 2;
// Below this many total real data points, the chart reads as a stray mark
// rather than a trend — show a caption explaining why, instead of leaving
// the viewer to wonder if it's broken.
const SPARSE_DATA_THRESHOLD = 6;
const TOOLTIP_WIDTH = 168;

interface LineChartProps {
  buckets: TrendBucket[];
}

interface Point {
  x: number;
  y: number;
  value: number;
  index: number;
}

/**
 * One flat, ordered list of real points, skipping null buckets but never
 * breaking into separate runs — a multi-day gap in activity is real (the
 * x-axis date labels still show it), but rendering it as two disconnected
 * shapes read as confusing/broken rather than as "one trend with a gap".
 * A single continuous smoothed curve through every real point, however far
 * apart, is the simpler and clearer read.
 */
function buildPoints(
  buckets: TrendBucket[],
  stepX: number,
  plotX0: number,
  scaleY: (value: number) => number,
  getValue: (bucket: TrendBucket) => number | null,
  getOffsetX: (index: number) => number
): Point[] {
  const points: Point[] = [];
  buckets.forEach((bucket, index) => {
    const value = getValue(bucket);
    if (value == null) return;
    points.push({ x: plotX0 + index * stepX + getOffsetX(index), y: scaleY(value), value, index });
  });
  return points;
}

/** Returns the single most recent real point in a series. */
function getLastPoint(points: Point[]): Point | null {
  return points[points.length - 1] ?? null;
}

/** Catmull-Rom-to-Bezier smoothing — turns the harsh connect-the-dots
 * polyline into the soft, continuous curve premium analytics apps use. */
function smoothLinePath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return '';
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

function smoothAreaPath(points: Point[], baselineY: number): string {
  const line = smoothLinePath(points);
  if (!line) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x},${baselineY} L ${first.x},${baselineY} Z`;
}

function Marker({
  x,
  y,
  color,
  delay,
  selected,
  dimmed,
}: {
  x: number;
  y: number;
  color: string;
  delay: number;
  selected: boolean;
  dimmed: boolean;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const animatedProps = useAnimatedProps(() => ({
    opacity: progress.value * (dimmed ? 0.35 : 1),
  }));

  const glowR = selected ? 13 : 10;
  const ringR = selected ? 8 : 6.5;
  const dotR = selected ? 5.5 : 4.5;

  return (
    <AnimatedG animatedProps={animatedProps}>
      <Circle cx={x} cy={y} r={glowR} fill={color} opacity={0.16} />
      <Circle cx={x} cy={y} r={ringR} fill={colors.surface} />
      <Circle cx={x} cy={y} r={dotR} fill={color} />
      {selected && <Circle cx={x} cy={y} r={dotR + 2.5} stroke={color} strokeWidth={1.5} fill="none" />}
    </AnimatedG>
  );
}

function Series({
  points,
  color,
  gradientId,
  baselineY,
  markerDelayBase,
  selectedIndex,
}: {
  points: Point[];
  color: string;
  gradientId: string;
  baselineY: number;
  markerDelayBase: number;
  selectedIndex: number | null;
}) {
  // A single isolated point has no line to fill under or draw — the area
  // fill and stroke only make sense once there's an actual span to ground.
  const hasLine = points.length >= 2;

  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.22} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {hasLine && <Path d={smoothAreaPath(points, baselineY)} fill={`url(#${gradientId})`} />}

      {/* Soft underlay stroke fakes a glow around the line without relying
          on SVG blur filters, which render inconsistently on Android. */}
      {hasLine && (
        <Path
          d={smoothLinePath(points)}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {hasLine && (
        <Path d={smoothLinePath(points)} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      )}

      {points.map((p) => (
        <Marker
          key={`marker-${p.index}`}
          x={p.x}
          y={p.y}
          color={color}
          delay={markerDelayBase + Math.min(p.index, 24) * 18}
          selected={selectedIndex === p.index}
          dimmed={selectedIndex != null && selectedIndex !== p.index}
        />
      ))}
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
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const buckets = trimToDataRange(allBuckets);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [allBuckets]);

  const width = Dimensions.get('window').width - HORIZONTAL_PADDING;
  const plotX0 = Y_AXIS_WIDTH;
  const plotWidth = Math.max(0, width - plotX0 - RIGHT_MARGIN);
  const stepX = buckets.length > 1 ? plotWidth / (buckets.length - 1) : 0;

  const scaleY = (value: number) =>
    CHART_VERTICAL_PADDING +
    (1 - (value - VALUE_MIN) / (VALUE_MAX - VALUE_MIN)) * (CHART_HEIGHT - CHART_VERTICAL_PADDING * 2);

  const hasData = buckets.some((b) => b.unlockCount > 0);
  // Adapts to the actual pixel spacing between points instead of a fixed
  // "every Nth" rule — dense 30D/1Y data thins out, sparse 7D data shows
  // every label, and nothing ever overlaps regardless of range.
  const MIN_LABEL_SPACING_PX = 40;
  const labelStride = stepX > 0 ? Math.max(1, Math.ceil(MIN_LABEL_SPACING_PX / stepX)) : 1;

  // When both series land on nearly the same value at the same bucket (very
  // common with coarse month/week buckets), their markers would sit exactly
  // on top of each other. Nudge each a few px apart so both stay visible —
  // this is the one case the smoothing/spacing/color rework alone can't fix.
  const collisionOffsetAt = (index: number): { mood: number; connection: number } => {
    const bucket = buckets[index];
    if (bucket?.avgMood == null || bucket?.avgConnection == null) return { mood: 0, connection: 0 };
    const collides = Math.abs(scaleY(bucket.avgMood) - scaleY(bucket.avgConnection)) < 7;
    return collides ? { mood: 3, connection: -3 } : { mood: 0, connection: 0 };
  };

  const connectionPoints = buildPoints(
    buckets,
    stepX,
    plotX0,
    scaleY,
    (b) => b.avgConnection,
    (i) => collisionOffsetAt(i).connection
  );
  const moodPoints = buildPoints(
    buckets,
    stepX,
    plotX0,
    scaleY,
    (b) => b.avgMood,
    (i) => collisionOffsetAt(i).mood
  );
  const totalRealPoints = connectionPoints.length + moodPoints.length;
  const isSparse = hasData && totalRealPoints < SPARSE_DATA_THRESHOLD;

  // Current-value readouts live in the legend, not as floating labels on the
  // plot — with sparse, clustered data the two series' latest points can sit
  // only a few pixels apart, and nudging label pills apart to avoid overlap
  // just detaches them from their points and reads as noise. The legend has
  // no collision risk regardless of how tight the data gets.
  const connectionLastValue = getLastPoint(connectionPoints)?.value ?? null;
  const moodLastValue = getLastPoint(moodPoints)?.value ?? null;

  const reduceMotion = useReducedMotion();
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 460, easing: Easing.out(Easing.cubic) });
    // Re-plays on every range switch (buckets identity changes), giving each
    // new trend a small "settle in" instead of popping in instantly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buckets, reduceMotion]);
  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [{ translateY: (1 - reveal.value) * 10 }],
  }));

  const tooltipProgress = useSharedValue(0);
  useEffect(() => {
    tooltipProgress.value = selectedIndex == null ? 0 : withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [selectedIndex, tooltipProgress]);
  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipProgress.value,
    transform: [{ scale: 0.9 + tooltipProgress.value * 0.1 }],
  }));

  // One tappable column per bucket, tiling the whole plot width contiguously
  // — no dead zones, and tapping a bucket with no data still gives feedback
  // instead of silently doing nothing.
  const columns = buckets.map((_, i) => {
    const centerX = plotX0 + i * stepX;
    const left = i === 0 ? plotX0 : centerX - stepX / 2;
    const right = i === buckets.length - 1 ? width : centerX + stepX / 2;
    return { left, width: Math.max(right - left, 1) };
  });

  const selectedBucket = selectedIndex != null ? buckets[selectedIndex] : null;
  const selectedCenterX = selectedIndex != null ? plotX0 + selectedIndex * stepX : 0;
  const selectedMoodY = selectedBucket?.avgMood != null ? scaleY(selectedBucket.avgMood) : null;
  const selectedConnectionY = selectedBucket?.avgConnection != null ? scaleY(selectedBucket.avgConnection) : null;
  const anchorYs = [selectedMoodY, selectedConnectionY].filter((y): y is number => y != null);
  const topAnchorY = anchorYs.length > 0 ? Math.min(...anchorYs) : CHART_HEIGHT / 2;
  const bottomAnchorY = anchorYs.length > 0 ? Math.max(...anchorYs) : CHART_HEIGHT / 2;
  const TOOLTIP_HEIGHT_ESTIMATE = 76;
  const tooltipAbove = topAnchorY - TOOLTIP_HEIGHT_ESTIMATE - 14 >= 0;
  const tooltipTop = tooltipAbove ? topAnchorY - TOOLTIP_HEIGHT_ESTIMATE - 14 : bottomAnchorY + 14;
  const tooltipLeft = Math.min(Math.max(selectedCenterX - TOOLTIP_WIDTH / 2, 4), width - TOOLTIP_WIDTH - 4);

  return (
    <View style={styles.card}>
      <View style={styles.legendRow}>
        <View style={styles.legendPill}>
          <View style={[styles.legendDot, { backgroundColor: colors.chartConnection }]} />
          <Text style={styles.legendLabel}>קשר עם ה׳</Text>
          <Text style={[styles.legendValue, { color: colors.chartConnection }]}>{formatValue(connectionLastValue)}</Text>
        </View>
        <View style={styles.legendPill}>
          <View style={[styles.legendDot, { backgroundColor: colors.chartMood }]} />
          <Text style={styles.legendLabel}>מצב רוח</Text>
          <Text style={[styles.legendValue, { color: colors.chartMood }]}>{formatValue(moodLastValue)}</Text>
        </View>
      </View>

      {hasData ? (
        <View style={styles.plotWrap}>
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
                  strokeOpacity={0.6}
                  strokeWidth={1}
                />
              ))}
              {selectedIndex != null && (
                <Line
                  x1={selectedCenterX}
                  y1={CHART_VERTICAL_PADDING * 0.3}
                  x2={selectedCenterX}
                  y2={CHART_HEIGHT - CHART_VERTICAL_PADDING * 0.3}
                  stroke={colors.textMuted}
                  strokeOpacity={0.3}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              )}
              <Series
                points={connectionPoints}
                color={colors.chartConnection}
                gradientId="chartConnectionFill"
                baselineY={scaleY(VALUE_MIN)}
                markerDelayBase={80}
                selectedIndex={selectedIndex}
              />
              <Series
                points={moodPoints}
                color={colors.chartMood}
                gradientId="chartMoodFill"
                baselineY={scaleY(VALUE_MIN)}
                markerDelayBase={140}
                selectedIndex={selectedIndex}
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

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {columns.map((col, i) => (
              <Pressable
                key={i}
                style={[styles.column, { left: col.left, width: col.width }]}
                onPress={() => setSelectedIndex((current) => (current === i ? null : i))}
              />
            ))}
          </View>

          {selectedBucket && (
            <Animated.View style={[styles.tooltip, tooltipStyle, { left: tooltipLeft, top: tooltipTop }]} pointerEvents="none">
              <Text style={styles.tooltipDate}>{selectedBucket.bucketLabel}</Text>
              {selectedBucket.avgMood != null || selectedBucket.avgConnection != null ? (
                <>
                  <View style={styles.tooltipRow}>
                    <View style={[styles.legendDot, { backgroundColor: colors.chartConnection }]} />
                    <Text style={styles.tooltipLabel}>קשר עם ה׳</Text>
                    <Text style={[styles.tooltipValue, { color: colors.chartConnection }]}>
                      {formatValue(selectedBucket.avgConnection)}
                    </Text>
                  </View>
                  <View style={styles.tooltipRow}>
                    <View style={[styles.legendDot, { backgroundColor: colors.chartMood }]} />
                    <Text style={styles.tooltipLabel}>מצב רוח</Text>
                    <Text style={[styles.tooltipValue, { color: colors.chartMood }]}>
                      {formatValue(selectedBucket.avgMood)}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.tooltipEmpty}>אין נתונים ליום זה</Text>
              )}
            </Animated.View>
          )}
        </View>
      ) : (
        <View style={[styles.emptyState, { height: CHART_HEIGHT }]}>
          <View style={styles.emptyBadge}>
            <Text style={styles.emptyEmoji}>📈</Text>
          </View>
          <Text style={styles.emptyText}>הגרף יתמלא ככל שתמשיך להתפלל</Text>
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

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
  card: {
    width: '100%',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  legendRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
  },
  legendPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  legendLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  legendValue: {
    ...typography.bodySecondary,
    fontWeight: '800',
  },
  plotWrap: {
    position: 'relative',
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
    fontWeight: '600',
    color: colors.textMuted,
  },
  column: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  tooltip: {
    position: 'absolute',
    width: TOOLTIP_WIDTH,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs / 2,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tooltipDate: {
    ...typography.caption,
    color: colors.primaryLight,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
  },
  tooltipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tooltipLabel: {
    ...typography.caption,
    color: colors.primaryLight,
    flex: 1,
  },
  tooltipValue: {
    ...typography.caption,
    fontWeight: '800',
  },
  tooltipEmpty: {
    ...typography.caption,
    color: colors.primaryLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 16,
  },
  emptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfacePressed,
  },
  emptyEmoji: {
    fontSize: 30,
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
}

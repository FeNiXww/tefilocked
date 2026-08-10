import { Fragment, memo, useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import type { StreakCandle } from '../data/storage/db';
import { Flame } from './Flame';
import { tierForStreak } from './streakTiers';
import { colors } from '../theme';

// Gold/brass metal palette for the menorah's body (arms, stem, base, cups) —
// deliberately distinct from the app's core navy/light-blue brand palette
// (colors.primary/accent), scoped to this component only so the rest of the
// app's blue-fire branding stays untouched.
const METAL_LIGHT = '#F6E4B0';
const METAL = '#D4A94A';
const METAL_DARK = '#8C6A24';
const METAL_SHADOW = '#5C4319';
// Deep blue candle wax — distinct enough in value/saturation from the
// flame's lighter brand blue (colors.accent) that the two still read as
// separate materials rather than blending into one blue shape.
const WAX = '#2C4D82';
const WAX_DARK = '#1E3860';
const WAX_HIGHLIGHT = '#5C82BD';

const STEM_WIDTH = 7;
const STEM_HEIGHT = 24;
// Today is always the row's candle-in-progress — visually raised like a
// shamash, the "helper" candle a hanukkiah uses to light the others, since
// tapping it is literally what lights the next one. Independent of the
// structural shamash branch below (a real hanukkiah's 9th branch is always
// physically elevated on the right regardless of which of the 8 nightly
// candles is currently being lit).
const TODAY_STEM_HEIGHT = 33;
// The centermost candle stands a touch above its neighbors — a small,
// purely decorative accent so the row doesn't read as a flat, uniform line
// of wax. Shorter than today's raise (which always wins if the two ever
// coincide) so it stays a subtle detail, not a competing focal point.
const MIDDLE_STEM_HEIGHT = 28;
// Smaller than the candle itself — a real flame tip is a fraction of the
// candle's height, not a halo that swallows it, and small flames read as
// more numerous/varied when nine of them are flickering independently.
const FLAME_SIZE = 13;
const MAX_HALO_MULTIPLE = 1.5;
// Concentric soft-glow rings drawn behind the flame itself (its aura), sized
// as multiples of the flame's own halo size. How many of these actually
// render is capped by the streak tier's `glowLayers` — richer streaks read as
// a bigger, deeper bloom, not just a bigger flame.
const AURA_RING_MULTIPLIERS = [1.15, 1.35, 1.55];

// Ignition choreography — timings/springs tuned so lighting a new candle
// reads as one deliberate mechanical "snap" rather than a smooth fade: a
// short wind-up while the tip visibly darkens (as if drawing in energy),
// then a fast overshoot past the flame's resting size, then a tight spring
// settle. The Heavy haptic fires the instant the burst hits its peak scale —
// via the withTiming completion callback below, not a fixed-delay timer — so
// touch and motion stay locked together regardless of JS-thread timing.
const IGNITION_WINDUP_MS = 150;
const IGNITION_RISE_MS = 110;
const IGNITION_SPRING = { stiffness: 620, damping: 13, mass: 0.7 };
// How far the whole hanukkiah body compresses downward the instant a candle
// ignites — small enough to read as weight, not a bounce across the screen.
const BODY_COMPRESS_PX = 4;
const BODY_COMPRESS_DOWN_MS = 70;
const BODY_COMPRESS_SPRING = { stiffness: 900, damping: 18, mass: 0.5 };

// A hanukkiah is a fixed nine-branch object — showing only the candles lit
// so far reads as a handful of unrelated bars, not a menorah. The full
// structure is always on screen; slots beyond the current streak render as
// dim, unlit placeholder candles with no cup interaction and no flame.
const TOTAL_CANDLES = 9;
// The far-right branch is the shamash — structurally fixed and always
// physically raised, independent of which slot happens to be "today."
const SHAMASH_INDEX = TOTAL_CANDLES - 1;
// The visually centered branch — same slot whether you count from the data
// array or the row's flipped (RTL) visual order, since 9 is odd.
const MIDDLE_INDEX = Math.floor(TOTAL_CANDLES / 2);

// ---- Unified menorah body geometry -----------------------------------
// Everything below (base, stem, arms, cups) is drawn as one continuous
// sculpted piece spanning the row's full width, instead of nine independent
// per-candle boxes plus a separate floating shaft and pedestal — a real
// hanukkiah's arms visibly converge into one shaft, which converges into one
// base, and this is what actually reads as "handcrafted metal object" rather
// than parts placed side by side. The SVG viewBox width is stretched to the
// row's real on-screen width (non-uniform horizontal scale, same trick the
// old pedestal used) while its height renders 1:1 in dp, so every vertical
// proportion below (arm rise, stem taper, base flare) is real and consistent
// across devices.
const BODY_VBW = 340;
const BODY_VBH = 96;
const BODY_CENTER_X = BODY_VBW / 2;
// Rim y for the 8 regular cups vs. the one shamash cup — the shamash sits
// much higher, its arm rising far more steeply to get there.
const REGULAR_CUP_Y = 20;
const SHAMASH_CUP_Y = 6;
// y where every arm's underside gathers into the stem's neck.
const COLLAR_Y = 46;
// How widely the arms' bottoms fan out across the stem's neck as they leave
// it — well short of the cups' own spread, so arms read as converging into
// one shaft rather than radiating from a single infinitesimal point.
const COLLAR_SPREAD = 0.2;

const CUP_RX = 6;
const CUP_RY = 3.2;
const ARM_STROKE = 3.4;
const ARM_UNDER_STROKE = 5;
const BODY_METAL_ID = 'hanukkiahBodyMetal';
const CUP_METAL_ID = 'hanukkiahCupMetal';

/** The 9 columns are evenly spaced across the body's width — this is a candle's (and its arm's) x position for a given left-to-right visual slot (0 = leftmost, 8 = the shamash on the far right). */
function cupX(v: number): number {
  return (v + 0.5) * (BODY_VBW / TOTAL_CANDLES);
}
function cupY(v: number): number {
  return v === SHAMASH_INDEX ? SHAMASH_CUP_Y : REGULAR_CUP_Y;
}
function collarX(v: number): number {
  return BODY_CENTER_X + (cupX(v) - BODY_CENTER_X) * COLLAR_SPREAD;
}
/** A gentle S-curve from the stem's neck up to this branch's cup — the same "rises from a shared base, curves toward its own x" shape as before, just anchored to the real shaft position instead of a per-candle box. */
function armPath(v: number): string {
  const x = cupX(v);
  const bx = collarX(v);
  const y = cupY(v);
  const midY = (COLLAR_Y + y) / 2;
  return `M ${bx} ${COLLAR_Y} C ${bx} ${midY}, ${x} ${midY}, ${x} ${y}`;
}

/** How far (dp, measured up from the body's own bottom edge) a slot's candle wax should sit — tucked a couple dp below its cup's rim so the holder visibly wraps the base instead of the candle just resting on top of it. */
function seatFromBodyBottom(v: number): number {
  return BODY_VBH - cupY(v) - 2;
}

// The stem+base silhouette, as a single closed, continuously-curved outline
// instead of stacked rectangles — a slender neck (where the arms gather),
// a waist, a decorative shoulder knop, then a wide flared foot. Expressed as
// [y, halfWidth] stations, mirrored left/right around the center and
// connected with smooth S-curve segments (see profileSide below), so the
// whole thing reads as one turned, cast piece rather than separate tiers.
const STEM_PROFILE: Array<[number, number]> = [
  [COLLAR_Y, 25],
  [58, 17],
  [70, 38],
  [84, 62],
  [BODY_VBH, 74],
];

function profileSide(points: Array<[number, number]>, side: 1 | -1, cx: number): string {
  let d = '';
  for (let i = 0; i < points.length - 1; i++) {
    const [y0, hw0] = points[i];
    const [y1, hw1] = points[i + 1];
    const midY = y0 + (y1 - y0) / 2;
    d += `C ${cx + side * hw0} ${midY}, ${cx + side * hw1} ${midY}, ${cx + side * hw1} ${y1} `;
  }
  return d;
}

function buildBodyPath(): string {
  const cx = BODY_CENTER_X;
  const top = STEM_PROFILE[0];
  const bottom = STEM_PROFILE[STEM_PROFILE.length - 1];
  let d = `M ${cx - top[1]} ${top[0]} `;
  d += profileSide(STEM_PROFILE, -1, cx);
  // A shallow bow across the underside of the foot — grounded weight rather
  // than a flat, ruler-straight bottom edge.
  d += `C ${cx - bottom[1] * 0.4} ${bottom[0] + 3}, ${cx + bottom[1] * 0.4} ${bottom[0] + 3}, ${cx + bottom[1]} ${bottom[0]} `;
  d += profileSide([...STEM_PROFILE].reverse(), 1, cx);
  d += 'Z';
  return d;
}

const BODY_PATH = buildBodyPath();

/**
 * The menorah's metal body — base, stem and all 9 arms — as one continuous
 * sculpted silhouette plus attached branches, entirely static (it never
 * depends on streak state). Sits behind the candle row; the cups themselves
 * are drawn by CupLayer, in front of the candles, so each wax candle visibly
 * disappears into its holder instead of floating in front of it.
 */
const MenorahBody = memo(function MenorahBody() {
  return (
    <Svg width="100%" height={BODY_VBH} viewBox={`0 0 ${BODY_VBW} ${BODY_VBH}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={BODY_METAL_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={METAL_LIGHT} />
          <Stop offset="0.5" stopColor={METAL} />
          <Stop offset="1" stopColor={METAL_DARK} />
        </LinearGradient>
      </Defs>
      {/* Base + stem, one filled outline lit from a single shared top-down
          gradient — the whole piece reads as one casting under one light
          source rather than several parts each shaded independently. */}
      <Path d={BODY_PATH} fill={`url(#${BODY_METAL_ID})`} />
      {/* Tasteful, minimal turned-metal engraving — a shallow arc following
          the silhouette's own width at each of its waist/shoulder/foot
          stations, not applied decoration bolted on top. */}
      {([
        [58, 17],
        [70, 38],
        [84, 62],
      ] as const).map(([y, hw]) => (
        <Path
          key={y}
          d={`M ${BODY_CENTER_X - hw} ${y} Q ${BODY_CENTER_X} ${y + 2.2} ${BODY_CENTER_X + hw} ${y}`}
          stroke={METAL_SHADOW}
          strokeWidth={1.4}
          fill="none"
          opacity={0.5}
        />
      ))}
      {/* A soft vertical catch-light on the neck/waist, suggesting a
          polished, rounded surface rather than a flat-shaded silhouette. */}
      <Path
        d={`M ${BODY_CENTER_X - 5} ${COLLAR_Y + 1} L ${BODY_CENTER_X - 6} ${69}`}
        stroke={METAL_LIGHT}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.5}
      />
      {/* A wide, shallow collar band the arms visually plug into — without
          it, nine separate stroke ends converging on the same small patch of
          the base's own curved surface pile up into a "scalloped" cluster of
          round caps instead of reading as one shared joint. */}
      <Ellipse cx={BODY_CENTER_X} cy={COLLAR_Y} rx={30} ry={7} fill={`url(#${BODY_METAL_ID})`} />
      <Ellipse cx={BODY_CENTER_X} cy={COLLAR_Y - 1.5} rx={26} ry={4.5} fill={METAL_LIGHT} opacity={0.35} />
      {/* The arms — identical thickness, each rising in a smooth S-curve
          from the shared collar out to its own cup. Flat (not round) caps at
          both ends: the collar end plugs into the band above instead of
          bulging past it, and the cup end is hidden under CupLayer anyway. */}
      {Array.from({ length: TOTAL_CANDLES }, (_, v) => (
        <Path key={`under${v}`} d={armPath(v)} stroke={METAL_SHADOW} strokeWidth={ARM_UNDER_STROKE} fill="none" strokeLinecap="butt" opacity={0.5} />
      ))}
      {Array.from({ length: TOTAL_CANDLES }, (_, v) => (
        <Path key={`arm${v}`} d={armPath(v)} stroke={`url(#${BODY_METAL_ID})`} strokeWidth={ARM_STROKE} fill="none" strokeLinecap="butt" />
      ))}
    </Svg>
  );
});

/** Every cup — shadowed base ring, metal body, glossy highlight (lit) or recessed shadow (unlit) — drawn in front of the candle row so each candle visibly sits inside its holder instead of appearing pasted on top of it. */
const CupLayer = memo(function CupLayer({ completed }: { completed: boolean[] }) {
  return (
    <Svg width="100%" height={BODY_VBH} viewBox={`0 0 ${BODY_VBW} ${BODY_VBH}`} preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id={CUP_METAL_ID} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={METAL_LIGHT} />
          <Stop offset="1" stopColor={METAL_DARK} />
        </LinearGradient>
      </Defs>
      {Array.from({ length: TOTAL_CANDLES }, (_, v) => {
        const x = cupX(v);
        const y = cupY(v);
        const lit = completed[v];
        return (
          <Fragment key={v}>
            <Ellipse cx={x} cy={y + 0.8} rx={CUP_RX + 1} ry={CUP_RY + 0.8} fill={METAL_SHADOW} opacity={0.4} />
            <Ellipse cx={x} cy={y} rx={CUP_RX} ry={CUP_RY} fill={lit ? `url(#${CUP_METAL_ID})` : colors.textMuted} />
            {lit ? (
              <Ellipse cx={x} cy={y - 0.6} rx={CUP_RX * 0.5} ry={CUP_RY * 0.35} fill={METAL_LIGHT} opacity={0.65} />
            ) : (
              <Ellipse cx={x} cy={y + 0.3} rx={CUP_RX * 0.5} ry={CUP_RY * 0.4} fill={METAL_SHADOW} opacity={0.35} />
            )}
          </Fragment>
        );
      })}
    </Svg>
  );
});

const CANDLE_COLUMN_WIDTH = 34;
/** Room above the cup for shamash + flame (plus its outer aura rings) so Android doesn't clip the tips. */
const FLAME_HEADROOM = FLAME_SIZE * MAX_HALO_MULTIPLE + 14;
/** Fixed per-column box tall enough for the tallest possible candle (today, raised) sitting in the tallest possible seat (the shamash's, raised even further) plus flame headroom — shared by every column so the row stays evenly aligned regardless of which slot happens to be tall today. */
const WICK_AREA_HEIGHT = seatFromBodyBottom(SHAMASH_INDEX) + TODAY_STEM_HEIGHT + FLAME_HEADROOM;
/** Distance from the body/cup layers' own bottom edge up to the row's own bottom edge — must match the day-label's height so it lines up with each candle's cup seat. */
const BODY_SLOT_BOTTOM = 20;

interface CandleProps {
  dayNumber: number;
  completed: boolean;
  isToday: boolean;
  /** The structurally centered branch — stands a touch taller, independent of streak state. */
  isMiddle: boolean;
  /** A future day beyond the current streak — the branch and cup are real, but the candle is a dim, unlit placeholder. */
  placeholder: boolean;
  /** How far up from this column's wick-area bottom the candle's wax should sit — the shamash column sits higher, matching its raised cup. */
  seat: number;
  haloOpacity: number;
  haloReach: number;
  pulseScale: number;
  /** How many concentric aura rings glow behind the flame — from the streak tier, richer at longer streaks. */
  glowLayers: number;
  onPress?: () => void;
  /** Fires the instant this candle's ignition burst peaks, so the whole hanukkiah body can react physically. */
  onIgnite?: () => void;
}

const Candle = memo(function Candle({
  dayNumber,
  completed,
  isToday,
  isMiddle,
  placeholder,
  seat,
  haloOpacity,
  haloReach,
  pulseScale,
  glowLayers,
  onPress,
  onIgnite,
}: CandleProps) {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(completed ? 1 : 0);
  const breathe = useSharedValue(1);
  const invite = useSharedValue(1);
  // Breathing opacity for the aura + halo — separate from `breathe` (which
  // scales the candle+flame group) so the glow's "pulse" and the flame's
  // "sway" drift out of phase with each other instead of moving in lockstep.
  const glowPulse = useSharedValue(1);
  // 0 → 1.4 → spring-settle-to-1 burst applied to the flame the moment this
  // candle ignites; stays at a plain 0/1 for candles that were already lit
  // (or already unlit) when the row first mounted.
  const burstScale = useSharedValue(completed ? 1 : 0);
  // Darkens the empty tip for a beat right before ignition, as if it were
  // drawing in energy.
  const windup = useSharedValue(0);
  // Tracks the previous `completed` value so a real false→true transition
  // (an actual ignition happening live) can be told apart from this candle
  // simply mounting already-lit (a past day loaded from storage) — only the
  // former should play the burst + haptic symphony.
  const prevCompleted = useRef(completed);

  const handleIgnitionPeak = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onIgnite?.();
  };

  const handleIgnitionSettle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  useEffect(() => {
    const justIgnited = completed && !prevCompleted.current;
    prevCompleted.current = completed;

    if (reduceMotion) {
      glow.value = completed ? 1 : 0;
      burstScale.value = completed ? 1 : 0;
      windup.value = 0;
      return;
    }

    if (justIgnited) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      windup.value = withSequence(
        withTiming(1, { duration: IGNITION_WINDUP_MS, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 120 })
      );
      glow.value = withDelay(IGNITION_WINDUP_MS, withTiming(1, { duration: 180 }));
      burstScale.value = withDelay(
        IGNITION_WINDUP_MS,
        withSequence(
          withTiming(1.4, { duration: IGNITION_RISE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
            'worklet';
            if (finished) runOnJS(handleIgnitionPeak)();
          }),
          withSpring(1, IGNITION_SPRING, (finished) => {
            'worklet';
            if (finished) runOnJS(handleIgnitionSettle)();
          })
        )
      );
    } else {
      glow.value = withTiming(completed ? 1 : 0, { duration: 450, easing: Easing.out(Easing.cubic) });
      burstScale.value = completed ? 1 : 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !completed) {
      glowPulse.value = 1;
      return;
    }
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, reduceMotion]);

  useEffect(() => {
    if (reduceMotion || !completed) {
      breathe.value = 1;
      return;
    }
    breathe.value = withRepeat(
      withSequence(
        withTiming(1 + pulseScale, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed, reduceMotion, pulseScale]);

  // Today, before it's lit: a soft inviting pulse on the wick so the candle
  // reads as "tap me" — this is the flow's entry point now that the
  // standalone CTA button is gone.
  useEffect(() => {
    if (reduceMotion || !isToday || completed) {
      invite.value = 1;
      return;
    }
    invite.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, completed, reduceMotion]);

  // The aura rings (the soft bloom behind the flame) fade in/out with the lit
  // state and breathe independently of the crisp flame shape rendered on top
  // of them — and burst outward together with the flame on ignition.
  const auraStyle = useAnimatedStyle(() => ({
    opacity: glow.value * glowPulse.value,
    transform: [{ scale: burstScale.value }],
  }));
  const windupStyle = useAnimatedStyle(() => ({ opacity: windup.value }));
  const stemAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathe.value * invite.value }],
  }));

  const stemHeight = isToday ? TODAY_STEM_HEIGHT : isMiddle ? MIDDLE_STEM_HEIGHT : STEM_HEIGHT;
  const haloSize = FLAME_SIZE * Math.min(haloReach, MAX_HALO_MULTIPLE);
  const interactive = isToday && !completed && !!onPress;

  const content = (
    <View style={styles.candleWrap}>
      <View style={styles.wickArea}>
        <View style={[styles.stemBottomAnchor, { bottom: seat }]}>
          <Animated.View style={stemAnimatedStyle}>
            <View
              style={[
                styles.stem,
                placeholder ? styles.stemPlaceholder : isToday && !completed && styles.stemToday,
                { height: stemHeight },
              ]}
            >
              {/* A thin light streak down one edge of the wax — cheap stand-in
                  for a specular highlight so the candle reads as a rounded,
                  waxy cylinder instead of a flat tinted bar. */}
              {!placeholder && <View style={styles.stemSheen} />}
            </View>
            {!completed && !placeholder && <View style={styles.wick} />}
            {!placeholder && <Animated.View pointerEvents="none" style={[styles.windupShade, windupStyle]} />}
          </Animated.View>
          {!placeholder && (
            <View
              pointerEvents="none"
              style={[styles.halo, { width: haloSize, height: haloSize, bottom: stemHeight - haloSize * 0.2 }]}
            >
              <Animated.View style={[styles.auraLayer, auraStyle]}>
                {AURA_RING_MULTIPLIERS.slice(0, glowLayers).map((mult, i) => {
                  const ringSize = haloSize * mult;
                  return (
                    <View
                      key={i}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: ringSize,
                        height: ringSize,
                        marginLeft: -ringSize / 2,
                        marginTop: -ringSize / 2,
                        borderRadius: ringSize / 2,
                        backgroundColor: colors.accent,
                        opacity: haloOpacity * (1 - i * 0.35),
                      }}
                    />
                  );
                })}
              </Animated.View>
              <Animated.View style={stemAnimatedStyle}>
                <Flame size={haloSize} active={completed} particles burst={burstScale} />
              </Animated.View>
            </View>
          )}
        </View>
      </View>
      <Text
        style={[
          styles.dayLabel,
          placeholder ? styles.dayLabelPlaceholder : isToday && !completed && styles.dayLabelPending,
        ]}
      >
        {dayNumber}
      </Text>
    </View>
  );

  if (!interactive) return content;

  return (
    <Pressable
      style={styles.candlePressable}
      accessibilityRole="button"
      accessibilityLabel={`יום מספר ${dayNumber}, הקש כדי להתחיל`}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      hitSlop={10}
    >
      {content}
    </Pressable>
  );
});

export interface HanukkiahStreakRowProps {
  /** Oldest-first candles for the current streak, up to 9, always ending on today (see getStreakCandles). */
  candles: StreakCandle[];
  /** Consecutive-day streak count — drives glow intensity, shared with the tiers other streak visuals use. */
  streak: number;
  /** Tapping today's candle before it's lit starts the prayer flow. */
  onStartToday?: () => void;
}

/**
 * A חנוכייה built from the current streak: the full nine-branch structure is
 * always shown, oldest day first through today, with any remaining slots up
 * to 9 rendered as dim, unlit placeholder candles — a real hanukkiah doesn't
 * grow branches as the nights pass, so the row shouldn't either. Once the
 * streak reaches 9, every branch is guaranteed lit, so the whole menorah
 * reads as fully lit. Today's candle is always the tallest, unlit one, and
 * doubles as the entry point into the prayer flow; the far-right branch is
 * the structural shamash, permanently raised regardless of which slot is
 * "today." The whole body — base, stem, arms and cups — is one continuous
 * sculpted piece (MenorahBody + CupLayer) rather than nine independent boxes,
 * so it reads as a single handcrafted object.
 */
export function HanukkiahStreakRow({ candles, streak, onStartToday }: HanukkiahStreakRowProps) {
  const tier = tierForStreak(streak);
  const todayDayNumber = candles[candles.length - 1]?.dayNumber ?? 1;

  // The physical reaction to a candle igniting: the whole body takes the
  // energy of the burst, compressing down a few pixels and springing back —
  // as if the flame's ignition carried actual weight, not just a lighting
  // change on one branch.
  const bodyOffsetY = useSharedValue(0);
  const bodyAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: bodyOffsetY.value }] }));
  const handleIgnite = useCallback(() => {
    bodyOffsetY.value = withSequence(
      withTiming(BODY_COMPRESS_PX, { duration: BODY_COMPRESS_DOWN_MS, easing: Easing.out(Easing.quad) }),
      withSpring(0, BODY_COMPRESS_SPRING)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slots = Array.from({ length: TOTAL_CANDLES }, (_, i) => {
    const candle = candles[i];
    return candle
      ? { key: `d${candle.dayNumber}`, dayNumber: candle.dayNumber, completed: candle.completed, isToday: candle.isToday, placeholder: false }
      : {
          key: `placeholder${i}`,
          dayNumber: todayDayNumber + (i - (candles.length - 1)),
          completed: false,
          isToday: false,
          placeholder: true,
        };
  });

  // The row is RTL (row-reverse): data index 0 renders at the row's visual
  // right edge, the last index at its visual left edge. The cup layer needs
  // each slot's lit state ordered left-to-right (visual index 0..8) to match
  // the body geometry's own coordinate space.
  const completedByVisualIndex = Array.from({ length: TOTAL_CANDLES }, (_, v) => {
    const dataIndex = TOTAL_CANDLES - 1 - v;
    return slots[dataIndex].completed;
  });

  return (
    <Animated.View style={[styles.base, bodyAnimatedStyle]}>
      {/* A soft ambient contact shadow to ground the whole object on the
          screen — two stacked, decreasingly-opaque blobs fake the blur a
          single flat shadow can't give without a real blur filter. */}
      <View pointerEvents="none" style={styles.groundShadowOuter} />
      <View pointerEvents="none" style={styles.groundShadowInner} />
      <View style={styles.rowFrame}>
        <View style={styles.bodySlot} pointerEvents="none">
          <MenorahBody />
        </View>
        <View style={styles.row}>
          {slots.map((slot, i) => {
            const visualIndex = TOTAL_CANDLES - 1 - i;
            return (
              <Candle
                key={slot.key}
                dayNumber={slot.dayNumber}
                completed={slot.completed}
                isToday={slot.isToday}
                isMiddle={i === MIDDLE_INDEX}
                placeholder={slot.placeholder}
                seat={seatFromBodyBottom(visualIndex)}
                haloOpacity={tier.haloOpacity}
                haloReach={tier.haloReach}
                pulseScale={tier.pulseScale}
                glowLayers={tier.glowLayers}
                onPress={slot.isToday ? onStartToday : undefined}
                onIgnite={handleIgnite}
              />
            );
          })}
        </View>
        <View style={styles.bodySlot} pointerEvents="none">
          <CupLayer completed={completedByVisualIndex} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  groundShadowOuter: {
    position: 'absolute',
    bottom: -6,
    left: '18%',
    right: '18%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primaryDark,
    opacity: 0.1,
  },
  groundShadowInner: {
    position: 'absolute',
    bottom: -3,
    left: '32%',
    right: '32%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
    opacity: 0.16,
  },
  rowFrame: {
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  bodySlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BODY_SLOT_BOTTOM,
    height: BODY_VBH,
  },
  row: {
    flexDirection: 'row-reverse',
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    zIndex: 1,
    overflow: 'visible',
  },
  candleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  candlePressable: {
    flex: 1,
  },
  wickArea: {
    height: WICK_AREA_HEIGHT,
    width: CANDLE_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  stemBottomAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  halo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  windupShade: {
    position: 'absolute',
    top: -5,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primaryDark,
  },
  stem: {
    width: STEM_WIDTH,
    borderRadius: STEM_WIDTH / 2,
    overflow: 'hidden',
    // Deep blue wax — deliberately more saturated/darker than the flame's
    // own brand blue (colors.accent) so the two stay visually distinct.
    backgroundColor: WAX,
    borderWidth: 1,
    borderColor: WAX_DARK,
    shadowColor: colors.textMuted,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  stemToday: {
    // Gold ring instead of a blue one — pops against the blue wax and ties
    // the "ready to light" highlight to the menorah's own metal color.
    borderColor: METAL,
    borderWidth: 1.5,
  },
  stemPlaceholder: {
    backgroundColor: '#C9D3E2',
    borderColor: '#C9D3E2',
    shadowOpacity: 0,
  },
  stemSheen: {
    position: 'absolute',
    left: 1,
    top: 2,
    bottom: 3,
    width: 1.5,
    borderRadius: 1,
    backgroundColor: WAX_HIGHLIGHT,
    opacity: 0.55,
  },
  wick: {
    position: 'absolute',
    top: -3,
    alignSelf: 'center',
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: colors.textMuted,
  },
  dayLabel: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dayLabelPending: {
    color: colors.textMuted,
  },
  dayLabelPlaceholder: {
    color: colors.border,
  },
});

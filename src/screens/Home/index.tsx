import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as StoreReview from 'expo-store-review';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  scrollTo,
  withTiming,
} from 'react-native-reanimated';
import {
  getLastKnownStreak,
  getPreferredContentTypes,
  isPendingHanukkiahCompletionCelebration,
  isReviewPrompted,
  markReviewPrompted,
  setLastKnownStreak,
  setPendingHanukkiahCompletionCelebration,
} from '../../data/storage/mmkv';
import {
  getCurrentStreak,
  getStreakCandles,
  hasCompletedToday,
  type StreakCandle,
} from '../../data/storage/db';
import { scheduleMotivationalMessages, syncDailyReminder } from '../../notifications/streakReminders';
import { scheduleTrialEndingReminder } from '../../subscriptions/trialReminder';
import { haptics } from '../../haptics';
import { LockContentFlow } from '../LockContentFlow';
import { AnimatedCounter } from '../../components/AnimatedCounter';
import { MagenDavidStreak } from '../../components/MagenDavidStreak';
import { HanukkiahStreakRow } from '../../components/HanukkiahStreakRow';
import {
  FLARE_TOTAL_MS,
  MENORAH_FOCUS_SETTLE_MS,
  MENORAH_LAYOUT_WAIT_TIMEOUT_MS,
  MENORAH_SCROLL_NEGLIGIBLE_PX,
  MENORAH_SILENCE_MS,
  MENORAH_STILLNESS_MS,
  scrollDurationForDistance,
  type MenorahAnchorRect,
} from '../../components/menorahCinematic';
import { MenorahCompleteOverlay } from '../../components/MenorahCompleteOverlay';
import { MenorahStreakLostOverlay } from '../../components/MenorahStreakLostOverlay';
import { SparkleBackground } from '../../components/SparkleBackground';
import { Logo } from '../../components/Logo';
import { UnlockCountdown } from '../../components/UnlockCountdown';
import { TimerEditSheet } from '../../components/TimerEditSheet';
import { useUnlockTimer } from '../../native/appLocking/useUnlockTimer';
import { celebrateStreakWidget, syncStreakWidget } from '../../widgets/syncStreakWidget';
import { spacing, useTheme, type ThemeColors, type Typography } from '../../theme';

/** Gap between each already-lit candle starting its own gutter-out sequence,
 * oldest catching up last — see the break-handling branch below. Reuses each
 * candle's own physical extinguish choreography (HanukkiahStreakRow's
 * Candle), just staggers WHEN it starts, so the row visibly loses its light
 * candle by candle instead of all nine going dark in the same frame. */
const EXTINGUISH_STAGGER_MS = 70;
/** Candle's own gutter-out sequence length (see HanukkiahStreakRow's
 * EXTINGUISH_* constants) plus a small settle buffer — the "final flame goes
 * out" haptic and the silence pause only begin once the last staggered
 * candle has actually finished, not on a fixed guess. */
const EXTINGUISH_SEQUENCE_MS = 680;
/** Lets today's candle finish its own ignition burst (HanukkiahStreakRow's
 * Candle justIgnited sequence) before the cinematic scroll/focus begins. */
const CELEBRATION_DELAY_MS = 500;

/** Extra space so the tab bar never covers the חנוכייה pedestal and day labels. */
const TAB_BAR_CLEARANCE = 88;

const STAR_SIZE = 128;

export function Home() {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const insets = useSafeAreaInsets();
  const [showingFlow, setShowingFlow] = useState(false);
  const [streak, setStreak] = useState(() => getCurrentStreak());
  const [litToday, setLitToday] = useState(() => hasCompletedToday());
  const [streakCandles, setStreakCandles] = useState<StreakCandle[]>(() => getStreakCandles());
  // What the חנוכייה row actually renders — normally mirrors `streakCandles`,
  // but a detected streak break holds this at the previous (lit) candles so
  // the row's own fade plays on the real object before the state underneath
  // jumps to the reset data. See the break-handling branch in the focus
  // effect below.
  const [displayCandles, setDisplayCandles] = useState<StreakCandle[]>(streakCandles);
  const [celebratingComplete, setCelebratingComplete] = useState(false);
  const [streakLost, setStreakLost] = useState<{ previousStreak: number } | null>(null);
  // The real, on-screen rect of the חנוכייה card — measured fresh at the end
  // of every cinematic scroll/focus sequence, so both overlays can anchor
  // their effects and message card to the user's actual חנוכייה instead of
  // drawing a second one in the middle of a generic dark screen.
  const [menorahAnchorRect, setMenorahAnchorRect] = useState<MenorahAnchorRect | null>(null);
  const [showingTimerEditor, setShowingTimerEditor] = useState(false);
  const { remainingSeconds, applyDuration, reset: resetTimer } = useUnlockTimer();

  // Read inside the focus effect (stable `[]` deps, see below) without
  // pulling `streakCandles` into its dependency array — that would redefine
  // the callback on every commit and risk re-running the break-detection
  // logic mid-sequence.
  const streakCandlesRef = useRef(streakCandles);
  useEffect(() => {
    streakCandlesRef.current = streakCandles;
  }, [streakCandles]);
  // Guards against re-entering the break sequence if the tab loses and
  // regains focus again while the extinguish timer is still pending.
  const handlingBreakRef = useRef(false);
  // Read inside tryShowPendingCelebration (stable identity, see below)
  // without pulling `streakLost` into its deps — lets it check "is the
  // streak-lost overlay currently up" without redefining itself every time
  // that state changes.
  const streakLostRef = useRef(streakLost);
  useEffect(() => {
    streakLostRef.current = streakLost;
  }, [streakLost]);

  // ---- Cinematic scroll/focus infrastructure -----------------------------
  // Both overlays start with the SAME move: bring the real חנוכייה into view
  // and make the rest of Home visually secondary, before anything ignites or
  // extinguishes. This block is what makes that happen — see
  // presentMenorahCinematic below for the actual orchestration.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  // Plain (non-animated) ref so `.measureInWindow` — a JS-thread-only RN
  // method — can be called on it once the camera has settled.
  const menorahCardRef = useRef<View>(null);
  // Written directly in onLayout, not React state — nothing needs to
  // re-render when these change, they're only ever read at the moment a
  // cinematic starts.
  const weekCardLayoutRef = useRef<{ y: number; height: number } | null>(null);
  const scrollViewportHeightRef = useRef(0);
  const currentScrollY = useSharedValue(0);
  const scrollProgress = useSharedValue(0);
  // 0 = normal Home, 1 = fully dimmed/de-emphasized (heroCard + floating
  // header) or fully emphasized (חנוכייה card) — see homeDimStyle /
  // menorahFocusStyle below.
  const homeDim = useSharedValue(0);
  const menorahFocus = useSharedValue(0);
  // Bumped once per completion celebration to trigger the real candles'
  // staggered "flare" (see HanukkiahStreakRow) — a counter rather than a
  // boolean so a repeat completion on a later day re-fires it.
  const [flareTrigger, setFlareTrigger] = useState(0);
  const [cinematicActive, setCinematicActive] = useState(false);
  const cinematicActiveRef = useRef(false);
  useEffect(() => {
    cinematicActiveRef.current = cinematicActive;
  }, [cinematicActive]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      currentScrollY.value = event.contentOffset.y;
    },
  });

  // The actual custom-duration/easing programmatic scroll — driving
  // `scrollTo` from a `useAnimatedReaction` on a shared value animated via
  // `withTiming` is the standard Reanimated pattern for this; it runs
  // entirely on the UI thread, so the "camera move" stays smooth regardless
  // of what the JS thread is doing.
  useAnimatedReaction(
    () => scrollProgress.value,
    (y, previousY) => {
      if (y !== previousY) {
        scrollTo(scrollRef, 0, y, false);
      }
    }
  );

  const homeDimStyle = useAnimatedStyle(() => ({
    opacity: 1 - homeDim.value * 0.55,
    transform: [{ scale: 1 - homeDim.value * 0.03 }],
  }));
  const menorahFocusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + menorahFocus.value * 0.035 }],
  }));

  const waitForWeekCardLayout = useCallback((): Promise<{ y: number; height: number } | null> => {
    if (weekCardLayoutRef.current) return Promise.resolve(weekCardLayoutRef.current);
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        if (weekCardLayoutRef.current) {
          resolve(weekCardLayoutRef.current);
          return;
        }
        if (Date.now() - startedAt > MENORAH_LAYOUT_WAIT_TIMEOUT_MS) {
          resolve(null);
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }, []);

  const measureMenorahRect = useCallback((): Promise<MenorahAnchorRect | null> => {
    return new Promise((resolve) => {
      const node = menorahCardRef.current;
      if (!node) {
        resolve(null);
        return;
      }
      node.measureInWindow((x, y, width, height) => {
        resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
      });
    });
  }, []);

  /**
   * The shared first act for both cinematics: scroll the real Home screen
   * until the חנוכייה card is centered (skipping the scroll — but still
   * settling focus — if it's already close enough), dim everything else,
   * emphasize the card, then hand back its real on-screen rect so the
   * calling overlay can anchor its effects to the user's actual חנוכייה
   * instead of a generic screen-centered popup. Never throws — a failure to
   * measure/scroll just resolves with `null` (the overlays fall back to
   * screen-centered effects) rather than losing the celebration/
   * acknowledgment entirely.
   */
  const presentMenorahCinematic = useCallback(async (): Promise<MenorahAnchorRect | null> => {
    try {
      const layout = await waitForWeekCardLayout();
      if (layout) {
        const viewportH = scrollViewportHeightRef.current;
        const targetY = Math.max(0, layout.y - Math.max(0, (viewportH - layout.height) / 2));
        const distance = Math.abs(targetY - currentScrollY.value);

        if (distance > MENORAH_SCROLL_NEGLIGIBLE_PX) {
          const duration = scrollDurationForDistance(distance);
          await new Promise<void>((resolve) => {
            scrollProgress.value = currentScrollY.value;
            scrollProgress.value = withTiming(targetY, { duration, easing: Easing.inOut(Easing.cubic) }, (finished) => {
              if (finished) runOnJS(resolve)();
            });
          });
        }
      }

      homeDim.value = withTiming(1, { duration: MENORAH_FOCUS_SETTLE_MS, easing: Easing.out(Easing.quad) });
      menorahFocus.value = withTiming(1, { duration: MENORAH_FOCUS_SETTLE_MS, easing: Easing.out(Easing.quad) });
      await new Promise<void>((resolve) => setTimeout(resolve, MENORAH_FOCUS_SETTLE_MS));

      return await measureMenorahRect();
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitForWeekCardLayout, measureMenorahRect]);

  /** Always releases the interaction lock and eases Home back to normal —
   * called on dismiss, and as a safety net on unmount, so an interrupted
   * cinematic can never leave the Home screen permanently dimmed/locked. */
  const restoreHomeFromCinematic = useCallback(() => {
    homeDim.value = withTiming(0, { duration: 300 });
    menorahFocus.value = withTiming(0, { duration: 300 });
    setCinematicActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      homeDim.value = 0;
      menorahFocus.value = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The ONE place that decides whether a pending חנוכייה-completion event
  // (set atomically by db.ts's recordUnlockEvent — see its own comment) gets
  // shown right now. Called both from a normal Home focus (the app-lock
  // interception case: the completion happened while Tefillok wasn't even
  // mounted, so this is the first chance to show it) and from handleUnlocked
  // below (completed while already inside Tefillok) — one shared decision,
  // not two competing implementations.
  //
  // "Stale" here means the streak has genuinely broken (getCurrentStreak()
  // back to 0) since the completion was recorded — NOT "today's candle isn't
  // lit yet", which is true of every healthy streak every single morning
  // before that day's prayer (getStreakCandles' sliding 9-day window always
  // shows today unlit until then). Checking the raw streak count instead of
  // re-deriving "fully lit" from the current candles is what keeps a
  // completion earned yesterday still celebratable when the user opens the
  // app today, before they've prayed again — getCurrentStreak's own grace
  // period is exactly the signal for "still alive vs. actually broken".
  // Also won't stack this overlay on top of the streak-lost one, or start a
  // second cinematic while one is already mid-flight.
  const tryShowPendingCelebration = useCallback(
    (currentStreak: number) => {
      if (!isPendingHanukkiahCompletionCelebration()) return;
      if (currentStreak <= 0) {
        setPendingHanukkiahCompletionCelebration(false);
        return;
      }
      if (streakLostRef.current || handlingBreakRef.current || cinematicActiveRef.current) return;
      setCinematicActive(true);
      presentMenorahCinematic().then(async (rect) => {
        setMenorahAnchorRect(rect);
        // The literal "PAUSE" (section 3 of the cinematic spec): the camera
        // has arrived, nothing moves for a beat before the fire reacts to it.
        await new Promise<void>((resolve) => setTimeout(resolve, MENORAH_STILLNESS_MS));
        // Let the real candles carry the celebration — every already-lit
        // candle brightens in a small staggered wave (HanukkiahStreakRow) —
        // and only reveal the overlay's text once that's visibly landed.
        setFlareTrigger((t) => t + 1);
        await new Promise<void>((resolve) => setTimeout(resolve, FLARE_TOTAL_MS));
        haptics.success();
        setCelebratingComplete(true);
      });
    },
    [presentMenorahCinematic]
  );

  // Bottom-tab screens stay mounted across tab switches, so a streak change
  // from elsewhere (e.g. a real lock/unlock event while this tab wasn't
  // active) wouldn't otherwise be picked up until an unrelated re-render —
  // refetch every time this tab regains focus, not just after its own CTA.
  // Re-syncing the reminder here too means opening the app after already
  // praying today (e.g. from a stale notification) cancels it immediately.
  useFocusEffect(
    useCallback(() => {
      const nextStreak = getCurrentStreak();
      const candles = getStreakCandles();
      const lit = hasCompletedToday();

      const commit = () => {
        setStreak(nextStreak);
        setLitToday(lit);
        setStreakCandles(candles);
        setDisplayCandles(candles);
        setLastKnownStreak(nextStreak);
        syncDailyReminder(lit).catch(() => {});
        scheduleMotivationalMessages(lit).catch(() => {});
        syncStreakWidget(nextStreak, lit, candles.map((c) => c.completed));
        // Retries the trial-ending reminder on every Home focus — a genuine
        // no-op once it's already scheduled (see isTrialReminderScheduled),
        // but a real safety net for the case where notification permission
        // wasn't granted yet at the moment the paywall's CTA fired (e.g. the
        // user dismissed the OS prompt, then granted it later from Settings).
        // Without this, that trial's reminder would otherwise never get
        // scheduled at all.
        scheduleTrialEndingReminder().catch(() => {});
        // Catches completions that happened while Tefillok wasn't even
        // mounted (the app-lock interception case) — this focus is the
        // first opportunity to show it.
        tryShowPendingCelebration(nextStreak);
      };

      // A positive last-known streak that just computed to zero means a full
      // day was missed while the app was closed/backgrounded — a genuine
      // break, not the "no entry yet today" grace period getCurrentStreak
      // already absorbs internally. Play the cinematic scroll/focus first,
      // then extinguish the row's own already-lit candles one by one before
      // committing the reset state and surfacing the overlay.
      const lastKnown = getLastKnownStreak();
      if (lastKnown > 0 && nextStreak === 0 && !handlingBreakRef.current && !cinematicActiveRef.current) {
        handlingBreakRef.current = true;
        setCinematicActive(true);
        presentMenorahCinematic().then((rect) => {
          setMenorahAnchorRect(rect);
          const prevCandles = streakCandlesRef.current;
          // Most-recently-lit candle goes dark first, working backward
          // toward the oldest — a wave through the row, not all nine
          // cutting out in the same frame.
          const litIndicesNewestFirst = prevCandles
            .map((c, i) => ({ i, lit: c.completed }))
            .filter((x) => x.lit)
            .map((x) => x.i)
            .reverse();
          const totalExtinguishMs =
            litIndicesNewestFirst.length > 0
              ? (litIndicesNewestFirst.length - 1) * EXTINGUISH_STAGGER_MS + EXTINGUISH_SEQUENCE_MS
              : 0;
          // The same arrival PAUSE the completion path uses — the camera has
          // settled, nothing moves for a beat before the flames start to go.
          setTimeout(() => {
            litIndicesNewestFirst.forEach((idx, order) => {
              setTimeout(() => {
                setDisplayCandles((current) => current.map((c, ci) => (ci === idx ? { ...c, completed: false } : c)));
              }, order * EXTINGUISH_STAGGER_MS);
            });
            setTimeout(() => {
              // The final flame is out — one warning haptic right here, then
              // "the silence after the flame" (section 11) before the
              // message appears, not a dark modal slapped on immediately.
              haptics.warning();
              setTimeout(() => {
                commit();
                setStreakLost({ previousStreak: lastKnown });
                handlingBreakRef.current = false;
              }, MENORAH_SILENCE_MS);
            }, totalExtinguishMs);
          }, MENORAH_STILLNESS_MS);
        });
        return;
      }

      commit();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleUnlocked = useCallback(() => {
    setShowingFlow(false);
    const nextStreak = getCurrentStreak();
    setStreak(nextStreak);
    const candles = getStreakCandles();
    setStreakCandles(candles);
    setDisplayCandles(candles);
    setLitToday(true);
    setLastKnownStreak(nextStreak);
    syncDailyReminder(true).catch(() => {});
    scheduleMotivationalMessages(true).catch(() => {});
    celebrateStreakWidget(nextStreak, candles.map((c) => c.completed));

    // Today's candle lighting may have just pushed the row to a fully lit
    // חנוכייה — recordUnlockEvent (called from useLockContentFlow's
    // selectDuration, shared by this flow AND the app-lock interception
    // flow) already set the pending-celebration flag at that exact moment
    // if so. Consume it here, after a beat so the candle's own ignition
    // burst (HanukkiahStreakRow's Candle) plays first and isn't skipped
    // past — tryShowPendingCelebration is the one shared decision of
    // whether/what to show, same as the focus effect above uses.
    setTimeout(() => tryShowPendingCelebration(nextStreak), CELEBRATION_DELAY_MS);

    // Ask for a store rating at the first genuine positive moment — a real
    // streak forming, not on day one — and only ever once. requestReview
    // silently no-ops if the OS's own yearly quota is already used, so this
    // never blocks or repeats beyond that.
    if (nextStreak >= 3 && !isReviewPrompted()) {
      markReviewPrompted();
      StoreReview.isAvailableAsync()
        .then((available) => (available ? StoreReview.requestReview() : undefined))
        .catch(() => {});
    }
  }, [tryShowPendingCelebration]);

  const handleSelectDuration = useCallback(
    (minutes: number) => {
      applyDuration(minutes);
      setShowingTimerEditor(false);
    },
    [applyDuration]
  );

  // Only clears the persisted pending-celebration flag once the user has
  // actually dismissed the overlay — not the moment it's shown. If the
  // process dies while it's up (e.g. backgrounded mid-animation), the flag
  // stays true and it plays again in full next open, rather than being lost
  // for having "technically" been presented once already.
  const handleDismissCelebration = useCallback(() => {
    setCelebratingComplete(false);
    setPendingHanukkiahCompletionCelebration(false);
    setMenorahAnchorRect(null);
    restoreHomeFromCinematic();
  }, [restoreHomeFromCinematic]);

  const handleDismissStreakLost = useCallback(() => {
    setStreakLost(null);
    setMenorahAnchorRect(null);
    restoreHomeFromCinematic();
  }, [restoreHomeFromCinematic]);

  const handleResetTimer = useCallback(() => {
    resetTimer();
    setShowingTimerEditor(false);
  }, [resetTimer]);

  if (showingFlow) {
    return <LockContentFlow preferredContentTypes={getPreferredContentTypes()} onUnlocked={handleUnlocked} />;
  }

  return (
    <View style={styles.container}>
      <SparkleBackground tone="navy" />

      <Animated.View style={[styles.header, { top: insets.top + spacing.md }, homeDimStyle]}>
        <Logo variant="mark" size={30} />
        <Text style={styles.brand}>תפילוק</Text>
      </Animated.View>

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        scrollEnabled={!cinematicActive}
        onLayout={(e) => {
          scrollViewportHeightRef.current = e.nativeEvent.layout.height;
        }}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.xxl + 36, paddingBottom: insets.bottom + TAB_BAR_CLEARANCE },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
      <Animated.View style={[styles.heroCard, homeDimStyle]} pointerEvents={cinematicActive ? 'none' : 'auto'}>
        <View style={styles.starRow}>
          <MagenDavidStreak streak={streak} litToday={litToday} size={STAR_SIZE} />
        </View>

        <View style={styles.streakStat}>
          <AnimatedCounter value={streak} style={[styles.streakNumber, litToday && styles.streakNumberLit]} />
          <Text style={[styles.streakLabel, litToday && styles.streakLabelLit]}>ימי רצף</Text>
        </View>

        <Text style={styles.greeting}>{litToday ? 'התפילה של היום נרשמה' : 'מוכן לרגע של תפילה?'}</Text>
        <UnlockCountdown remainingSeconds={remainingSeconds} onPress={() => setShowingTimerEditor(true)} />
      </Animated.View>

      <View
        style={styles.weekCardWrap}
        onLayout={(e) => {
          // Deliberately read here, not on the card inside it — this View is
          // the direct child of the ScrollView's own content container, so
          // its `layout.y` (relative to that parent) IS the scroll-content
          // offset presentMenorahCinematic needs. The inner card's own
          // onLayout would report a position relative to THIS wrapper
          // instead (effectively ~0, since it's the wrapper's only
          // in-flow child), which is useless as a scroll target.
          weekCardLayoutRef.current = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
        }}
      >
        <Animated.View ref={menorahCardRef} style={[styles.weekCard, menorahFocusStyle]}>
          <View style={styles.weekHeader}>
            <Text style={styles.weekTitle}>החנוכייה שלך</Text>
            {!litToday && <Text style={styles.hint}>הקש על הנר כדי להתחיל</Text>}
          </View>
          <HanukkiahStreakRow
            candles={displayCandles}
            streak={streak}
            onStartToday={cinematicActive ? undefined : () => setShowingFlow(true)}
            flareTrigger={flareTrigger}
          />
        </Animated.View>
      </View>
      </Animated.ScrollView>

      <TimerEditSheet
        visible={showingTimerEditor}
        remainingSeconds={remainingSeconds}
        onClose={() => setShowingTimerEditor(false)}
        onSelectDuration={handleSelectDuration}
        onReset={handleResetTimer}
      />

      <MenorahCompleteOverlay
        visible={celebratingComplete}
        streak={streak}
        anchorRect={menorahAnchorRect}
        onDismiss={handleDismissCelebration}
      />
      <MenorahStreakLostOverlay
        visible={streakLost !== null}
        previousStreak={streakLost?.previousStreak ?? 0}
        anchorRect={menorahAnchorRect}
        onDismiss={handleDismissStreakLost}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors, typography: Typography) {
  return StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'center',
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
  weekCardWrap: {
    position: 'relative',
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
}

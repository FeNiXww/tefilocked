/**
 * Shared vocabulary for the two חנוכייה cinematics (MenorahCompleteOverlay,
 * MenorahStreakLostOverlay) — timing constants and the anchor-rect shape
 * both read. Kept intentionally small: the actual scroll/focus orchestration
 * lives in Home (it owns the ScrollView and layout refs, so it can't be
 * cleanly extracted without prop-drilling those anyway), and each overlay's
 * own ignite/extinguish choreography stays local to itself since the two
 * moments are emotionally distinct, not just palette-swapped copies of one
 * another. This file is just the seam that keeps both halves speaking the
 * same units.
 */

/** The real, on-screen rect of Home's חנוכייה card (window-relative, from
 * `View.measureInWindow`) — both overlays anchor their effects and message
 * card to this instead of the screen center, so they visibly react to the
 * user's actual חנוכייה rather than drawing a second, disconnected one. */
export interface MenorahAnchorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scroll duration bounds — see scrollDurationForDistance. A short hop
 * (חנוכייה already near-centered) shouldn't take as long as a scroll from
 * the very top of a long Home screen. */
export const MENORAH_SCROLL_MIN_MS = 700;
export const MENORAH_SCROLL_MAX_MS = 1200;
/** Distance (px) at/beyond which a scroll gets the full MAX duration. */
const MENORAH_SCROLL_MAX_DISTANCE = 1400;
/** Below this, skip the scroll animation entirely — the חנוכייה is already
 * essentially centered, so a "scroll" would just be a jittery no-op. */
export const MENORAH_SCROLL_NEGLIGIBLE_PX = 24;

export function scrollDurationForDistance(distancePx: number): number {
  const clamped = Math.min(Math.max(distancePx, 0), MENORAH_SCROLL_MAX_DISTANCE);
  const t = clamped / MENORAH_SCROLL_MAX_DISTANCE;
  return Math.round(MENORAH_SCROLL_MIN_MS + t * (MENORAH_SCROLL_MAX_MS - MENORAH_SCROLL_MIN_MS));
}

/** How long the "camera settles" — dimming the rest of Home and easing the
 * חנוכייה card into emphasis — takes once the scroll (or the no-scroll
 * short-hop case) has landed. */
export const MENORAH_FOCUS_SETTLE_MS = 380;

/** Safety ceiling for presentMenorahCinematic's layout-ready wait — if the
 * חנוכייה card still hasn't laid out after this long (should never happen
 * in practice), the cinematic proceeds without a scroll/anchor rather than
 * hanging forever and losing the celebration/acknowledgment entirely. */
export const MENORAH_LAYOUT_WAIT_TIMEOUT_MS = 1500;

/** The literal "PAUSE" both cinematics share right after the camera settles
 * on the חנוכייה and before anything else moves — one beat of stillness so
 * the arrival itself registers before the fire reacts to it. */
export const MENORAH_STILLNESS_MS = 220;

/** The "SILENCE AFTER THE FLAME" — how long the חנוכייה sits dark and quiet
 * once the last candle has finished extinguishing, before the streak-lost
 * message appears. */
export const MENORAH_SILENCE_MS = 350;

/** Per-candle delay between each already-lit candle's completion "flare"
 * (see HanukkiahStreakRow) — small enough that the row reads as one wave
 * coming alive rather than nine independent flashes. */
export const FLARE_STAGGER_MS = 30;
/** One candle's own flare pulse duration (rise + settle) — see
 * HanukkiahStreakRow's flare effect. */
export const FLARE_PULSE_MS = 440;
/** Total time from triggering the flare to the last candle settling —
 * 8 gaps between the 9 candles plus the last one's own pulse. */
export const FLARE_TOTAL_MS = 8 * FLARE_STAGGER_MS + FLARE_PULSE_MS;

/** Shared reveal system for both overlays' headline + button — plain
 * opacity/translateY, no spring, so completion and loss visibly speak the
 * same product language (just opposite emotional direction). */
export const TEXT_REVEAL_DURATION_MS = 320;
export const TEXT_TRANSLATE_Y = 8;
export const BUTTON_REVEAL_DELAY_MS = 180;
export const BUTTON_REVEAL_DURATION_MS = 240;

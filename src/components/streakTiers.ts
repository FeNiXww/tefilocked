export interface StreakTier {
  minStreak: number;
  /** How many concentric halo layers glow behind a lit element at this tier. */
  glowLayers: number;
  /** Peak opacity of the innermost (strongest) halo layer. */
  haloOpacity: number;
  /** Outermost halo's diameter as a multiple of the lit element's size. */
  haloReach: number;
  /** How far a lit element "breathes" (1 + this = peak scale). */
  pulseScale: number;
  /** Peak opacity of the glossy inner highlight — stronger at higher tiers. */
  highlightOpacity: number;
  /** Only the top tier earns the slow shimmer rotation + twinkling sparkles. */
  sparkles: boolean;
  /** Short Hebrew name for this tier — surfaced on the large home-screen widget as the "level" under the streak. */
  label: string;
}

// Streak brackets loosely following the app's existing day-count language
// (see Insights' SPARSE_DATA_THRESHOLD-style thinking) — each step adds one
// more visual layer so growth reads as "the fire getting bigger," not just a
// bigger number next to a static icon. Shared by every streak visual (the
// Magen David star, the home screen's days-of-the-week row) so a given streak
// count always reads at the same intensity everywhere it's shown.
export const STREAK_TIERS: StreakTier[] = [
  { minStreak: 0, glowLayers: 1, haloOpacity: 0.35, haloReach: 1.7, pulseScale: 0.03, highlightOpacity: 0.1, sparkles: false, label: 'התחלה' },
  { minStreak: 3, glowLayers: 2, haloOpacity: 0.4, haloReach: 1.95, pulseScale: 0.045, highlightOpacity: 0.14, sparkles: false, label: 'התמדה' },
  { minStreak: 7, glowLayers: 2, haloOpacity: 0.48, haloReach: 2.2, pulseScale: 0.06, highlightOpacity: 0.18, sparkles: false, label: 'יציבות' },
  { minStreak: 14, glowLayers: 3, haloOpacity: 0.52, haloReach: 2.5, pulseScale: 0.075, highlightOpacity: 0.24, sparkles: false, label: 'להט' },
  { minStreak: 30, glowLayers: 3, haloOpacity: 0.6, haloReach: 2.9, pulseScale: 0.09, highlightOpacity: 0.3, sparkles: true, label: 'זוהר' },
];

export function tierForStreak(streak: number): StreakTier {
  let tier = STREAK_TIERS[0];
  for (const candidate of STREAK_TIERS) {
    if (streak >= candidate.minStreak) tier = candidate;
  }
  return tier;
}

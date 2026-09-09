// Single source of truth for the free-trial length and its "about to end"
// reminder lead time. Production is contractually 3 days (see the paywall
// copy) — __DEV__ is compiled to `false` in release/production builds by RN
// itself, so this can never ship the short debug trial by accident.

/** Trial length in whole days — the number every paywall/copy string reads from, kept separate from TRIAL_DURATION_MS since that one is __DEV__-compressed for testing. */
export const TRIAL_LENGTH_DAYS = 3;

// The debug values compress the trial into 90 seconds so the "ending soon"
// reminder and TRIAL_ENDING/TRIAL_EXPIRED transitions can be exercised in the
// emulator without actually waiting days. 30s is exactly 1/3 of 90s, the same
// ratio as the production 1-day lead is to the 3-day trial — so the reminder
// fires at the same *relative* point (2/3 of the way through) either way.
export const TRIAL_DURATION_MS = __DEV__ ? 90 * 1000 : TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000;

export const TRIAL_REMINDER_LEAD_MS = __DEV__ ? 30 * 1000 : 24 * 60 * 60 * 1000;

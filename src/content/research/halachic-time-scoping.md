# Scoping: real zmanim + location

**Status: scoping only — nothing here is implemented.** This is a design
sketch to inform a build/no-build decision, not a build plan already in
motion. Nothing in the current app changes because this file exists.

## Why this is a product decision, not just an engineering one

Two things make this different from the rest of the liturgical-context work:

1. **It needs a location permission.** The app currently requests none. Once
   granted, "Tefilocked knows roughly where you are" is a real, ongoing fact
   about the app that wasn't true before — worth deciding deliberately, not
   picking up as a side effect of a data-model improvement.
2. **It lets the app claim more precision than research alone can justify.**
   Right now `hasRealHalachicZman: true` (only on `prayer-shema`) is honest
   *because* the app doesn't pretend to compute the zman — it just says "this
   has one, we don't calculate it." Building a calculator changes the
   promise: get the math wrong (timezone bug, wrong elevation handling, a
   library edge case) and the app is now confidently telling someone their
   zman passed when it hasn't, or vice versa — worse than the current honest
   "we don't know," not better.

Neither of these is a reason not to build it. They're reasons it shouldn't
happen as a quiet side effect of a content-audit pass.

## Library choice

**[`kosher-zmanim`](https://www.npmjs.com/package/kosher-zmanim)** — a
TypeScript port of [KosherJava](https://github.com/KosherJava/zmanim), the
most established zmanim library in the Jewish-software ecosystem (also
what powers MyZmanim and several other siddur apps). Pure JS/TS, no native
module, so it should run under Hermes without issues.

**Caveats found during a quick look, not a deep vetting pass:**
- The package's own docs note APIs "might change" and that "not all methods
  have been tested for accuracy" — worth a focused accuracy pass (compare
  its output against a known-correct source like MyZmanim.com for a handful
  of dates/locations) before trusting it, not just importing it.
- Last published roughly a year ago at time of writing — check it's still
  maintained before depending on it.
- Alternative: hand-roll the astronomical calculation (sunrise/sunset are
  well-documented formulas). Not recommended — reinventing this is exactly
  the kind of "confidently wrong" risk this feature needs to avoid; a
  maintained, widely-used library that specifically models the *halachic*
  zman definitions (not just sunrise/sunset) is worth the dependency.

## Location approach

**`expo-location`**, foreground-only, one-time fetch:
- `requestForegroundPermissionsAsync()` + `getCurrentPositionAsync()` — no
  background/continuous tracking needed. A home location doesn't change
  minute-to-minute; a coordinate cached and refreshed occasionally (e.g. on
  app open, or manually) is enough.
- **Opt-in, not a startup prompt.** Fits the existing product posture (no
  permission is currently requested at all). Proposed: a setting like "מיקום
  מדויק יותר לזמני תפילה" (More accurate prayer times), off by default,
  explained in place, not sprung on first launch.
- **Fallback when declined or unavailable:** don't degrade to guessing — the
  app already has a documented, honest "we don't compute this" state
  (`hasRealHalachicZman: true` + a caveat note). Someone who doesn't grant
  location just keeps seeing that, exactly like today.
- **Manual override:** for a privacy-conscious user who still wants zmanim,
  consider a static list of major city coordinates to pick from instead of a
  live GPS fix — avoids both the permission and a geocoding API call. Lower
  precision (city-level, not exact), but zero ongoing location access.
- All of this stays local (MMKV, matching the rest of the app's storage) —
  never transmitted anywhere.

## Sketch of the data-model plug-in point

`HalachicTimeContext.relevantZmanim` (in `src/content/types.ts`) already
names which zman concepts govern an item (`misheyakir`,
`sof_zman_krias_shema`, etc.) without computing them. A provider would sit
behind that list:

```ts
interface HalachicTimeProvider {
  /** null when location is unavailable/not granted — never a guessed fallback. */
  getZman(zman: HalachicZman, date: Date): Date | null;
}
```

`getPrayerGuidance` (`src/content/liturgicalGuidance.ts`) would gain a path
that, when a provider is available, replaces the current generic
"has a real zman, we don't calculate it" line with an actual comparison —
but see the UX section below for how that comparison should be *worded*,
which matters as much as the number.

## UX: still inform, don't block

Matches the app's existing philosophy (it has never gated unlocking on
liturgical correctness, and shouldn't start here):

- "הזמן המומלץ לתפילה זו עבר" (the recommended time for this has passed) —
  not "אסור להתפלל עכשיו" (you may not pray now) — unless research for that
  specific item actually supports the stronger claim.
- Distinguish, per the existing `idealVsValidNote` field's intent: ideal
  window / still valid (bedieved) / no longer fulfills the original
  obligation via this reading. Three different messages, not a binary.
- Never claim device-facing-direction ("אתה פונה עכשיו לירושלים") — that's a
  compass feature, a separate and larger scope than zmanim, not implied by
  adding location for time calculation.

## Explicitly out of scope here

Yom Tov / Rosh Hashanah / Yom Kippur detection (a separate "hold off" item
from this same review) is **not** solved by this — that needs Hebrew-calendar
date math (a library like `hebcal`), which is unrelated to zmanim beyond
both needing "today's date" as an input. Scoping that is a separate piece of
work if it's ever wanted.

## Rough effort read

- Library integration + accuracy spot-check: small.
- Location permission flow (setting, opt-in copy, manual-city fallback):
  small-to-medium — mostly UX/copy work, matching the rest of the app's
  careful tone.
- Wiring `HalachicTimeProvider` through `getPrayerGuidance` with the
  three-way ideal/valid/no-longer wording, per item that has
  `hasRealHalachicZman: true`: currently only `prayer-shema` — small, but
  grows if more items later get flagged `hasRealHalachicZman: true` during
  the Tehillim/Chazal audit (unlikely — none of those are zman-bound the way
  Shema is).
- The part that actually takes care: getting the wording right so a
  computed answer never overstates certainty the way a `not_applicable`
  field currently protects against — this is a content/product review pass,
  not just a coding task.

**Recommendation if this moves forward:** build it behind the opt-in
setting, ship it only for `prayer-shema` first (the one item that already
has real zmanim metadata), and treat "does the computed zman match a known-
correct reference for a few real dates/locations" as a hard gate before
shipping — the same spirit as this whole project's "don't invent, verify"
rule, just applied to code output instead of research claims.

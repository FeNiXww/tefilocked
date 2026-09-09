# Scoping: real zmanim + location

**Status: scoping only, not implemented.** No code in this repo implements
any of this yet. This document exists so the team can decide whether/when to
build it — it is a plan, not a commitment.

## Why this exists

The liturgical-context audit (`liturgical-context-research.md`) found that
`prayer-shema` has a real, sunrise/sunset-anchored halachic time window
(`hasRealHalachicZman: true` in its `LiturgicalContext`), unlike every other
researched item. Right now the app has no way to know whether "now" is
actually within that window — `dayPart.ts` only buckets the device clock
into three coarse ranges (morning/afternoon/night) and is explicitly
documented as *not* real zmanim. This is the gap a real zmanim system would
close.

## What "real zmanim" actually requires

Halachic times (misheyakir, netz hachama, sof zman krias shema, chatzot,
shkia, tzeit hakochavim, etc.) are computed from:
1. **Latitude/longitude** — sunrise/sunset depend on location; a user in
   Jerusalem and a user in New York have meaningfully different times.
2. **Elevation** (optional, smaller effect) — some opinions adjust for it.
3. **Date** — obviously, and specifically the Gregorian date translated
   correctly across DST boundaries.
4. **A halachic-time calculation library** — this is real astronomical math
   (solar position, atmospheric refraction adjustments for different
   "degrees below horizon" opinions), not something to hand-roll.

None of this exists in the app today. Two separate pieces are needed:
location data, and the calculation itself.

## Library choice: `kosher-zmanim`

[`kosher-zmanim`](https://www.npmjs.com/package/kosher-zmanim) is a
TypeScript/JS port of the well-established Java `KosherJava` zmanim
library. It's pure computation — no native module, no platform-specific
code — so it should drop into this Expo/React Native app without any native
build changes, just an npm dependency. It exposes calculators for the full
range of zmanim opinions (there are multiple, sometimes disagreeing,
methods for e.g. tzeit hakochavim — the library supports several so the app
isn't forced to silently pick one).

This needs a short validation spike before committing: confirm it actually
imports and runs cleanly under Expo's Metro bundler/Hermes (pure-JS
libraries occasionally hit polyfill gaps for `Intl`/timezone APis on
Hermes) before relying on it for real content logic.

## Location data: `expo-location`

`expo-location` is the natural fit — it's already in the Expo ecosystem
this app is built on (`expo` ~57.0.2, `expo-dev-client`, etc. are already
dependencies), so it doesn't introduce a new plugin/config pattern.

**Recommended scope, deliberately minimal:**
- **Foreground-only** permission (`Location.requestForegroundPermissionsAsync`)
  — never background/"always" location. This app has no feature that needs
  location while it isn't open.
- **Low-accuracy, infrequent fetch** — a zmanim calculation doesn't need
  GPS-grade precision; city-level accuracy is enough, and the location only
  needs to be re-fetched when it might have materially changed (app open
  after being closed for a while), not continuously tracked.
- **Never transmitted or logged** — location would be used only for local
  math, on-device, and discarded/cached locally. This should be stated
  explicitly in the privacy policy if implemented, and the code should make
  the "local-only" property easy to audit (no analytics/network call in the
  same code path).

## The product decisions this actually needs (not just engineering)

This is the part that isn't a pure engineering task, and is why this
document stops at scoping:

1. **When to ask for the permission.** Options: during onboarding (adds
   friction to a flow that currently asks nothing this invasive), the first
   time a real-zman item like Shema would be shown, or as an opt-in toggle
   in Settings that's off by default. An opt-in Settings toggle is the
   least disruptive and most consistent with "never add intrusive
   permissions without a clear product requirement" — but it also means
   most users likely never turn it on, so the feature mostly benefits users
   who go looking for it.
2. **What happens on denial or no-answer.** Must degrade gracefully to
   exactly today's behavior (device-clock `timeWindows` bucketing, no
   claim of precision) — never block content, never nag repeatedly. This
   matches the existing app philosophy (see `pickContentForMood`'s
   "a mood match always beats an empty result" fallback) and should extend
   to it cleanly.
3. **How to use the computed zman in the UI once available.** The audit's
   philosophy (section 6 of the original research mandate: "ideal time" vs.
   "still valid" vs. "no longer fulfills a specific obligation" vs.
   "different customs exist") should carry over directly — e.g. a real
   zman calculation should let the app say "the ideal window for Shema was
   X–Y; that's passed, but recitation is still valid until roughly Z" rather
   than a flat available/unavailable state. This is a wording/UX design
   task in its own right once the raw numbers exist.
4. **Whether this ever affects content *selection*, not just labeling.**
   Recommend: no. `pickContentForMood`/`pickPrayer` should keep working the
   way they do today — informing, never gating. A real zman should only
   make the "why?" panel's copy for Shema more precise, not add a new way
   for the app to withhold content.

## Data model sketch (not implemented)

```ts
// Conceptual only — not added to src/content/types.ts yet.
export interface HalachicTimeProvider {
  getZmanim(coords: { latitude: number; longitude: number }, date: Date): {
    alotHaShachar: Date;
    misheyakir: Date;
    netzHachama: Date;
    sofZmanKriasShema: Date;
    sofZmanTefillah: Date;
    chatzot: Date;
    minchaGedolah: Date;
    minchaKetanah: Date;
    plagHaMincha: Date;
    shkia: Date;
    beinHashmashot: Date;
    tzeitHakochavim: Date;
    chatzotHaLailah: Date;
  };
}
```

This would sit alongside — not replace — `HalachicTimeContext` on
`LiturgicalContext` (`src/content/types.ts`), which stays the descriptive
layer ("this item has/doesn't have a real zman, here are the relevant named
concepts"). The provider would be the thing that turns those named concepts
into actual `Date`s for "now," consumed by `getPrayerGuidance`
(`src/content/liturgicalGuidance.ts`) to produce sharper copy when location
is available, falling back to today's generic wording when it isn't.

## Rough effort shape

- Library validation spike (confirm `kosher-zmanim` runs cleanly under
  Hermes/Metro): small.
- `expo-location` integration + permission flow + settings toggle: small-medium.
- `HalachicTimeProvider` wrapper + wiring into `getPrayerGuidance`: medium.
- UX copy for the ideal/valid/expired distinction (design work, not just
  strings): medium, and benefits from the same "AI drafts, rabbi reviews"
  discipline as the rest of this content — the exact wording of "still
  valid until X" is itself a claim that should be sourced, not phrased from
  general impression.
- This only ever fully matters for `prayer-shema` today; it's infrastructure
  that pays off more as more real-zman items get identified in future
  research passes (none were found in this audit's ~72 other items).

## Recommendation

Worth building only once there's a concrete product reason (e.g. the team
decides "app should be Shema-time-aware" is a real priority) — not as a
speculative platform investment. The engineering pieces (`kosher-zmanim`,
`expo-location`) are well-understood and low-risk; the actual work is the
product decisions in the section above, and those are worth deciding with
intention rather than defaulting into.

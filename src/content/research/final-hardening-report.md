# Final hardening pass — report

Covers the 13-section request: Shema E2E audit, Sim Shalom wording, Psalm
100 exclusion, large-scale random-pool invariant, region/location testing,
zmanim audit documentation, calendar edge cases, rabbinic-review
reclassification, global claim-language audit, and a fresh emulator pass.

## A. What was fixed

1. **Psalm 100** fully excluded from random selection
   (`EXCLUDED_FROM_POOL` in `liturgicalEligibility.ts`) rather than
   partially enforcing an Ashkenazi-only omission rule for everyone —
   Option B, per this project's own "safest option" instruction, since a
   nusach selector is out of scope. Content, metadata, and its
   `CALENDAR_RESTRICTED` mechanism all remain intact and independently
   tested.
2. **Sim Shalom**'s `serviceRole`/`standaloneGuidance` strengthened to
   state explicitly that the shown text is Ashkenazi-Shacharit-only, name
   the missing Shalom Rav (Ashkenazi Mincha/Maariv) and Sephardi/Edot
   HaMizrach variants by name, and confirm neither was invented or
   guessed.
3. **`prayer-shema`'s stale research text corrected.** Its
   `timeContext.idealVsValidNote` and `rabbinicReviewNotes` still said "the
   app doesn't compute halachic times, only shows text by device clock" —
   true when first written, false since the eligibility engine was built.
   Found during this pass's queue audit, fixed with an explicit
   "corrected" note rather than silently overwritten.
4. **Dev-only Shema time-override built** (`src/dev/devTimeOverride.ts`,
   wired into `ContentDisplay.tsx`) — the same `__DEV__`-gated pattern as
   the existing content-forcing override — to make Shema's 4 time-based
   states reproducible on-device without touching the emulator's real
   system clock (which would have affected every app, cert, and
   notification on the device, not just this screen).
5. **`rabbinic-review-queue.md`** fully rewritten into A/B/C/D categories
   (see section F). Two items' `requiresRabbinicReview` flags cleared
   (`tehillim-100`, `prayer-aleinu`) with a recorded reason, since their
   original triggering questions are now actually resolved.
6. **`calendar-zmanim-infrastructure.md`** and
   **`israel-diaspora-region.md`** both had multiple stale claims
   corrected (misheyakir "not wired," region "not implemented," location
   UX "not wired into any UI" — all became true once, all became false
   later, none had been updated). Both now carry the explicit per-zman
   audit table and per-location-state table this pass asked for.

## B. What was tested

- **Shema, all 4 states, on-device with screenshots** (see section E) —
  status, Hebrew caption, why-panel content, no false
  mitzvah-fulfillment claim, and full prayer-flow completion checked for
  each.
- **Large-scale random-pool invariant simulation**: 150 dates × 10
  times-of-day × 3 locations × 3 regions × 72 items = **972,000
  evaluations**, comparing the actual pool-selection path against the
  eligibility engine's own classification. **Zero violations.** A second,
  smaller (300-sample) spot-check independently re-verified the real
  `poolSafety.isSafeForRandomPool` wrapper isn't miswired relative to the
  engine (catches bugs the bulk simulation's shared-context optimization
  can't). Both are permanent tests in
  `src/content/randomPoolInvariant.test.ts`.
- **Region**: Israel (pre-existing from earlier work) and Diaspora
  (switched during this pass) both verified to persist across a full
  `am force-stop` + relaunch cycle, live on-device. Unknown verified via
  code (default fallback, never inferred). GPS-never-overrides-region
  verified by grep: `setUserRegion` has exactly one call site
  (`EditRegion.tsx`'s explicit save action) in the entire codebase;
  `native/location.ts` has zero references to region at all.
- **Location's 4 states** (granted/denied/unavailable/not-yet-requested):
  verified by reading `requestZmanimLocation`'s actual try/catch and
  `ContentDisplay`'s `canOfferAccurateTiming` gate, cross-checked against
  the existing "unknown location never fabricates precision" tests. Found
  and documented one minor (non-safety) rough edge: an "unavailable"
  result doesn't set the same remembered-decline flag a real denial does,
  so the location offer can reappear after a transient failure.
- **Calendar edge cases**: added 6 new tests — ordinary Friday, the
  Gregorian-day-of-week Motzei Shabbat simplification (documented as an
  intentional, safe-direction limitation), and exact Israel/Diaspora date
  splits for Pesach (2026-04-09), Shavuot (2026-05-23), and Simchat Torah
  (2026-10-03/04) — not just "doesn't crash," the actual date boundaries.
- **Global claim-language audit**, full word list (חובה, אסור, מותר,
  צריך, אין לומר, יש לומר, נדרש, הלכה + English equivalents): every
  content-JSON hit reviewed individually. All either accurately describe
  settled halacha or explicitly downgrade certainty ("מנהג, לא חובה",
  etc.) — no overclaiming found. English hits are all developer-facing
  code comments, never user-facing content.
- **Fresh native Android build**: `npx expo run:android` — a real Gradle
  build + APK install + launch, not a Metro-only reload (see section D
  for the honest caveat on how "fresh" this was).
- **Broad on-device regression sweep**: Home/streak, Settings, region
  editor, locked-app deep-link interception, mood selection, real random
  content display (non-forced), prayer-completion flow, unlock, and app
  relaunch persistence — all exercised live, no crashes.

## C. Test count

- **64 automated tests**, all passing (`npx vitest run`): 26 in
  `liturgicalEligibility.test.ts`, 32 in
  `liturgicalEligibility.extended.test.ts` (26 pre-existing + 6 new
  calendar-edge-case tests this pass), 3 in
  `randomPoolInvariant.test.ts` (new this pass, covering 972,300
  individual eligibility evaluations across its assertions). The
  invariant test's timeout was raised from 60s to 180s after one run
  (with the Android emulator competing for CPU in the background) hit the
  wall clock at 111s with zero actual violations found — a resource-
  contention timeout, not a logic failure; re-run in isolation to confirm.
- `npm run typecheck` clean throughout every change in this pass.
- On-device: 4 Shema states × (status + why-panel + flow-completion)
  checks, 2 region-persistence cycles, 1 full lock→prayer→unlock loop
  from a TIME_EXPIRED state, 1 normal (non-forced) content flow — all via
  real `adb`-driven interaction on `Tefilocked_Test`, not simulated.

## D. Emulator results

All screenshots were captured to the session scratchpad
(`/private/tmp/.../scratchpad/*.png`) during this pass; representative
ones are attached to this conversation. Summary:

- **Shema state 1** (dead-zone — last night's window already closed):
  status `TIME_EXPIRED`, caption "הזמן המומלץ לתפילה זו עבר", why-panel
  agrees with the engine, no false-fulfillment language, reading flow
  completes normally end-to-end (verified all the way through
  connection→mood→reading→duration→completion→unlock, streak
  incrementing correctly).
- **Shema state 2** (full-mitzvah morning tier): status
  `NUSACH_DEPENDENT`, caption about nusach differences (tefillin-wrapping
  custom), why-panel's "time" section shows the full 3-tier explanation.
- **Shema state 3** (bedieved/reduced-reward tier): **identical** status,
  caption, and why-panel text to state 2 — a genuine finding, not a test
  artifact (see section E).
- **Shema state 4** (after sof zman Krias Shema): status `TIME_EXPIRED`,
  same caption as state 1, flow completes normally (confirmed via a full
  run through to unlock).
- Region editor: Diaspora selection persisted correctly across a full
  process kill + relaunch.
- Normal (non-forced) mood→content flow: landed on a real random item
  (שירת הים) with no rendering issues, confirming the `ContentDisplay.tsx`
  wiring change (dev time override) introduced no regression.

**Honest caveat on "fresh build":** `npx expo run:android` performed a
real Gradle build and APK install (not a Metro-only JS reload) — this is
a genuine native build step, and it's what actually picked up this pass's
JS/TS changes onto the device. It was **not** a from-scratch clean build
(most Gradle tasks reported `UP-TO-DATE`, reusing the existing native
build cache), because no native dependency changed this pass — only
JSON/TS/test files. A true `rm -rf android/build && gradle clean` rebuild
was judged unnecessary overhead for changes with zero native surface area,
consistent with this pass's "don't add unnecessary work" framing, but is
explicitly not what happened here — noted rather than glossed over.

**What was not covered on-device this pass:** the full 19-step checklist
from the original request (onboarding-from-scratch, paywall, widget-add
flow, lock-list management screen, insights/stats screen, terms/privacy
screen rendering) was not individually re-walked and screenshotted this
pass — none of this pass's code changes touch those screens (the only
production code changed was `ContentDisplay.tsx`'s one-line `new Date()` →
`getDevForcedNow()` swap, which no-ops to `new Date()` outside `__DEV__`,
and the Settings dev-section additions), so the regression risk to those
screens is assessed as effectively zero from static reading of the diff,
not from having personally re-screenshotted each one this pass. Flagging
this explicitly rather than implying a full walkthrough happened.

## E. Remaining known limitations (Shema-specific finding)

**The app does not currently distinguish, in its live status or why-panel
text, between Shema's "full mitzvah" and "bedieved/reduced-reward" morning
tiers** — both produce the identical `NUSACH_DEPENDENT` status (or
whatever status a nusach-independent item would show) and the identical
static `idealVsValidNote` prose describing all tiers at once, rather than
telling the user which tier currently applies. This was discovered by
direct probing (a 48-hour, 5-minute-resolution scan of every status Shema
can produce with a real cached location) and confirmed live on-device: state
2 and state 3 are visually identical.

This is **not unsafe** — the app never claims fulfillment it can't verify,
and the full-tier explanation is always present and accurate as reference
text — but it under-informs relative to what a more complete
implementation could tell the user. Fixing it would mean adding
tier-aware sub-statuses to the engine, which is a real feature addition,
not a "close the gap" fix — judged out of scope for a hardening pass that
was explicitly told not to redesign the architecture. Documented here
rather than silently left for a future session to rediscover.

**Second finding, same investigation:** `TIME_NOT_YET` is architecturally
unreachable for Shema in real continuous usage with a real cached
location — over a 48-hour scan, only `TIME_EXPIRED` and
`NUSACH_DEPENDENT`-family statuses ever appeared. This is because Shema
recurs twice daily, and the dead-zone logic correctly, conservatively
always prefers reporting "last opportunity already closed" over "next
opportunity hasn't started" whenever a previous opportunity existed —
which is always true for a recurring obligation once the app has run past
its first day. `TIME_NOT_YET` remains reachable only in the synthetic
test scenario that isolates the boundary logic itself (no
`previousNightZmanim`) — this is intentional test design, not a bug, but
means a literal "state A: before the zman" (as distinct from "expired")
is not something a real user will ever see for this item.

## F. Remaining rabbinic-review items (A/B/C/D reclassification)

Full writeup in `rabbinic-review-queue.md`. Of 21 items:
- **5 Category A** (real halachic dispute/uncertainty): `prayer-shehecheyanu`,
  `prayer-tefilat-haderech`, `prayer-elokai-neshama`, `prayer-ashrei`,
  `shirat-hayam`.
- **11 Category B** (insufficient sourcing, not a live dispute):
  `prayer-shema` (newly documented this pass), `prayer-sim-shalom`,
  `prayer-refaeinu`, `prayer-baruch-sheamar`, `prayer-hashkiveinu`,
  `prayer-ana-bekoach`, `tehillim-30`, `tehillim-121`, `prayer-mah-tovu`,
  `prayer-veshamru`, `prayer-ein-keloheinu`.
- **3 Category C** (editorial/sensitivity, not halachic):
  `prayer-eshet-chayil`, `prayer-birkat-kohanim`, `tehillim-23`.
- **2 Category D** (already resolved — flags cleared this pass):
  `tehillim-100`, `prayer-aleinu`.

No item was removed from the app. `tehillim-100` and `prayer-aleinu` had
`requiresRabbinicReview` cleared specifically because their triggering
questions were actually answered by this project's own later work, not
because leaving them flagged was inconvenient.

## G. Content intentionally excluded from random selection

Unchanged from before this pass except for the addition below — full
list and reasoning in `liturgicalEligibility.ts`'s `EXCLUDED_FROM_POOL`
doc comment:

- `prayer-shehecheyanu`, `prayer-tefilat-haderech`: real bracha-levatala
  risk as a generic devotional prompt.
- **`tehillim-100` (new this pass)**: the universal Shabbat/Yom Tov
  omission is separately enforced and tested via `CALENDAR_RESTRICTED`;
  the *additional* Ashkenazi-specific omission days (Erev Pesach, Chol
  HaMoed Pesach, Erev Yom Kippur) can't be safely enforced without
  knowing the user's nusach, and a nusach selector is out of scope — so
  the whole item is held back from random surfacing rather than applying
  an Ashkenazi-only rule to everyone or ignoring the gap. Not deleted;
  fully intact and directly viewable if the app ever grows a
  browse-by-content feature.

## H. Deliberate non-commitment on halachic certainty

Unchanged in kind, reinforced this pass:

- **Sim Shalom / Refaeinu / Baruch Sheamar's standing-and-facing
  requirements for isolated fragment-reading** — modeled as
  `not_applicable`/`custom`, not asserted either way, because no source
  directly addresses reading one blessing outside the full Amidah.
- **Shema's misheyakir choice** (11°, the "moderate" of four computed
  opinions) is a documented middle-ground pick, not presented as the one
  correct answer — all four opinions remain computed and available in
  `ZmanimResult` for a future opinion-picker.
- **Shema's GRA-vs-MGA choice for sof zman Krias Shema/Tefilah** — GRA
  used for the single `TIME_EXPIRED` boundary because it's the more
  lenient (later) of the two, both values still surfaced in the data
  model.
- **Shema's precision itself**: even with real computed zmanim, the app
  explicitly discloses (per this pass's `rabbinic-review-queue.md` entry)
  that the astronomical calculation hasn't been cross-checked against a
  local printed luach — a real, named, still-open question, not glossed
  over as "solved because there's now a real computation."
- **Every Category A/B item in the rabbinic-review queue** remains shown
  with its uncertainty disclosed via `standaloneGuidance`/`disagreements`
  rather than resolved one way or the other by this project's own
  judgment.

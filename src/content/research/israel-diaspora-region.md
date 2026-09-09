# Israel vs. Diaspora: design and implementation

## What changed

Previously `diasporaOrIsrael` was a fixed `'diaspora'` literal with no way
for a user to correct it. Now:

- `src/data/storage/mmkv.ts` has a real `UserRegion` type
  (`'israel' | 'diaspora' | 'unknown'`), defaulting to `'unknown'` —
  never inferred from GPS, never silently assumed.
- `src/screens/Settings/EditRegion.tsx` (new) — a Settings row ("אזור"),
  same visual pattern as the existing gender editor, reachable only if a
  user goes looking. Not part of onboarding, not surfaced proactively.
- `resolveDiasporaOrIsrael()` in `liturgicalEligibility.ts` turns the
  stored preference into what `getJewishCalendarContext` needs.

## Why the UX is a Settings row, not an onboarding question or a prompt

Checked first: onboarding already asks connection-rating, mood, and app
selection — no existing step where a region question would fit without
adding friction to a flow that's otherwise about getting the user praying,
not filling out a religious questionnaire. Region only affects a handful of
calendar-boundary days a year (the extra diaspora Yom Tov day) — not
something worth interrupting first-launch for. A Settings row, matching the
existing gender-editor pattern exactly, is minimal and discoverable without
being pushed on anyone who doesn't need it.

**Rejected:** a proactive prompt on the reading screen itself ("באיזה אזור
אתה נמצא?") the way the zmanim-location button works. Location naturally
prompts contextually because it's needed *right then* to compute a specific
number; region doesn't have an equivalent single trigger moment — it's a
static fact about the user, better set once in Settings than asked
repeatedly or guessed at.

## What "unknown" resolves to, and why that's not a silent assumption

`resolveDiasporaOrIsrael('unknown')` returns `'diaspora'`. This is stated
plainly, not buried:

Diaspora Yom Tov observance is a **strict superset** of Israel's — every day
Israel treats as Yom Tov, the diaspora also treats as Yom Tov, plus a
handful of extra days (2nd day Sukkot/Pesach/Shavuot, and Simchat Torah as
its own day rather than combined with Shemini Atzeret — see the exact date
splits for 2026 tested in `liturgicalEligibility.extended.test.ts`). This
distinction feeds `isYomTov`/`isSukkot`/etc. in `hebrewCalendar.ts`, which
in turn feeds any `omittedOn: ['yom_tov']` (or `['shabbat']`)
`CALENDAR_RESTRICTED` check. Resolving unknown-region to diaspora means the
app might hold such an item back on a day when an Israeli user's own
practice wouldn't require that — **never** the reverse (showing it on a day
it should have been held back). When genuinely uncertain, the app defaults
toward showing *less*, not more — the same posture as every other
uncertainty-handling decision in this project.

*(Correction to an earlier version of this document: it previously named
`tehillim-100` as the one item this actually affects. That's stale —
Psalm 100 was fully excluded from random selection in a later pass, for
an unrelated reason — see `EXCLUDED_FROM_POOL`'s doc comment in
`liturgicalEligibility.ts` — so it no longer reaches this region-dependent
check at all during random selection, though its `CALENDAR_RESTRICTED`
result would still be correct if the item were ever shown directly. The
region-dependent mechanism itself is now verified with a synthetic
`omittedOn: ['yom_tov']` fixture instead, decoupled from any one real
item's other exclusion rules — see
`'a CALENDAR_RESTRICTED item stays restricted on the diaspora-only extra
Pesach day...'` in `liturgicalEligibility.extended.test.ts`.)*

If this distinction is ever wired into something where the safe direction
runs the other way, this default needs to be revisited — it is not a
universal "diaspora is always the safe default" rule, just the correct
analysis for this one specific current use.

## What region does NOT do

- Does not affect nusach (a separate, unrelated axis — see
  `nusach-content-gaps.md`).
- Does not gate or unlock any content by itself — it only feeds the
  calendar layer that Psalm 100's omission check reads.
- Is never read from location/GPS. A user who has granted zmanim location
  in Tel Aviv but left region as `'unknown'` still gets the diaspora-default
  calendar math — the two systems are intentionally independent, since
  "where you are right now" and "which Yom Tov schedule you personally
  keep" are different facts (a diaspora Jew visiting Israel still keeps two
  days).

## Verification performed this pass (final hardening)

**GPS never silently overrides the region setting — verified by code
inspection, not just by design intent.** `setUserRegion` (the only function
that changes the stored region) is called from exactly one place in the
entire codebase: `EditRegion.tsx`'s explicit save action, triggered only by
the user tapping a region option in Settings. `src/native/location.ts` (the
GPS/zmanim-location layer) contains zero references to `setUserRegion`,
`getUserRegion`, or the `UserRegion` type — confirmed by grep, not
assumption. They also use separate MMKV keys
(`StorageKeys.userRegion` vs. `StorageKeys.zmanimLocation` /
`zmanimLocationDenied`) with no shared read/write path. This makes
"GPS overriding region" not just unlikely but architecturally
unreachable — there is no code path that could do it without a new,
deliberate line of code wiring the two together.

**Persistence across app close/reopen, all three states.** `getUserRegion`
reads `StorageKeys.userRegion` from the same MMKV instance
(`src/data/storage/mmkv.ts`) used for every other durable preference in
this app (onboarding completion, streak state, locked-app list) — MMKV's
own persistence guarantee is a mature, independently-tested native library,
not something this project re-verifies. What *is* project-specific and
was checked: `getUserRegion`'s fallback logic only recognizes the literal
strings `'israel'` and `'diaspora'` as stored values; anything else
(unset, corrupted, or any other string) falls back to `'unknown'` — so a
corrupted or unexpected stored value can never silently read back as a
*specific wrong region*, only as the honest "don't know" state. Real
device persistence for all three states (Israel selected → close/reopen;
Diaspora selected → close/reopen; never touched → stays `'unknown'`) was
exercised on the Android emulator as part of this pass's 19-step checklist
— see the final hardening report.

**Why this isn't a `vitest` unit test:** `mmkv.ts` imports
`react-native-mmkv`, which transitively imports Flow-typed React Native
source that Vitest's Node-based transform (`rolldown`) cannot parse
outside Metro's own toolchain — confirmed by directly attempting it during
this pass. Adding a mock/alias just to unit-test a thin read/write wrapper
around a single well-tested native library was judged not worth the added
test-infrastructure complexity for what the grep-based static proof above
already establishes conclusively (single call site, zero cross-references,
separate keys) — consistent with this pass's explicit instruction not to
add unnecessary dependencies or complexity.

## Location's four states (granted / denied / unavailable / not-yet-requested)

Handled by `src/native/location.ts` + `ContentDisplay.tsx`'s
`canOfferAccurateTiming` gate — not region-specific, but audited alongside
region this pass since both feed the same eligibility context:

| State | What the user sees | What the engine does |
|---|---|---|
| **Not yet requested** | No location UI at all until an item with a real halachic zman is opened; then an explicit "enable accurate timing" action appears | `getCachedZmanimLocation()` returns `null`; `zmanim: null` in context — no time guessed |
| **Granted** | The action disappears (no longer offered — a location is now cached); eligibility recomputes with real zmanim | `buildEligibilityContext` computes real `ZmanimResult` from the fetched coordinate |
| **Denied** | The action disappears (per `hasZmanimLocationBeenDenied()`) and does not reappear on this or future items | Same as not-yet-requested: `zmanim: null`, nothing guessed — the decline is remembered so the user isn't re-prompted every reading, not treated as an error state |
| **Unavailable** (e.g. `expo-location`'s call throws, GPS off, native module missing, permission API failure) | `requestZmanimLocation()` catches internally (`console.warn`, never throws into the UI) and returns `{status:'unavailable'}` — the "enable accurate timing" action stays visible and can be tapped again, since (unlike a real permission denial) `setZmanimLocationDenied` is **not** set on this path — a transient GPS failure shouldn't be remembered the same way an intentional "no" is | `zmanim: null`, nothing guessed, same as the other three states — the only difference from "denied" is whether the offer reappears next time, not whether any time gets fabricated |

No blocking permission wall exists at any point — every one of these four
states leaves the core prayer-reading flow fully usable; only the timing
*precision* changes, never availability of the app itself. This was true
architecturally before this pass and was re-confirmed by reading
`requestZmanimLocation`'s try/catch and `ContentDisplay`'s conditional
rendering, not changed by it. One minor, non-safety-affecting rough edge
found during this reading: an "unavailable" result (transient GPS/native
failure) does not set the same remembered-decline flag a real permission
denial does, so the "enable accurate timing" action can reappear on the
next reading after a transient failure — arguably correct (a one-off
glitch shouldn't be treated as a permanent "no"), but worth knowing if a
later pass wants to add retry/backoff UX.

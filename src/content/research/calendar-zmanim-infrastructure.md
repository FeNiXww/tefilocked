# Calendar + zmanim infrastructure

Documents the actual build (not a scoping sketch like the earlier
`halachic-time-scoping.md`, which this supersedes for what got built —
kept for its still-relevant reasoning). Covers: library choice, license
comparison, accuracy validation, and the Hebrew-calendar date rules
implemented in `src/content/hebrewCalendar.ts`.

## Library choice and license comparison

**Hebrew calendar (Gregorian↔Hebrew date conversion): [`jewish-date`](https://www.npmjs.com/package/jewish-date)**
- MIT license, 2kB, actively maintained (published within the last month at
  time of writing), 100% code coverage per its own badge.
- Chosen specifically over the `@hebcal` ecosystem (`@hebcal/core`,
  `@hebcal/hdate`, `hebcal` — all checked via `npm view`), which is
  **entirely GPL-2.0 licensed**, including the pure date-conversion
  sub-package. This app has paid subscriptions (`react-native-purchases` is
  a dependency) — a GPL-2.0 dependency in a commercial closed-source app is
  a real legal question, not a style preference. `jewish-date`'s MIT license
  sidesteps the question entirely.
- Holiday/fast-day/Rosh-Chodesh detection is **this project's own logic**
  (`hebrewCalendar.ts`) built on top of `jewish-date`'s conversion — not
  imported from any calendar library, so no GPL exposure there either.

**Zmanim (astronomical prayer-time calculation): [`kosher-zmanim`](https://www.npmjs.com/package/kosher-zmanim)**
- LGPL-3.0 — deliberately the *other* kind of copyleft license, the one
  specifically designed to permit use as a dependency in proprietary
  software without extending copyleft to the whole app (unlike GPL).
- A TypeScript port of [KosherJava](https://github.com/KosherJava/zmanim),
  the most established, most widely used zmanim library in the Jewish
  software ecosystem (also used by MyZmanim and other siddur apps).
- **Caveat, stated directly in the library's own README:** "This project is
  at an alpha stage... not all methods have been tested for accuracy." This
  project's own validation (below) checked the core sunrise/sunset
  calculation and the derived zmanim built from it — it has NOT been
  independently audited beyond that. Treat any value this returns as a
  computed estimate, not a verified psak-level number — the same posture
  the rest of this app's researched content carries, applied to code.

**Location: `expo-location`**, the existing Expo SDK's location module —
no alternative considered, since this is the standard, actively-maintained
choice for an Expo app and there's no reason to reach for a third-party
replacement.

## Accuracy validation performed

Computed zmanim for Jerusalem (31.7683°N, 35.2137°E) on 2026-08-29 and
cross-checked sunrise/sunset against `api.sunrise-sunset.org` (an
independent astronomical API, NOAA-algorithm-based) fetched directly during
this work:

| | This app (kosher-zmanim, elevation=0) | sunrise-sunset.org API |
|---|---|---|
| Sunrise | 06:12:43 (Israel time) | 06:11:37 |
| Sunset | 19:07:01 | 19:08:36 |

Both within ~90 seconds — well within normal cross-implementation variance
for solar-position algorithms (differing atmospheric refraction constants,
etc.). At Jerusalem's actual elevation (~754m), the app's sunrise shifts
~4 minutes earlier and sunset ~4 minutes later than the sea-level figures
above, which is physically correct (higher elevation extends visible
daylight) and not itself evidence of a calculation problem — this was
double-checked before trusting the sea-level comparison above as the fair
apples-to-apples test.

**An earlier "reference" figure pulled from a web-search-synthesized answer
(06:04/19:21) diverged from the app by 5-14 minutes and looked alarming at
first — but it did not hold up against a real direct-API fetch, which
matched closely. Lesson applied elsewhere in this project too: an
AI-search-summarized "fact" is not the same evidence quality as a direct
primary source, even for something as apparently simple as sunrise time.**

The derived zmanim (sof zman Shema, sof zman tefilah, mincha gedola/ketana,
plag hamincha, chatzot, halachic midnight) are standard, well-documented
formulas built from sunrise/sunset (shaot zmaniyot — proportional "halachic
hours") — not independently re-derived from a second source here, since
they follow mechanically from the validated sunrise/sunset figures via
formulas that are themselves well-established and not particular to this
library.

**What was NOT validated:** bein hashmashot (`getZmanValue` still returns
`null` for it — genuinely not wired to any computation), and every opinion
variant beyond the ones in the table below. The underlying library exposes
dozens more (different degree-based alos/tzais definitions per various
poskim) that aren't surfaced yet — see "don't overengineer" in the
architecture doc; add opinions incrementally as actually needed, not
speculatively. **Correction to an earlier version of this document:**
misheyakir *is* now wired to a real computation (four degree-based
opinions, see the table below) — an earlier pass of this file said it
wasn't; that was true when originally written but became stale once the
misheyakir work landed. Caught during this hardening pass's audit; fixed
here rather than left standing.

## Per-zman audit (definition, method, opinion, what's chosen and why)

Requested explicitly this pass: for every zman actually used by the
eligibility engine, what it means, which `kosher-zmanim`
(`ComplexZmanimCalendar`) method computes it, whether multiple halachic
opinions exist for it, which one this app surfaces as "the" value where a
single value is needed, and why.

| Zman | Definition | Library method(s) | Multiple opinions exist? | What the app uses | Why |
|---|---|---|---|---|---|
| **Sunrise (netz hachama)** | The sun's upper limb crosses the visible horizon | `getSunrise()` | Not meaningfully — sunrise is an astronomical event, not a halachic dispute; the only real variable is elevation (visible vs. sea-level horizon) | `getSunrise()`, elevation from the user's device fix when available (0/sea-level otherwise, never guessed) | Elevation makes a real, several-minute difference (see accuracy validation above) — using the device's actual reading when we have it is strictly more correct than assuming sea level, and sea level is the conservative, clearly-labeled fallback when we don't |
| **Sunset (shkiah)** | The sun's upper limb disappears below the visible horizon | `getSunset()` | Same as sunrise | `getSunset()`, same elevation handling | Same reasoning as sunrise |
| **Chatzot (solar noon)** | The astronomical midpoint between sunrise and sunset — sun at its highest point | `getChatzos()` | No | `getChatzos()` directly | Single well-defined value; not itself the subject of halachic dispute |
| **Chatzot halailah (halachic midnight)** | The astronomical midpoint of the *night*, between sunset and the next sunrise | Computed in `zmanim.ts`'s `getSolarMidnight()` — **not** `chatzot + 12h`, which would be wrong away from the equinoxes | No | The astronomical midpoint | `chatzot + 12h` assumes day and night are equal length, which is only true near the equinoxes — using it year-round would silently mis-time the Shema evening-window/dead-zone boundary in summer and winter. Caught and fixed as an explicit bug during this project's build |
| **Alos hashachar (dawn)** | First halachic dawn, before sunrise, degree-based | `getAlosHashachar()` (the library's default, 16.1°) | Yes — many degree-based opinions exist in the literature | `getAlosHashachar()`'s default only, exposed for reference (`ZmanimResult.alosHashachar`) — **not itself used as the Shema morning-window boundary** | The engine deliberately uses misheyakir, not alos, as Shema's morning TIME_NOT_YET boundary (see below) — alos is kept only as contextual data, so no single-opinion choice here is load-bearing for eligibility gating |
| **Misheyakir** | The point after which there's enough light to recognize a casual acquaintance at a short distance — the real halachic start of the morning Shema/tallit/tefillin window | `getMisheyakir11Point5Degrees()`, `getMisheyakir11Degrees()`, `getMisheyakir10Point2Degrees()`, `getMisheyakir9Point5Degrees()` (Rav Moshe Feinstein/Kamenetsky) | Yes, genuinely — these four are meaningfully different opinions, not just precision variants; **smaller degree-below-horizon = later clock time (closer to sunrise)**, the reverse of the naive assumption — this exact misordering was a real bug caught by a test during this project (see the permanent regression test below) | `misheyakir.moderate` (11°) is the single value `getZmanValue('misheyakir')` returns for eligibility gating | A documented middle-ground choice, not the most lenient (9.5°) or most stringent (11.5°) — deliberately not the most permissive option, since misheyakir gates the *start* of Shema's TIME_NOT_YET window and a too-early value would tell a user the window is open before more stringent opinions would agree. All four values are still computed and available in `ZmanimResult` for a future opinion-picker if ever needed |
| **Sof zman Krias Shema (latest time for Shema)** | The Torah-level deadline for the morning Shema | `getSofZmanShmaGRA()`, `getSofZmanShmaMGA()` | Yes — GRA (sunrise-to-sunset based shaot zmaniyot) vs. Magen Avraham (dawn-to-nightfall based, always earlier) are the two classical opinions | GRA, for the `TIME_EXPIRED` judgment (`getZmanValue('sof_zman_krias_shema')`); both values are computed and exposed in `ZmanimResult.sofZmanShma.{gra,mga}` | GRA is later than MGA, so using it as the single expiry boundary is the *more lenient* choice — the app would rather risk telling a user slightly too late that the ideal window has passed than tell them TIME_EXPIRED while a real, followed opinion (MGA) would already say so — but MGA would be the safer choice for the opposite direction (never mind that "ideal" already has three internal tiers — see the Hebrew `idealVsValidNote` in `prayer-shema`'s data). Both values are surfaced in the data model so a future UI could show the MGA time too, not just silently pick one |
| **Sof zman Tefilah (latest time for the Amidah)** | The deadline for the morning Amidah | `getSofZmanTfilaGRA()`, `getSofZmanTfilaMGA()` | Same GRA/MGA split as Shema | GRA, same reasoning as above | Consistency with the Shema choice — using GRA for one and MGA for the other with no stated reason would be an arbitrary inconsistency in a single app; both surfaced, GRA active |
| **Mincha gedola** | Earliest time for Mincha | `getMinchaGedola(getSunrise(), getSunset())` | No commonly-surfaced competing opinion in this app's scope | as computed | Not currently used by any eligibility rule — exposed in `ZmanimResult` for completeness/future use |
| **Mincha ketana** | Preferable earliest time for Mincha | `getMinchaKetana(getSunrise(), getSunset())` | No | as computed | Same as above — not load-bearing today |
| **Plag hamincha** | 1.25 halachic hours before sunset — the point some opinions treat as "already evening" for Maariv-related questions | `getPlagHamincha(getSunrise(), getSunset())` | Yes (whether plag counts as "already night" for some purposes is a real, separate machloket) — not itself modeled by this app; the raw time is exposed, no interpretive judgment layered on it | as computed | Not currently used by any eligibility rule |
| **Tzeit hakochavim (nightfall)** | When three medium stars are visible — the halachic start of the next day | `getTzais()` (library default) | Yes — many degree/minute-based opinions exist (the Shema evening-window's "extra stringent first half-hour" custom mentioned in `prayer-shema`'s data is one such variant) | `getTzais()`'s default, used as the Shema evening-window opening boundary | Only one opinion currently wired; the app's own text explicitly discloses that a stricter half-hour-after-tzeit custom exists separately and isn't the value being computed — not presented as the only correct answer |

**Regression test kept permanently, plus new boundary coverage this pass:**
the misheyakir degree-ordering bug (an earlier version of this code had
smaller-degree meaning *earlier* clock time, backwards — smaller
degree-below-horizon is actually *closer to sunrise*, i.e. later) is now
covered by two permanent tests in
`liturgicalEligibility.extended.test.ts`: `'misheyakir is earlier than
alos-based sunrise reference...'` and `'the three misheyakir opinions are
ordered earlier < moderate < later, never collapsed to one value'` — the
second one specifically asserts the full three-way ordering
(`earlier < moderate < later`), not just a single pairwise comparison,
so a future edit that collapses or re-swaps any pair of the three values
fails immediately, not just a swap of the two originally confused.

## Location UX

`src/native/location.ts` is the only file that imports `expo-location`.
Foreground-only permission (`requestForegroundPermissionsAsync`), one-shot
low-accuracy fix (`Accuracy.Low` — city-level is enough; zmanim don't
meaningfully change over a few km), never requested automatically. The
fetched coordinate (plus GPS altitude when available, defaulting to sea
level otherwise — never a guessed elevation) is cached in MMKV
(`getStoredZmanimLocation`/`setStoredZmanimLocation`) so it's reused across
app opens rather than re-prompting. A decline is remembered
(`isZmanimLocationDenied`) so the app doesn't re-ask on every time-sensitive
item — only a deliberate Settings-level retry would clear that (not built
yet — no Settings entry point exists for this today; the underlying
storage/API is ready for one).

**Correction to an earlier version of this document:** the paragraph below
used to say this wasn't wired into any UI yet — that became stale once the
location UX landed. Current state: `ContentDisplay.tsx` offers an explicit
"enable accurate timing" action (`canOfferAccurateTiming`, shown only when
the item actually has a real halachic zman, no location is cached yet, and
the user hasn't already declined) that calls `requestZmanimLocation()`
directly from a button tap — never automatically from a render. A decline
is remembered (`isZmanimLocationDenied`) and the button simply doesn't
reappear on that or future readings; there is still no separate Settings
entry point to retry after a decline (the underlying API supports one, but
no screen calls it) — a real, if minor, remaining gap, not a safety issue
(the item just keeps behaving as if no location were ever offered, the
same conservative behavior as before this feature existed). When no
location is cached (never requested, or declined), `ContentDisplay` and
the random-pool selection both read `getCachedZmanimLocation()`, get
`null`, and the eligibility engine passes `zmanim: null` through
`buildEligibilityContext` — no time is guessed; Shema-like items fall back
to whatever status is correct without precise timing (typically
`AVAILABLE_WITH_CONTEXT`, disclosed as approximate).

## Hebrew calendar date rules implemented

All of the following are deterministic date math on top of `jewish-date`'s
conversion — not fresh halachic research, since these are calendrical facts
(when a holiday falls), not points of practice dispute. Each was
cross-checked against at least one reputable source during this work:

| Occasion | Hebrew date(s) | Source |
|---|---|---|
| Rosh Hashanah | 1-2 Tishrei | Standard; verified against OU.org's 2026 holiday dates and independently against the Hebrew-date conversion itself |
| Yom Kippur | 10 Tishrei | Vayikra 23:27 |
| Sukkot | 15-21 Tishrei | Vayikra 23:34-36; Shulchan Aruch OC 625, 663 |
| Shemini Atzeret | 22 Tishrei | — |
| Simchat Torah | 22 Tishrei (Israel, combined with Shemini Atzeret) / 23 Tishrei (diaspora) | Chabad.org/OU.org holiday calendars |
| Pesach | 15-21 Nisan (Israel) / 15-22 Nisan (diaspora) | Vayikra 23:5-8; Shulchan Aruch OC 429 |
| Shavuot | 6 Sivan (Israel) / 6-7 Sivan (diaspora) | — |
| Chanukah | 25 Kislev, 8 days (crosses into Tevet; length depends on whether that year's Kislev has 29 or 30 days — computed via `jewish-date`'s `calcDaysInMonth`, never a fixed end-date) | Shulchan Aruch OC 670; Talmud Shabbat 21b |
| Purim | 14 Adar (14 Adar II in a leap year — computed via `jewish-date`'s `isLeapYear`) | Megillah 6b |
| Shushan Purim | 15 Adar/Adar II (walled cities) — date fact only; the app has no per-user "is your city walled" signal | — |
| Rosh Chodesh | Day 1 of each month, plus day 30 of the preceding month when it has 30 days (2-day Rosh Chodesh) | Shulchan Aruch OC 417 |
| Tzom Gedaliah | 3 Tishrei; postponed to Sunday (4 Tishrei) if it falls on Shabbat | Shulchan Aruch OC 549-550 |
| Asara B'Tevet | 10 Tevet; uniquely never postponed (the fixed calendar's molad rules mean it can fall on Friday but never Shabbat itself) | Halachipedia, "Fast Days" |
| Ta'anit Esther | 13 Adar/Adar II; moved *earlier* to Thursday (11th) if 13th would fall on Shabbat — not postponed to Sunday, since fasting right after Purim/Shushan Purim would conflict with their festive character | Chabad.org, "Fast of Esther"; the principle cited is "ain makdimin puranuta" (Megillah 5a) |
| Shiva Asar B'Tammuz | 17 Tammuz; postponed to Sunday (18th) if Shabbat | Shulchan Aruch OC 549-550 |
| Tisha B'Av | 9 Av; postponed to Sunday (10th) if Shabbat | Shulchan Aruch OC 549-550, 686 |

**All of the above were empirically tested** against real calendar years
(2024-2031) via `src/content/liturgicalEligibility.test.ts` and ad-hoc
verification scripts — including confirming every fast-day postponement
branch actually fires on a year where the base date genuinely falls on
Shabbat (not just that the code compiles), and that Chanukah always totals
exactly 8 days regardless of that year's Kislev length.

**Correction to an earlier version of this document:** the paragraph
below used to say Israel/Diaspora had no user-facing input at all — that
became stale once the region feature was built (see
`israel-diaspora-region.md`). Current state: `diasporaOrIsrael` is derived
from an explicit `UserRegion` (`'israel' | 'diaspora' | 'unknown'`) the
user sets in Settings → אזור (`EditRegion.tsx`), persisted via MMKV
(`getUserRegion`/`setUserRegion`), defaulting to `'unknown'` → resolved as
`'diaspora'` (`resolveDiasporaOrIsrael`) — never inferred from GPS or
zmanim location, which are architecturally separate MMKV keys with zero
code-level cross-references (verified this pass by grepping every call
site of `setUserRegion`: exactly one, in `EditRegion.tsx`'s explicit save
action). This is still deliberately not derived from location, for the
reason the original note below gives (a diaspora Jew visiting Israel still
keeps two days of Yom Tov — location and observed-region are different
facts), just no longer *unimplemented*.

**Known limitation, not a bug:** `isShabbat`/`isFriday`/`isSaturday` (in
`getJewishCalendarContext`) are derived from the Gregorian day-of-week
only (`date.getDay()`), not from an actual sunset/tzeit calculation — so
Saturday night after Havdalah still reads as `isShabbat: true` until the
Gregorian date rolls over at local midnight, not at tzeit hakochavim. This
is the safe direction for any `omittedOn: shabbat` restriction (it can
only hold restricted content back a little *longer* than strictly
necessary, never release it early) — see the dedicated test in
`liturgicalEligibility.extended.test.ts`.

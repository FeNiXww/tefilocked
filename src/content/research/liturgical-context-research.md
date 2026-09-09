# Liturgical context research

Source-traceability record for the `liturgicalContext` field on items in
`daily_prayers.json`. Every claim encoded in that field should trace back to
something here.

**Status: this is AI-researched (web search + synthesis), not a rabbinic
ruling.** Every entry below carries `reviewStatus: ai_researched_unverified`
in the data until an actual rabbi reviews it. Treat this document as a
sourced draft, not an authority — if something here conflicts with what a
rabbi tells you, the rabbi wins and this file should be updated.

**Scope: full library audit.** A first pilot (3 items: `prayer-aleinu`,
`prayer-shema`, `prayer-sim-shalom`) validated the approach; this document
now covers all 19 items in `daily_prayers.json`. The data model was upgraded
between the pilot and the full audit — see "Data model v2" below — so the
pilot's 3 entries were also reclassified into the richer schema, not left as
they were.

**The single most important finding in this whole audit:** `prayer-shehecheyanu`
has a real, sourced halachic concern (not just an open question) with how
this app normally uses content — see its section below and the summary
table's `standaloneLevel` column. Read that section before doing anything
else with this file.

## Data model v2

The original pilot used a flat `PracticeLevel` (`required` /
`customary` / `not_applicable`) for standing and direction. That collapsed
too much: a custom and a requirement got the same UI treatment, which is
exactly the failure mode this project needs to avoid for a religious product.
`src/content/types.ts` now uses a 12-value `Certainty` enum (required,
prohibited, preferred, valid_not_ideal, custom, common_practice, recommended,
disputed, nusach_dependent, unknown, requires_review, not_applicable) for
every classified claim — standing, facing Jerusalem, minyan, and how
appropriate standalone use is (`standaloneLevel`). Each classified field
still carries a hand-written Hebrew `explanation`, read via
`src/content/liturgicalGuidance.ts` (`getPrayerGuidance`) rather than
rendered raw — that's the one place wording is assembled, so both app flows
(locked-app interception and the onboarding demo) show identical, consistent
guidance.

## Summary table

| Prayer | serviceRoleKind | standaloneLevel | Real zman? | Standing | Direction | Minyan | Calendar variant | Nusach diff | Confidence | Rabbinic review? |
|---|---|---|---|---|---|---|---|---|---|---|
| מודה אני | complete_prayer | valid_not_ideal | no | not_applicable | not_applicable | not_applicable | — | חב״ד (מחווה) | medium | yes |
| קריאת שמע | complete_prayer | preferred | **yes** | not_applicable | not_applicable | not_applicable | — | כיסוי עיניים (מנהג) | high | yes |
| ברכת כהנים | blessing | valid_not_ideal | no | not_applicable | not_applicable | not_applicable (duchening component: required) | — | ישראל/תפוצות (תדירות) | high | yes |
| מה טובו | piyut | valid_not_ideal | no | not_applicable | not_applicable | not_applicable | — | — | medium | yes |
| ושמרו | biblical_passage | valid_not_ideal | no | unknown | not_applicable | not_applicable | שבת (תוכני) | חב״ד (השמטה) | medium | yes |
| אשת חיל | biblical_passage | valid_not_ideal | no | not_applicable | not_applicable | not_applicable | ליל שבת (תוכני) | — | medium | yes |
| אדון עולם | piyut | preferred | no | unknown | not_applicable | not_applicable | — | מיקום שונה לגמרי בין עדות | medium | no |
| אנא בכח | piyut | requires_review | no | unknown | not_applicable | not_applicable | קבלת שבת | חב״ד (תדירות) | medium | yes |
| אשר יצר | blessing | requires_review — **EXCLUDED_FROM_POOL** | no | customary | not_applicable | not_applicable | — | — | high | **yes** |
| אלהי נשמה | prayer_component | common_practice | no | customary | not_applicable | not_applicable | — | — | medium | yes |
| השכיבנו | prayer_component | requires_review — **EXCLUDED_FROM_POOL** | no | unknown | unknown | not_applicable | שבת/יו״ט (נוסח) | — | high | yes |
| רפאנו | prayer_component | requires_review | no | not_applicable | not_applicable | not_applicable | שבת/יו״ט (לא נאמרת) | — | medium | yes |
| שים שלום | prayer_component | requires_review | no | not_applicable | not_applicable | not_applicable | — | אשכנז/ספרד | high | yes |
| עלינו לשבח | complete_prayer | disputed | no | customary | not_applicable | not_applicable | ר״ה/יו״כ (מוסף) | אשכנז/ספרד/תימן | medium | yes |
| אין כאלהינו | piyut | preferred | no | not_applicable | not_applicable | not_applicable | שבת/חג בתפוצות (תדירות) | אשכנז-תפוצות מול השאר | medium | yes |
| ברוך שאמר | prayer_component | requires_review — **EXCLUDED_FROM_POOL** | no | **required** | not_applicable | not_applicable | — | — | medium | yes |
| שהחיינו | occasion_triggered | **requires_review ⚠** | no | not_applicable | not_applicable | not_applicable | — | — | needs_review | **yes, priority** |
| תפילת הדרך | occasion_triggered | requires_review | no | preferred | not_applicable | not_applicable | — | — | medium | yes |
| אשרי | psalm | preferred | no | disputed | not_applicable | not_applicable | — | — | medium | yes |

---

## עלינו לשבח (Aleinu) — `prayer-aleinu`

**Normal context:** Recited at the conclusion of all three daily services
(Shacharit, Mincha, Maariv), immediately after the concluding
prayers/Shir Shel Yom. Not a standalone liturgical unit in origin — it closes
out a full service.

**Associated service:** Shacharit, Mincha, Maariv (end of each); also a
separate, more elaborate recitation with prostration in the Musaf Amidah of
Rosh Hashanah and Yom Kippur.

**Time requirements:** No independent halachic time window of its own — its
timing is fully derivative of whichever service it closes.

**Standing:** Required/strongly normative for the daily recitation — one
should say it standing with awe (Kitzur Shulchan Aruch 26:6; Ben Ish Chai,
Ki Tissa 18; Chida, Machzik Bracha 132:2). Bowing at "va'anachnu korim
u'mishtachavim" is customary (Magen Avraham 132:2), upper-body only in daily
use, vs. full prostration for the Rosh Hashanah/Yom Kippur Musaf version.
Bowing mechanics differ by edah (Ashkenazi/Sephardi/Yemenite) — a tradition
variation, not a dispute.

**Direction:** No source found requiring/recommending facing Jerusalem
specifically for Aleinu (unlike the Amidah). Modeled as not applicable.

**Calendar dependencies:** Materially more elaborate/physical (prostration)
in the Rosh Hashanah/Yom Kippur Musaf vs. the standard daily version — same
text core, different posture and ceremonial weight. Not modeled in the data
yet (app has no RH/YK calendar awareness).

**Standalone usage:** Genuinely disputed, but mainstream practical sources
lean toward yes. Halachipedia (citing Mishna Brurah 65:9, Yalkut Yosef)
frames it as congregational but doesn't list it among prayers omitted when
davening alone; Chabad.org's list of prayers omitted when praying alone does
**not** include Aleinu. A stricter, Zohar-based view against solo recitation
is referenced in secondary discussion but not independently confirmed here —
weakly sourced, not encoded as a rule.

**Tradition differences:** Some Ashkenazic communities skip Aleinu at Mincha
when Mincha is immediately followed by Maariv; Italian and Yemenite rites
reportedly never say it at Mincha. This rests on a single non-primary source
(My Jewish Learning) — flagged, not encoded.

**Important exceptions:** Women are not obligated but praised for reciting it
(Yalkut Yosef, Dinim L'isha p.38; Machaze Eliyahu 20; Halichot Bas Yisroel
2:13). Not modeled in the data (app has no gender-targeted content logic).

**Sources:**
1. Halachipedia, "Tachanun, Ashrei, Aleinu, Shir Shel Yom" —
   https://halachipedia.com/index.php?title=Tachanun,_Ashrei,_Aleinu,_Shir_Shel_Yom
   — standing, congregational norm, women's status, citing
   Kitzur Shulchan Aruch/Ben Ish Chai/Mishna Brurah/Yalkut Yosef.
2. Peninei Halakha (R. Eliezer Melamed), "Bowing During Musaf" —
   https://ph.yhb.org.il/en/15-07-14/ — Rosh Hashanah/Yom Kippur Musaf
   prostration practice by edah.
3. Chabad.org, "Which prayers are omitted when praying alone" —
   https://www.chabad.org/library/article_cdo/aid/541770/jewish/Which-prayers-are-omitted-when-praying-alone.htm
   — Aleinu absent from the omitted-when-alone list.
4. *(Weaker, needs corroboration)* My Jewish Learning, "Aleinu" —
   https://www.myjewishlearning.com/article/aleinu/ — Mincha-before-Maariv
   omission custom.

**Confidence:** Medium-High on standing/bowing/RH-YK distinction; Medium on
standalone-use permissibility (real but not fully resolved disagreement);
Low-Medium on the Mincha/Maariv-omission custom (single non-primary source).

**Disagreements found:**
1. Whether an individual praying alone should recite Aleinu at all —
   mainstream sources say yes; a Zohar-based stringency exists in secondary
   discussion but isn't independently confirmed here.
2. Rosh Hashanah/Yom Kippur bowing mechanics differ by edah — parallel
   customs, not a real dispute.

---

## קריאת שמע (Shema, first two paragraphs, Devarim 6:4-9) — `prayer-shema`

**Normal context:** Recited twice daily as its own d'oraita (biblical)
obligation, "בשכבך ובקומך" — once at night, once in the morning. Sequenced
immediately before the Amidah in both Shacharit and Maariv, but is its own
independent mitzvah.

**Associated service:** Shacharit and Maariv/Arvit. Not part of Mincha at
all — Mincha has no Shema.

**Time requirements — a real halachic zman, not a loose bucket:**
- Morning: ideal window starts at *misheyakir* (~35 min before sunrise per
  R. Moshe Feinstein) through the end of the 3rd *sha'ah zmanit*
  (proportional hour) of the day.
- Evening: ideal at *tzeit hakochavim* (nightfall), lechatchila within the
  first half-hour after nightfall; bedieved until halachic midnight; after
  midnight until dawn if missed (Shulchan Aruch).
- This is materially different from Aleinu, which has no fixed zman at all.

**Standing:** None required. Beit Hillel's ruling (which is followed):
recited in whatever position one is in when the time arrives — sitting or
standing both fine. Prohibited only while lying fully flat; must be on one's
side if reclining. Modeled as `not_applicable` (no standing requirement),
with the flat-lying restriction kept as a note rather than a new schema
field.

**Direction:** No specific requirement found for Shema itself. The
"face Eretz Yisrael/Jerusalem" ruling (Shulchan Aruch OC 94) sits in the
Tefilah/Amidah section (OC 89+), not the Krias Shema section (OC 58-88) —
it's an Amidah requirement, not a Shema one.

**Calendar dependencies:** None — text and obligation are the same every
day, Shabbat, Yom Tov, fast days.

**Standalone usage:** Yes — Shema is an independent biblical mitzvah,
distinct from Tefillah (Shabbat 9b-11a: one interrupts Torah study for Shema
but not for Amidah). Does not require a minyan or a full service.

**Tradition differences:** Universal custom to cover the eyes for the first
verse (Berachot 13b); authorities disagree whether covering extends through
"Baruch Shem" (Arizal: yes; Maharil: no) — cosmetic, not app-relevant. No
Ashkenazi/Sephardi difference found in the base text of these two
paragraphs.

**Important exceptions:** None found affecting whether the app should show
this text.

**Sources:**
1. Chabad.org, "Shulchan Aruch: Chapter 58 – Laws of Krias Shema" —
   https://www.chabad.org/library/article_cdo/aid/3291745 — morning zman,
   structure of the obligation.
2. Chabad.org, "Shulchan Aruch: Chapter 63 – License to sit, not sleep" —
   https://www.chabad.org/library/article_cdo/aid/3292059 — standing/sitting
   ruling.
3. Shulchan Aruch HaRav (shulchanaruchharav.com), "Until What Time May the
   Morning Shema Be Recited" —
   https://shulchanaruchharav.com/halacha/until-what-time-may-the-morning-shema-be-recited-understanding-the-luach-of-sof-zman-kerias-shema/
   — 3 sha'ah zmaniyos rule, misheyakir.
4. Peninei Halakha (R. Eliezer Melamed), "Zman begins at Tzeit HaKochavim" —
   https://ph.yhb.org.il/en/02-25-05/ — evening zman.
5. Chabad.org, "Shulchan Aruch: Chapter 94 – facing Eretz Yisrael" —
   https://www.chabad.org/library/article_cdo/aid/3299180 — confirms
   direction requirement lives under Tefilah, not Krias Shema.
6. Chabad.org, "Why Do We Cover Our Eyes for Shema" —
   https://www.chabad.org/library/article_cdo/aid/1047775 — eye-covering
   custom, Berachot 13b.

**Confidence:** High on timing structure, standing, standalone status, and
the direction-belongs-to-Amidah-not-Shema point. Medium on exact
nightfall/misheyakir minute offsets (these vary by custom/location, as
expected — not a real disagreement, just imprecision that's out of scope
for this app).

**Disagreements found:** Only the minor eye-covering-through-Baruch-Shem
question (Arizal vs. Maharil) — cosmetic, not app-relevant.

**App-specific flag:** Shema is the one pilot prayer where the app's generic
`timeWindows` (morning/afternoon/night, device clock only — see
`src/content/dayPart.ts`) risks implying more halachic precision than it
has. `hasRealHalachicZman: true` is set specifically so future UI copy can
avoid suggesting that reading Shema in-app at an arbitrary clock time
fulfills the zman-bound biblical obligation.

---

## שים שלום (Sim Shalom) — `prayer-sim-shalom`

**Normal context:** The final (19th) blessing of the weekday Amidah/Shemoneh
Esrei — a fragment of a longer fixed 19-blessing liturgical unit, not a text
with independent origin.

**Associated service:** Weekday and Shabbat Shacharit Amidah, in both
Ashkenazi and Sephardi practice. The app's current Hebrew text matches the
**Ashkenazi Sim Shalom** version used at Shacharit (and Shabbat Mincha) —
distinct from the shorter "Shalom Rav" text Ashkenazim use at weekday
Mincha/Maariv. Sephardi practice (Nusach Edot Mizrach, Nusach Sefard, Nusach
Ari, Italian, Romaniote) recites a Sim Shalom-family text at **all three
services**, so labeling this item "Shacharit only" would misrepresent
Sephardi practice.

**Time requirements:** Same window as Shacharit generally, plus Shabbat
Mincha for Ashkenazim. No independent time rule beyond "whenever this
Amidah is said."

**Standing:** Required for the Amidah as a whole (Berachot 26b; Shulchan
Aruch OC 94:1). **No source found that directly addresses whether that
carries over to someone reading this one paragraph as a devotional text
outside the Amidah** — this is a gap in available sourcing, not a settled
answer, and is modeled as `not_applicable` for the isolated-fragment reading
this app actually does, with the caveat kept in `researchNotes` rather than
asserted as a ruling either way.

**Direction:** Required for the Amidah (face Jerusalem/Eretz Yisrael;
Berachot 30a; Shulchan Aruch OC 94:1, 94:3). Same caveat as standing — no
source addresses the isolated-fragment case directly. Modeled as
`not_applicable` for the same reason.

**Calendar dependencies:** Ashkenazim swap Shalom Rav/Sim Shalom by
service/day (see above); Sephardim do not vary. No Yom Tov/Rosh
Chodesh/fast-day textual change to Sim Shalom itself found.

**Standalone usage:** General sources confirm reciting isolated blessing(s)
of the Amidah does **not** fulfill the tefillah obligation — the Amidah must
be said as a complete 19-blessing unit to count. No source directly answers
whether reading this text silently as inspirational text (not intending to
daven) carries any standing/direction expectation — an open question,
explicitly flagged for rabbinic review rather than resolved here.

**Tradition differences:** Ashkenazi vs. Sephardi as above — the one
well-documented, materially relevant difference.

**Important exceptions:** None found beyond the Ashkenazi/Sephardi swap.

**Sources:**
1. Wikipedia, "Sim Shalom" — https://en.wikipedia.org/wiki/Sim_Shalom — and
   "Shalom Rav" — https://en.wikipedia.org/wiki/Shalom_Rav — service/day
   usage split, corroborated by:
2. OzTorah, "Sim Shalom vs Shalom Rav – Ask the Rabbi" —
   https://oztorah.com/2010/06/sim-shalom-vs-shalom-rav-ask-the-rabbi/ —
   Orthodox rabbi-authored.
3. Sefaria, "Shulchan Arukh, Orach Chayim 94" —
   https://www.sefaria.org/Shulchan_Arukh,_Orach_Chayim.94 — and Chabad.org,
   https://www.chabad.org/library/article_cdo/aid/3299180 — standing +
   direction requirement of the Amidah as a whole.
4. Ohr.edu, "Counting Our Blessings" (Amidah pt. 20) —
   https://www.ohr.edu/this_week/counting_our_blessings/9987 — and Hadar
   Institute, "End Amidah Blessing" —
   https://www.hadar.org/torah-tefillah/resources/end-amidah-blessing-god —
   isolated-blessing recitation does not discharge the tefillah obligation.

**Confidence:** High on structural facts (blessing 19 of the Amidah;
Ashkenazi/Sephardi service-split; Amidah requires standing+direction).
**Needs Review** on the app-specific question of whether standalone/
devotional recitation carries any standing/direction expectation — no
posek-level source addresses this directly.

**Disagreements found:** None between sources on the facts above — the only
variance is the well-documented Ashkenazi/Sephardi minhag split, not a
dispute.

**Bottom line, flagged for rabbinic review, not encoded as a rule:** given
this is a fragment of a fixed 19-part unit that is not valid as a
tefillah-obligation-discharging act when recited in isolation, the app
should not present it as if it were a self-contained "prayer" with its own
halachic standing. `standaloneGuidance` reflects this; the `source` field
and UI treatment should lean toward "a passage from the Amidah" framing
rather than "a prayer."

---

## שהחיינו (Shehecheyanu) — `prayer-shehecheyanu` ⚠ PRIORITY

**This is the one finding from the full audit that changes how the app
should treat an item, not just how it's labeled.**

**Normal context:** A blessing of thanks recited only upon a genuine new/first
occasion — a new mitzvah performed for the first time that year, a new
seasonal fruit, a first-time joyous event.

**The concern:** Reciting a berachah with no genuine occasion is *bracha
levatala* — saying G-d's name in vain. Multiple concordant sources (Chabad.org
citing Shulchan Aruch; dinonline.org; Shulchan Aruch HaRav) treat this as a
real prohibition — rabbinic (derabanan) by most poskim, biblical (d'oraita)
by some Rishonim. There is a recognized exception for reciting a berachah
for genuine teaching/practice purposes, but **no source addresses whether
reading this text as app content falls under that exception** — it sits
closer to the prohibited case than the permitted one.

**Standing / direction / minyan:** not applicable — no source requires any
of these.

**Sources:**
1. Chabad.org, "The Shehecheyanu Blessing" — https://www.chabad.org/library/article_cdo/aid/91120/jewish/Shehecheyanu.htm
2. Din Online, "Brachos Said in Vain and Unnecessary Brachos" — https://dinonline.org/2012/12/25/brachos-said-in-vain-and-unnecessary-brachos/
3. Shulchan Aruch HaRav, "The prohibition of saying a Bracha Levatala" — https://shulchanaruchharav.com/article/the-prohibition-of-saying-a-bracha-levatala-or-hashems-name-in-vain

**Confidence:** High that unprompted recitation is halachically problematic
in general; the specific question of whether this app's use counts as the
permitted "teaching" case is unaddressed by any source found — hence
`confidence: needs_review` on the app-relevant conclusion, even though the
underlying principle is well-sourced.

**Disagreements found:** None on the core prohibition; only on how far the
teaching exception extends (Shulchan Aruch: minors; R. Moshe Feinstein:
extends to adult students too) — neither position clearly covers reading
app content with no student/teacher relationship at all.

**Recommendation (not yet implemented — a product decision, flagged for the
team):** consider not presenting this text with the app's normal "read this
as your prayer of the moment" framing until a rabbi confirms an appropriate
treatment — e.g. showing it as study text only, without inviting recitation.
`liturgicalContext.standaloneGuidance` on `prayer-shehecheyanu` already
carries this caution and surfaces in the in-app "למה?" panel, but the item
itself has not been removed from the random-pick content pool — that's a
scope decision beyond what this data-layer change makes on its own.

---

## תפילת הדרך (Tefilat HaDerech) — `prayer-tefilat-haderech`

**Normal context:** Recited upon leaving a settled area (~70 amot from town)
for a journey, within the first *parsah* (~72 min / ~3.8 km) of travel.

**Standalone use (not traveling):** Its closing formula ("ברוך אתה ה׳ שומע
תפילה") is a petitionary-blessing formula, not a thanks-for-this-happening-now
formula — structurally a weaker bracha-levatala risk than Shehecheyanu. But
no source directly confirms it's fine to recite without traveling either —
treated here as genuinely unknown, not as permitted.

**Standing:** Preferred, not required — stop if reasonably possible;
optional/preferred standing on public transit.

**Direction / minyan:** not applicable.

**Frequency:** Once per day of travel; repeated if travel resumes after an
intended stop; overnight travelers repeat it in the morning but omit the
closing blessing.

**Sources:**
1. Din Online, "Halacha Talk, Tefilas Haderech" — https://dinonline.org/2012/05/31/halacha-talk-tefilas-haderech/
2. Shulchan Aruch HaRav, "When on the road is Tefilas Haderech to be said?" — https://shulchanaruchharav.com/article/when-on-the-road-is-tefilas-haderech-to-be-said

**Confidence:** High on travel-trigger mechanics; low/needs-review on the
app-specific standalone-recitation question.

**Disagreements found:** None among sources found.

---

## השכיבנו (Hashkiveinu) — `prayer-hashkiveinu`

**Normal context:** The second blessing after the Shema blessings in Maariv,
embedded in a fixed sequence before the half-Kaddish and the weekday Amidah.

**Standalone use — RESOLVED (moved to `EXCLUDED_FROM_POOL`):** Previously
recorded as "no source directly addresses this," structurally similar to Sim
Shalom (a petitionary blessing inside a fixed sequence), "likely low risk,
not confirmed." A follow-up pass found a direct source: Hashkiveinu opens
straight into "הַשְׁכִּיבֵנוּ" with no "בָּרוּךְ אַתָּה ה׳" of its own,
because it is a "ברכה הסמוכה לחברתה" — juxtaposed to "אמת ואמונה"/Geulah
before it. Berachot 46a's rule for such a blessing is that it may omit its
own opening *only if it is never recited independently*; any blessing
sometimes said on its own (the Gemara's own example: "אשר בחר בנו" for an
aliyah) must open with its own "ברוך" precisely because it can stand alone.
Chazal's actual text for an individual's independent pre-sleep blessing is
different — ברכת המפיל ("הַמַּפִּיל חֶבְלֵי שֵׁנָה..."), which does open
with a full "בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם" precisely
because it is designed to be said alone. No source or custom was found for
reciting Hashkiveinu itself, standalone, outside Maariv's fixed sequence.
Conclusion: this is not a "still needs a source" gap and not a
time-of-day question either — the missing opening is itself the halachic
record's confirmation that the text was never meant to be lifted out of its
place between Geulah and the Amidah. Reclassified alongside `prayer-refaeinu`
and `prayer-sim-shalom` in `EXCLUDED_FROM_POOL` (`liturgicalEligibility.ts`)
rather than left `requires_review` with a caveat shown to users. Contrast
with `prayer-elokai-neshama` below, which has the same missing-opening
feature but a real, undisputed daily practice of solo recitation that
Hashkiveinu has no equivalent of — that's why it stays eligible while
Hashkiveinu does not.

**Standing:** Sources describe the congregation sitting through the
blessings-of-Shema sequence (including this one) and standing only once the
half-Kaddish begins — modeled as unknown/not required for this paragraph
specifically, rather than asserting either way.

**Direction:** The general rule to face Jerusalem "in prayer" exists, but
sources don't specify whether it extends to this paragraph or only the
Amidah — modeled as unknown.

**Minyan:** not applicable for this paragraph itself.

**Calendar variant — confirmed and real:** the Shabbat/Yom Tov version ends
differently ("ופרוש עלינו סוכת שלומך" / "הפורש סוכת שלום עלינו") instead of
the weekday close ("שומר עמו ישראל לעד"). **The app's current text is the
weekday version only** — flagged for whenever the app becomes calendar-aware.

**Sources:**
1. Wikipedia, "Hashkiveinu" — https://en.wikipedia.org/wiki/Hashkiveinu
2. OU Torah, "Siddur Guide – Part 3: Maariv" — https://outorah.org/p/36503/
3. Berachot 46a (ברכה הסמוכה לחברתה) — https://he.wikisource.org/wiki/ברכות_מו_א
4. Birkat HaMapil's own opening — https://he.wikisource.org/wiki/ברכת_המפיל

**Confidence:** High on the Shabbat-variant fact, sequence position, and now
the standalone-use conclusion (items 3–4 above); low/needs-review remains on
standing and direction specifically.

**Disagreements found:** None among sources found.

---

## מודה אני (Modeh Ani) — `prayer-modeh-ani`

**Normal context:** A two-line declaration of gratitude said immediately
upon waking, before washing hands or any other blessing.

**Standalone use:** With caveat — gratitude is meaningful any time of day,
but the text's essential character ("the very first thought upon waking")
is specifically about the moment of waking.

**Standing:** The customary practice is to say it while still lying/sitting
in bed, *not* standing, immediately upon waking. **Corroborated 2026-08-29**
via a direct fetch of Chabad.org's "The Laws Upon Awakening in the Morning,"
which quotes: *"while still in bed, even before he washes his hands, he
should say Modeh Ani,"* citing **Kitzur Shulchan Aruch 1:2 and Ketzos
HaShulchan 1:6** — a real primary-source citation, not just a search
snippet. Still unconfirmed independently: the specific reasoning sometimes
given for not standing immediately ("closer to death than life" —
gets attributed to this halacha in search summaries but wasn't found
quoted directly from a primary source in this pass), and whether standing
would actually be *prohibited* or simply *not customary*.

**Direction / minyan:** not applicable.

**Nusach:** Chabad has a specific hand-placement/head-bow gesture custom per
Sefer HaMinhagim — a gesture difference, not textual or timing.

**Sources:**
1. Chabad.org, "Modeh Ani" — https://www.chabad.org/library/article_cdo/aid/548239/jewish/Modeh-Ani.htm
2. Shulchan Aruch HaRav, "Modeh Ani: History, Details, and Positions" — https://shulchanaruchharav.com/halacha/modeh-ani/ (content came via search snippet; direct fetch returned no usable body)
3. Chabad.org, "The Laws Upon Awakening in the Morning" — https://www.chabad.org/library/article_cdo/aid/260663/jewish/The-Laws-Upon-Awakening-in-the-Morning.htm — direct fetch, quotes Kitzur Shulchan Aruch 1:2 and Ketzos HaShulchan 1:6 for "say it while still in bed"

**Confidence:** Medium — upgraded from the pilot's "single aggregated
summary" via source 3's direct primary-source citation, but the specific
not-standing reasoning is still unconfirmed independently.

**Disagreements found:** None found.

---

## אשר יצר (Asher Yatzar) — `prayer-asher-yatzar`

**Normal context:** A blessing said after *every* bathroom use, all day —
its place in the morning Birkot HaShachar sequence is just one instance of
a constant daily obligation, not a morning-exclusive text.

**Standalone use — REVERSED, now `EXCLUDED_FROM_POOL`:** Originally recorded
here as "yes, strongly — the strongest 'standalone-appropriate' finding in
this whole audit," on the reasoning that because this ברכה (full שם ומלכות:
"בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם...") repeats many times a day
rather than being a once-a-year event, reading it as text at any hour fits
its character better than most other items. A later, more skeptical pass
identified the flaw in that reasoning: the blessing is instituted to be said
*immediately following the actual act* (using the bathroom, washing hands),
not generically "at some point during a day when this kind of thing tends to
happen." "The type of event recurs often" doesn't establish "the event just
happened to this specific user right now," and the app has no way to verify
the latter. Presenting the full blessing formula as "today's prayer" to a
user who may not have just used the bathroom carries a real ברכה שאינה
צריכה risk — the exact same mechanism as `prayer-shehecheyanu`, just
triggered by a recurring bodily event instead of a rare one. Moved to
`EXCLUDED_FROM_POOL` in `liturgicalEligibility.ts`; see
`rabbinic-review-queue.md`'s Category A entry for the full writeup.

**Standing:** Ashkenazi custom is to stand during the morning Birkot
HaShachar sequence (sitting is fine if it helps concentration); outside that
morning sequence, no standing custom was found. (Moot while excluded from
the pool.)

**Direction / minyan:** not applicable; don't rely on a chazan's recitation
— say it yourself.

**Sources:**
1. Halachipedia, "Asher Yatzar" — https://halachipedia.com/index.php?title=Asher_Yatzar
2. Halachipedia, "Birchot HaShachar" — https://halachipedia.com/index.php?title=Birchot_HaShachar

**Confidence:** High on the all-day-recurring-obligation point (that part
was never wrong); high on the reversed standalone-use conclusion, given the
identified flaw in the original reasoning. Medium on standing specifics
outside the morning sequence.

**Disagreements found:** None.

---

## אלהי נשמה (Elokai Neshama) — `prayer-elokai-neshama`

**Normal context:** Part of the Birkot HaShachar sequence, said right after
Asher Yatzar (or another blessing beginning "Baruch").

**Standalone use — the "is it OK read alone, ever" question is now RESOLVED
(`common_practice`, no longer `requires_review`):** Elokai Neshama shares a
structural feature with Hashkiveinu above — it also has no opening "בָּרוּךְ
אַתָּה ה׳" of its own — but for a different, genuinely disputed reason:
Rishonim disagree on whether it's exempt as a ברכת הודאה (a category of
blessing that doesn't need its own opening regardless of context) or because
it's "סמוכה" to Asher Yatzar before it. What resolves the app's question
either way is practice, not that theoretical dispute: there is an unbroken,
undisputed daily custom of saying Elokai Neshama alone immediately upon
waking — including when it is *not* said in real proximity to Asher Yatzar
(e.g. someone who already washed/used the bathroom earlier). Hashkiveinu has
no equivalent standalone-recitation custom at all. That contrast, not the
shared missing-opening detail, is why Elokai Neshama stays eligible for
random surfacing while Hashkiveinu was moved to `EXCLUDED_FROM_POOL`.

The separate, still-open "if forgotten beforehand" debate below is
unrelated to the standalone-reading question — it's about *when* the
blessing may still be said (e.g. after tefillah), not *whether* it can be
said alone, and remains genuinely unresolved.

Weaker fit than Asher Yatzar in one respect: Halachipedia notes an
unresolved halachic debate about whether it may even be said after the
prayer service if forgotten beforehand, implying a real time/sequence
sensitivity the app should not paper over. Positions in that debate weren't
retrieved in detail.

**Standing:** Same general Ashkenazi Birkot HaShachar standing custom as
Asher Yatzar, no separate ruling found for this blessing specifically.

**Direction / minyan:** not applicable; don't rely on a chazan.

**Sources:**
1. Halachipedia, "Birchot HaShachar" — https://halachipedia.com/index.php?title=Birchot_HaShachar
2. Wikitext, "ברכת אלהי נשמה" — https://he.wikisource.org/wiki/ברכת_אלהי_נשמה
3. Wikipedia (Hebrew), "ברכת אלוהי נשמה" — https://he.wikipedia.org/wiki/ברכת_אלוהי_נשמה

**Confidence:** Medium — placement rule and the standalone-practice
conclusion are well-sourced; the "if forgotten" debate is named but not
detailed.

**Disagreements found:** Yes — a documented but not-fully-retrieved debate
on saying it after tefillah if forgotten beforehand (unrelated to the
now-resolved standalone-reading question above).

---

## רפאנו (Refaeinu) — `prayer-refaeinu`

**Normal context:** The 8th blessing of the weekday Amidah (not said on
Shabbat/Yom Tov, whose Amidah replaces the 13 middle blessings with one).

**Standalone use:** Same conclusion as Sim Shalom — reciting an isolated
Amidah blessing doesn't discharge the tefillah obligation, and no source
addresses standing/direction for reading it as isolated text. There is a
documented practice of adding a personal request for a sick person *within*
this blessing as part of davening the actual Amidah — but no documentation
of using the text as a fully freestanding prayer outside the Amidah.

**Standing / direction:** not applicable to the isolated-fragment reading
this app does — the requirement attaches to the Amidah as a whole.

**Minyan:** not applicable — this blessing itself doesn't require a minyan
(unlike Kedushah/Chazarat HaShatz elsewhere in the service).

**Calendar variant:** not said at all in the Shabbat/Yom Tov Amidah.

**Sources:**
1. Peninei Halakha, "Personal Requests in the Amidah" — https://ph.yhb.org.il/en/02-17-11/
2. Sheilot.com, "Prayer for the Sick in the Blessing of Refaeinu" — https://sheilot.com/en/answers/cycle-of-the-day/shemoneh-esreh/view/15736/

**Confidence:** Medium — structure is clear; the standalone-use question is
the same open point as Sim Shalom.

**Disagreements found:** None between sources; the gap is absence of a
direct source, not a dispute.

---

## ברכת כהנים (Birkat Kohanim) — `prayer-birkat-kohanim`

**Normal context:** The Priestly Blessing verses (Bamidbar 6:24-26), recited
by Kohanim in shul (duchening/nesiat kapayim); the same verses are also
quoted elsewhere, e.g. parents blessing children Friday night.

**Standalone use — a genuinely different case from every other item here:**
reading the verses as text (what this app does) is fundamentally different
from a Kohen performing duchening. Halachipedia: the only prohibition is
reciting the blessing *with intent to fulfill the mitzvah and imitate the
Kohen's act* — reading the text, or a parent blessing a child, isn't subject
to duchening's rules at all.

**Standing/direction for the app's use:** not applicable — those apply to a
Kohen performing duchening (standing, hands raised, facing the congregation
— not Jerusalem), not to reading the text.

**Minyan:** required, but only for duchening itself — not for reading the
verses as text or for a parent blessing a child (`componentOnly: true`).

**Nusach — significant, well-documented variance in frequency:** In Israel,
Jerusalem and most Sephardi communities duchen daily; some Israeli Ashkenazi
communities only Shabbat/Yom Tov. In the Diaspora, Sephardi communities
typically duchen weekly (Shabbat); Ashkenazi communities typically only on
Yom Tov Musaf (with exceptions like Simchat Torah).

**Sources:**
1. Halachipedia, "Birkat Cohanim" — https://www.halachipedia.com/index.php?title=Birkat_Cohanim
2. Chabad.org, "When is the Blessing Administered" — https://www.chabad.org/library/article_cdo/aid/894571/jewish/When-is-the-Blessing-Administered.htm

**Confidence:** High on minyan/frequency (2 independent concordant sources);
medium-high on the text-reading-vs-duchening distinction (one source, but
consistent with general halachic principles).

**Disagreements found:** None; only documented community variance, not a
dispute.

---

## פסוקי דזמרה: ברוך שאמר, אשרי, מה טובו

### ברוך שאמר (Baruch Sheamar) — `prayer-baruch-sheamar`

**Normal context:** The opening blessing of Pesukei D'Zimrah in Shacharit —
not mentioned in the Talmud itself.

**Standalone use:** Reasonable as a devotional text, but it doesn't
"complete" an independent mitzvah — its role is to open Pesukei D'Zimrah.

**Standing:** Required — "there is a received tradition to say it standing,
even alone" (Chabad.org's Shulchan Aruch series, ch. 51); the ill or elderly
may sit.

**Direction / minyan:** not applicable.

**Time:** Pesukei D'Zimrah as a whole should ideally be said from *alot
hashachar* through the end of the 4th halachic hour — that window belongs
to the framework, not to this blessing in isolation, and the app doesn't
compute it.

**Sources:**
1. Chabad.org, "Shulchan Aruch: Chapter 51" — https://www.chabad.org/library/article_cdo/aid/3285916
2. Halachipedia, "Pesukei DeZimrah" — https://halachipedia.com/index.php?title=Pesukei_DeZimrah

**Confidence:** High on standing and the Pesukei D'Zimrah time window;
medium on whether standing carries over to reading this blessing alone,
disconnected from Pesukei D'Zimrah (no direct source).

**Disagreements found:** None substantive; only a documented custom
difference (Ashkenazim stand for Yishtabach too; most Sephardi communities
sit for it) — unrelated to Baruch Sheamar itself.

### אשרי (Ashrei) — `prayer-ashrei`

**Normal context:** Psalm 145 plus framing verses, said three times daily
(within Pesukei D'Zimrah, near the end of Shacharit, and before Mincha).

**Standalone use:** Yes, without meaningful caveat — it has recognized
independent value ("whoever recites Tehillah LeDavid every day is assured a
share in the World to Come," Berachot 4b) and isn't dependent on a complete
service framework for its meaning.

**Standing:** No clear halachic requirement found; there's a documented,
unresolved custom-level debate about standing or sitting for the *second*
Ashrei at the end of Shacharit.

**Direction / minyan:** not applicable.

**Sources:**
1. Deracheha, "Prayer IX: End of Shacharit and Priorities" — https://www.deracheha.org/prayer-9-end-and-priorities/
2. Jewish Press, "Should We Stand Or Sit For The Second Ashrei?" — https://www.jewishpress.com/judaism/ask-the-rabbi/q-a-should-we-stand-or-sit-for-the-second-ashrei-part-i/2021/05/27/

**Confidence:** High on frequency/value; low-medium on standing (a real,
documented custom dispute with no halachic resolution found).

**Disagreements found:** Yes — standing vs. sitting for the second Ashrei,
documented custom dispute, no uniform resolution.

### מה טובו (Mah Tovu) — `prayer-mah-tovu`

**Normal context:** An opening verse (Bamidbar 24:5, from Bilaam's blessing)
plus additional Psalm verses, traditionally said upon physically entering a
synagogue. First documented in the Siddur of Rav Amram Gaon (9th century).

**Standalone use:** Reasonable as general devotional text outside the
synagogue-entry context, but that's not "fulfilling the original custom."

**Standing / direction / minyan:** not applicable — no source found
requiring any of these for this text specifically.

**Sources:**
1. Reform Judaism, "Mah Tovu — From Torah to Prayer" — https://reformjudaism.org/learning/torah-study/torah-commentary/mah-tovu-torah-prayer
2. Wikipedia, "Ma Tovu" — https://en.wikipedia.org/wiki/Ma_Tovu

**Confidence:** Medium — descriptive/encyclopedic sources, not primary
halachic rulings directly consulted.

**Disagreements found:** Yes, historical — the Maharshal (Rabbi Shlomo
Luria, 16th c.) objected to opening with the first verse because of its
origin in Bilaam's blessing, and skipped it, opening with the second verse
instead. A minority stringent practice against the accepted custom, not a
live halachic dispute.

---

## פיוטים: אדון עולם, אין כאלהינו, אנא בכח

### אדון עולם (Adon Olam) — `prayer-adon-olam`

**Normal context:** A hymn of praise with no halachic obligation attached,
not part of the formal prayer-service text itself.

**Standalone use:** Yes, without caveat — inherently a flexible-timing
devotional poem; already used at multiple disconnected liturgical points,
which itself confirms the flexibility.

**Standing / direction / minyan:** no source found establishing any of
these — modeled as `unknown` (standing) / `not_applicable` (direction,
minyan) rather than asserting "none required."

**Nusach — real and well-documented placement variance:** opens weekday
Shacharit (general/Ashkenazi custom, attested since the 15th century);
sung congregationally at the *close* of Shabbat/festival Shacharit in
Sephardi and British-Sephardi custom; replaces "Yigdal" at the close of
Ashkenazi Shabbat/festival Maariv; also widely included in bedtime Shema
(Kriat Shema al HaMita), consistent with its probable origin as a bedtime
hymn.

**Sources:**
1. Wikipedia, "Adon Olam" — https://en.wikipedia.org/wiki/Adon_Olam
2. Sefaria, Siddur Ashkenaz weekday Shacharit structure — https://www.sefaria.org/Siddur_Ashkenaz,_Weekday,_Shacharit,_Preparatory_Prayers,_Adon_Olam

**Confidence:** Medium-high on placement/nusach variance; standing/direction
are genuinely unsourced, not "none."

**Disagreements found:** None — the multiple placements are parallel
customs, not a dispute.

### אין כאלהינו (Ein Keloheinu) — `prayer-ein-keloheinu`

**Normal context:** A liturgical litany, among other purposes meant to help
complete 100 blessings per day; placed near the end of Shacharit.

**Standalone use:** Yes — explicitly documented as supplementary/non-critical
in some communities (said quietly, individually, "not regarded as a
critical part of the prayer service").

**Standing / direction:** not applicable — no source found.

**Minyan:** not applicable — the individual/quiet-recitation practice noted
above confirms no communal requirement.

**Nusach/calendar — real eligibility difference, still effectively
single-source:** Ashkenazi Diaspora communities say it only on
Shabbat/festivals; Ashkenazi communities in Israel, plus all Sephardi,
Yemenite, and Chasidic communities, say it daily. This is whether-said-at-all,
not just wording. **Corroboration attempted 2026-08-29:** several additional
search results (e.g. My Jewish Learning, "Ein Keloheinu: A Blessing
Explosion") repeat the same claim in similar wording, but on direct
inspection none of them actually discuss the Israel/Diaspora frequency
split independently — they appear to trace back to the same underlying
claim rather than confirming it from a separate primary source. Direct
fetches of two Chabad.org pages (its Ein Keloheinu siddur-commentary page
and an OU Torah page found via search) also failed to surface independent
discussion of this specific point. **Net: still effectively single-source**
(Wikipedia, citing Rav Amram Gaon) — flagged as a real gap, not resolved.

**Sources:**
1. Wikipedia, "Ein Keloheinu" — https://en.wikipedia.org/wiki/Ein_Keloheinu
2. My Jewish Learning, "Ein Keloheinu: A Blessing Explosion" — https://www.myjewishlearning.com/article/ein-keloheinu-a-blessing-explosion/ — checked 2026-08-29, does NOT independently address the frequency-split claim, so doesn't actually raise confidence

**Confidence:** Medium — unchanged from the pilot. A corroboration attempt
did not find a genuinely independent second source; this is an honest "still
needs one," not a resolved point.

**Disagreements found:** None found — the single-source risk noted above is
a sourcing gap, not a disagreement between sources.

### אנא בכח (Ana Bekoach) — `prayer-ana-bekoach`

**Normal context:** A kabbalistic piyut, loosely attributed to the Tanna
Nechunya ben Hakana; no halachic obligation to recite it. Earliest
documented text appears in a 15th-century Sephardic prayer book.

**Standalone use:** Yes, generally — historically said before the bedtime
Shema and during Kabbalat Shabbat (per the Arizal's students); Chabad's
modern practice recites it multiple times daily, itself demonstrating
mainstream comfort with frequent/standalone recitation.

**A specific, real caution (checked — verses in this app's data don't
trigger it):** the piyut's initial letters form an acrostic understood to
represent the traditional "42-letter Name." One source (citing Kiddushin
71a) states that acrostic string, if printed separately alongside the piyut,
is meant for visual contemplation, not vocal recitation — this restricts
vocalizing the *separately-displayed acrostic letters*, not the piyut's
actual words as normally recited aloud. **Checked directly:** `daily_prayers.json`'s
`prayer-ana-bekoach` verses contain only the normal run-on prayer text, with
no separate acrostic-letter display — so this caution does not apply to the
app's current content, but should be kept in mind if that ever changes.

**Standing / direction / minyan:** not applicable/unknown — no source found.

**Nusach:** Chabad has an expanded modern practice (multiple daily
recitations — before Shacharit, Mincha, bedtime Shema, Kabbalat Shabbat,
during Sefirat HaOmer, and Simchat Torah hakafot) beyond the older general
custom (bedtime Shema and Kabbalat Shabbat).

**Sources:**
1. Chabad.org, "The Origin and Meaning Behind the Ana Bekoach Prayer" — https://www.chabad.org/library/article_cdo/aid/7348971/jewish/The-Origin-and-Meaning-Behind-the-Ana-Bekoach-Prayer.htm

**Confidence:** Medium-high on the acrostic caution (single source, but a
reliable rabbinically-authored outlet citing a checkable Talmudic source);
medium on timing/nusach breadth (single-source coverage).

**Disagreements found:** None between sources on the caution itself; only a
scope note that "daily multiple recitation" is Chabad-specific practice
rather than universal — a practice-frequency variance, not a contested
ruling.

---

## שבת בבית: ושמרו, אשת חיל

### ושמרו (Veshamru) — `prayer-veshamru`

**Normal context:** Shemot 31:16-17, part of the middle blessing (Kedushat
HaYom) of the Shabbat evening Amidah, and also recited opening the Shabbat
morning Kiddush (Kiddusha Rabba).

**Standalone use:** These are Torah verses; reading them as standalone text
on a weekday isn't halachically prohibited, but isn't their normal
liturgical spot — the Shabbat connection is thematic/traditional (the verses
are literally about the "eternal covenant" of Shabbat observance), not a
prohibition on saying them another day. Note: Chabad/Lubavitch custom is to
omit it from the service entirely, even when the congregation says it — a
real practice difference within Shabbat itself, not just about timing.

**Standing:** No source found requiring standing for Veshamru itself (unlike
the adjacent "Vayechulu," which has a separate source for standing, even
alone — don't conflate the two).

**Direction / minyan:** not applicable.

**Sources:**
1. Halachipedia, "Shabbat Davening" — https://halachipedia.com/index.php?title=Shabbat_Davening
2. Wikipedia, "Kiddush" — https://en.wikipedia.org/wiki/Kiddush

**Confidence:** Medium — liturgical placement is well-established; the
standing point wasn't confirmed.

**Disagreements found:** Chabad's omission custom vs. general practice — a
documented practice difference, not a formal halachic dispute.

### אשת חיל (Eshet Chayil) — `prayer-eshet-chayil`

**Normal context:** Mishlei 31:10-31, sung at the table Friday night between
"Shalom Aleichem" and Kiddush. Not part of synagogue liturgy at all — a home
custom.

**Standalone use:** As a biblical text there's no halachic bar to reading it
any time, but it carries a strong thematic tie to Friday night. Important:
sources describe several legitimate, parallel layers of meaning — honoring
the wife/mother of the household, a mystical address to the Shechinah, and
an allegory for Shabbat itself or for Torah — so the app should not present
one interpretation as *the* meaning.

**Standing / direction / minyan:** not applicable — a home table custom.

**Calendar:** the Friday-night association traces to the Kabbalists of
Safed (the Arizal's students); no halachic bar to reading it another day.

**Sources:**
1. Chabad.org, "Why Sing Eishet Chayil on Friday Night?" — https://www.chabad.org/library/article_cdo/aid/3390021/jewish/Why-Sing-Eishet-Chayil-on-Friday-Night.htm
2. Jewish Women's Archive, "Background Information on Eshet Chayil" — https://jwa.org/article/background-information-on-eshet-chayil
3. My Jewish Learning, "How To Read Eshet Hayil" — https://www.myjewishlearning.com/article/how-to-read-eshet-hayil/

**Confidence:** Medium-high on the custom and its context; low on whether
any community omits it (not verified in this pass).

**Disagreements found:** No formal halachic dispute; a documented plurality
of accepted interpretive layers, not a "poskim disagree" situation.

---

## Rollup: what needs rabbinic review

Of 19 researched items, 17 carry `requiresRabbinicReview: true`. Only 2 don't
(`prayer-asher-yatzar`, `prayer-adon-olam`) — the cleanest findings: Asher
Yatzar's all-day-obligation status is corroborated by 2 independent sources
with no open question, and Adon Olam's flexible, non-obligatory status is
unambiguous even though its placement varies by nusach.

**Priority for actual rabbinic review, ranked:**
1. **`prayer-shehecheyanu`** — real bracha-levatala concern with the app's
   normal usage pattern. See its section above.
2. **`prayer-tefilat-haderech`** — weaker version of the same concern.
3. **Amidah fragments** (`prayer-sim-shalom`, `prayer-refaeinu`,
   `prayer-baruch-sheamar`) — whether standing/direction expectations carry
   over to isolated-fragment reading; no source addresses this directly for
   any of them.
4. Everything else marked `requiresRabbinicReview: true` — lower-stakes
   confirmations (single-source claims, unresolved minor custom disputes)
   rather than open halachic-risk questions.

---

## Full library audit, part 2: Tehillim, Chazal, Torah Wisdom, Shirat HaYam

Scope expansion beyond `daily_prayers.json`: `src/content/tehillim.json` (19
Psalms), `src/content/chazal.json` (13 items) + `src/content/torah_wisdom.json`
(20 items) — mostly Pirkei Avot excerpts plus a few Talmud/Mishlei/Kohelet
items — and `src/content/biblical_songs.json` (1 item, Shirat HaYam). All 72
content items across all 5 files now have `liturgicalContext`.

Unlike the siddur prayers, most items here carry no formal liturgical
apparatus (no standing/direction/minyan/zman) — they're either individual
Psalms (a well-established, unrestricted practice) or Torah-study texts
(explicitly a different category from tefillah). Research here was mostly
**genre-level** rather than per-item, except where a specific chapter had a
real, documented association worth checking individually.

### Genre: Pirkei Avot (25 items across chazal.json + torah_wisdom.json)

Torah study (talmud Torah), not tefillah — confirmed by multiple concordant
sources (Halachipedia's "Laws of Learning Torah"; Yeshivat Har Etzion,
"Learning Torah Sitting or Standing"; Din Online, "Reading from Torah
without Minyan"). No standing/direction/minyan/zman requirement for personal
study, as distinct from public Torah reading (leining) or the Amidah.

Real, well-documented custom: one chapter of Avot studied each Shabbat
afternoon between Pesach and Shavuot/through the summer (Geonic-era origin;
Chabad and others extend it through Rosh Hashanah). This is a *whole-chapter,
Shabbat-afternoon, communal* custom — unrelated to, and not violated by, this
app's single-mishnah-on-any-weekday usage.

Sources: [Why Learn Pirkei Avot From Passover and On? – Chabad.org](https://www.chabad.org/library/article_cdo/aid/6867593/jewish/Why-Learn-Pirkei-Avot-From-Passover-and-On.htm); [Pirkei Avot in the Summer – OU Torah](https://outorah.org/p/50778/); [Learning Torah Sitting or Standing – Yeshivat Har Etzion](https://www.etzion.org.il/en/talmud/seder-moed/massekhet-megilla/21a-learning-torah-sitting-or-standing-1); [Reading from Torah without Minyan – Din Online](https://dinonline.org/2012/09/05/reading-from-torah-without-minyan/). Confidence: High.

### Genre: Talmud Bavli aggada (3 items: Shabbat 31a, Sanhedrin 37a, Berachot 60b)

Same Torah-study classification as Avot. No genre-specific exception found
for aggadic material; no special handling norm beyond general reverence for
sacred texts. Sources: [What is Aggada? – Yeshivat Har Etzion](https://etzion.org.il/en/talmud/studies-gemara/midrash-and-aggada/what-aggada-part-i-aggada-classical-jewish-sources); [Halakha and Aggada – Yeshivat Har Etzion](https://etzion.org.il/en/talmud/studies-gemara/midrash-and-aggada/halakha-and-aggada). Confidence: Medium.

### Genre: Mishlei/Proverbs (4 items) and Kohelet 3:1 (1 item)

Same Torah-study classification (Devarim 6:7, "when you sit... walk... lie
down" — the classic proof-text for learning anywhere/anytime). No documented
special ritual use for any of the 4 Mishlei verses individually — genuinely
generic wisdom quotes, not a research gap. Kohelet 3:1: the public reading of
the *entire* Megillat Kohelet on Shabbat Chol HaMoed Sukkot (Rema OC 490:9,
663:2, citing the Maharil) governs the whole scroll on that specific
occasion — unrelated to, and not a constraint on, quoting this one verse any
other day. Sources: [Laws of Learning Torah – Halachipedia](https://halachipedia.com/index.php?title=Laws_of_Learning_Torah); [Why Do We Read Kohelet on Sukkot? – Chabad.org](https://www.chabad.org/library/article_cdo/aid/1310570/jewish/Why-Do-We-Read-Kohelet-on-Sukkot.htm); [Reading Kohelet on Sukkot – Yeshivat Har Etzion](https://www.etzion.org.il/en/holidays/sukkot/reading-kohelet-sukkot). Confidence: High.

### שירת הים (Shirat HaYam) — biblical_songs.json

Fixed daily component of Pesukei D'Zimrah (right before Yishtabach) —
`prayer_component`, like Baruch Sheamar. Standing for "Az Yashir" is a
widespread but non-universal custom (Kitzur Shulchan Aruch 14:4, Mishnah
Berurah 51:17) — at least one posek (R. Yaakov Yisroel Kanievsky, per
secondary report) reportedly sat despite standing elsewhere, showing real
variation rather than a uniform requirement. **Shabbat Shirah** (the annual
Torah-reading of Beshalach) is a distinct thing entirely — about the public
Torah-reading cycle once a year, unrelated to the daily Pesukei D'Zimrah
recitation this app surfaces; the app has no calendar awareness to reflect
Shabbat Shirah's special customs anyway. The traditional "brick-layout"
writing (arich al gabei leveinah, Megillah 16b) is a Torah-scroll ceremonial
custom, not a rule about how printed/app text may be displayed. Sources:
[My Jewish Learning, "Song(s) of the Sea"](https://www.myjewishlearning.com/article/songs-of-the-sea/); [RabbiKaganoff.com, "Oz Yashir"](https://rabbikaganoff.com/tag/oz-yashir/); [Din Online, "Shabbos Shirah"](https://dinonline.org/2012/12/25/shabbos-shirah/); [Open Siddur Project, "Shirat haYam"](https://opensiddur.org/readings-and-sourcetexts/festival-and-fast-day-readings/jewish/pesah-readings/shirat-hayam-the-song-of-the-sea/). Confidence: Medium-High on the Shabbat Shirah distinction; requires rabbinic review on the exact scope of the standing custom (secondary/blog-level sourcing).

### Tehillim (19 chapters) — items with a real, documented finding

Most of the 19 Psalms in `tehillim.json` (1, 16, 34, 46, 91, 84, 103, 121,
133, 134, 139, 142) carry no special liturgical placement worth a long
writeup — see each item's `liturgicalContext.serviceRole` in the JSON for
the specific (usually brief) finding. The chapters worth calling out here:

- **Psalm 23** (מזמור לדוד) — sung at Seudah Shlishit on Shabbat, *and* has a
  strong present-day association with funerals/mourning/Yizkor. Not a
  halachic problem, but a real framing-sensitivity flag: the app shouldn't
  assume this chapter always lands as purely comforting/neutral for every
  reader. Sources: [Torah Mates, Mizmor L'David at the Third Shabbat Meal](https://www.torahmates.org/jewish-resources/singing-mizmor-ldavid-psalm-23-at-the-third-shabbat-meal/); [Chabad.org, Psalms Recited in the Presence of the Deceased](https://www.chabad.org/library/article_cdo/aid/367830/jewish/Selected-Psalms-to-Be-Recited-in-the-Presence-of-the-Deceased.htm).
- **Psalm 27** (לדוד ה׳ אורי) — recited twice daily from Rosh Chodesh Elul
  through Sukkot (end date varies: Hoshana Rabbah in Israel/Chabad, Yom
  Kippur or Shemini Atzeret/Simchat Torah elsewhere), a real nusach-dependent
  custom (Sephard after Shacharit+Mincha; Ashkenaz after Shacharit+Maariv;
  Chabad after Shir Shel Yom). Reading it outside that window isn't
  discouraged by any source found — it's simply not the special occasion.
  Sources: [Chabad.org, Why Do We Say L'Dovid Hashem Ori](https://www.chabad.org/holidays/JewishNewYear/template_cdo/aid/3440228/jewish/Why-Do-We-Say-LDovid-Hashem-Ori-Psalm-27-During-the-Month-of-Elul.htm); [Schechter Institutes](https://schechter.edu/why-do-we-recite-psalm-27-from-rosh-hodesh-elul-until-hoshanah-rabbah-responsa-for-today-volume-4-issue-no-1-october-2009/).
- **Psalm 30** (מזמור שיר חנוכת הבית) — per Masechet Soferim, the fixed daily
  psalm of Chanukah; historically absent from the classic Geonic/Rishonic
  daily-Shacharit sources (Rav Saadia Gaon, Rav Amram Gaon, Machzor Vitry,
  Rambam, Tur, Abudarham), entering some prayerbooks only in the 17th
  century; in Sephardi practice said before Baruch Sheamar specifically on
  Chanukah, not year-round. **Lowest-confidence item in this batch** —
  couldn't confirm current widespread Ashkenazi daily-recitation practice
  (two follow-up source fetches failed, 404/403); flagged for a rabbi or a
  second source before treating the "is it said daily today" question as
  settled. Sources: [OU.org, Mizmor Shir Chanukat](https://www.ou.org/holidays/mizmor_shir_chanukat_translation_etc/); [Jewish Link, When Did It Enter Daily Shacharit?](https://jewishlink.news/when-did-mizmor-shir-chanukat-habayit-enter-daily-shacharit/) (title/snippet only — page fetch blocked).
- **Psalm 100** (מזמור לתודה) — fixed daily Pesukei D'Zimrah component,
  **omitted on Shabbat/Yom Tov** (replaced by Psalm 92) and, per Ashkenazi
  custom, also on Erev Pesach, Chol HaMoed Pesach, and Erev Yom Kippur (tied
  to the korban todah not being offerable those days) — Sephardi custom says
  it as usual on those days. **The single most app-relevant finding in this
  whole batch**: a genuine "don't show this today" scenario the app's
  calendar-unaware content picker currently can't reflect. High confidence,
  flagged for rabbinic review because of that gap, not because the
  underlying halacha is unclear.
- **Psalm 126** (שיר המעלות בשוב) — sung before Birkat Hamazon on Shabbat/Yom
  Tov (custom traced to the Shelah, 17th c.; weekday substitute Psalm 137 in
  some communities). Sources: [Sefaria sheet](https://www.sefaria.org/sheets/313976); [Yeshivat Har Etzion](https://etzion.org.il/en/tanakh/ketuvim/sefer-tehillim/mizmor-126-shir-hamaalot); [OU Torah](https://outorah.org/p/46599/).
- **Psalm 130** (ממעמקים) — added to Shacharit during Aseret Yemei Teshuva;
  said before the open ark in Nusach Sefard. Sources: [Chabad.org, Ten Days of Repentance](https://www.chabad.org/library/article_cdo/aid/1620809/jewish/The-Ten-Days-of-Repentance-The-Aseret-Yemay-Teshuvah.htm); [Halachipedia](https://halachipedia.com/index.php?title=Aseret_Yimei_Teshuva).
- **Psalm 133/134** — the "Hine Ma Tov" song (from Ps. 133:1) and the
  Sephardic/Chassidic (Arizal-nusach) custom of reciting all 15 Songs of
  Ascent before Friday-night Maariv, with Psalm 134 closing that cycle —
  both real customs, neither restricting the app's use of the full chapters
  as standalone text.

None of the Tehillim findings block or discourage standalone reading at any
time — Psalm 100's omission days are the one case where the app's *lack* of
calendar awareness (not a halachic restriction) means it could show
something that isn't normally said that day. That gap is now the same
documented limitation as everywhere else calendar-awareness is missing (see
`prayer-refaeinu`, `prayer-sim-shalom`, `prayer-hashkiveinu`'s weekday-only
implementation, etc.) — recorded, not silently ignored.

---

## Independent re-verification pass: Shirat HaYam and Hashkiveinu

Part of a second, more skeptical audit — this pass explicitly re-derived
claims from scratch rather than trusting the citations already attached.

**Hashkiveinu's hardcoded Shabbat closing text — a real discrepancy found
and fixed.** Pulled the actual text directly from Sefaria's API
(`Siddur_Ashkenaz, Shabbat, Maariv, Blessings of the Shema, Second Blessing
after Shema 1`), not just a page/search summary. The consonants matched, but
the nikud on "Jerusalem" didn't: the app had `יְרוּשָׁלִָים`, Sefaria's text
has `יְרוּשָׁלָיִם`. Fixed in `src/content/daily_prayers.json`
(`prayer-hashkiveinu.calendarVariantVerses.shabbat`) to match the primary
source exactly. Everything else in the line was word-for-word identical.
Source: https://www.sefaria.org/api/texts/Siddur_Ashkenaz,_Shabbat,_Maariv,_Blessings_of_the_Shema,_Second_Blessing_after_Shema_1?lang=he

New nuance found, not well-sourced enough to encode as fact: a search
surfaced a claim that some communities stand from Hashkiveinu onward
specifically on Friday night (to welcome Shabbat), differing from the
general sit-through-Hashkiveinu/stand-at-half-Kaddish pattern — but the
supporting pages included non-authoritative sources (an AI content
aggregator, a Messianic site), so this is flagged as an open question in
`prayer-hashkiveinu.liturgicalContext.standing.explanation`, not asserted.
Confidence on the standing field downgraded from "unknown, no source" to
"unknown, one weakly-sourced possible nuance found" — still not encoded as
a rule either way.

**Superseded by a later pass, see the main `## השכיבנו (Hashkiveinu)`
section above:** the standalone-reading question this section didn't touch
(only the Shabbat-text/standing details) was later resolved directly — the
item is now excluded from random selection entirely (`EXCLUDED_FROM_POOL`).

**Shirat HaYam:** the "fixed daily Pesukei D'Zimrah component" claim holds
for current practice, with a historical nuance — some sources describe it
entering Babylonian-community liturgy first for Shabbat/holidays specifically
(R. Saadia Gaon-era), before becoming universally daily; not incorporated as
a rule change since current practice (daily, everywhere) isn't in dispute.
The Shabbat Shirah / daily-recitation distinction re-confirmed independently
(Shabbat Shirah is about the annual public Torah-reading of Parashat
Beshalach, unrelated to the daily Pesukei D'Zimrah text). The standing
custom's underlying source (Kitzur Shulchan Aruch 14:4, reasoned by analogy
to Hallel) reconfirmed — but the specific claim that a named posek (R.
Yaakov Yisroel Kanievsky) sat despite standing elsewhere could **not** be
independently verified against any real source on this pass. Removed from
`shirat-hayam`'s `disagreements` field in the data — an unverifiable claim
about a specific individual shouldn't be presented even as a documented
disagreement.

---

## Backfill pass: 5 new items added after excluding 7 (72 → 77 items)

Once `prayer-shehecheyanu`, `prayer-tefilat-haderech`, `prayer-refaeinu`,
`prayer-sim-shalom`, `prayer-hashkiveinu`, `prayer-asher-yatzar`, and
`prayer-baruch-sheamar` were all moved to `EXCLUDED_FROM_POOL` (see each
item's own section above), the pool lost real mood/theme coverage — no
replacement content was substituted at exclusion time. This pass adds 5 new
items, chosen specifically so each is **structurally incapable** of the
bracha-levatala risk that got the other 7 excluded: every one is Torah or
Tehillim text with no ברכה formula (no "בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ
הָעוֹלָם...") anywhere in it, so there's no mechanism for the concern to
apply regardless of when or why it's shown — this was verified per-item with
an automated character-level audit of the final Hebrew text, not just
asserted.

**Sourcing/fact-check method:** every verse was pulled directly from
Sefaria's API (`https://www.sefaria.org/api/texts/<Book>.<chapter>`, Masoretic
text), then mechanically cleaned to match this app's existing siddur-style
convention (already used throughout `tehillim.json`/`daily_prayers.json`):
cantillation marks stripped, maqaf converted to spaces, and the Tetragrammaton
abbreviated to "ה'" — never retyped from memory. The cleaning pipeline was
verified against known-good round-trip cases (e.g. "בְּשָׁלוֹם" must clean to
itself unchanged) before being trusted, after an early draft of the script
was caught silently stripping real nikud along with cantillation — see the
conversation this was authored in for the exact failure mode; the fix was to
stop pasting literal Hebrew combining characters into scripts entirely and
use explicit `\uXXXX` codepoint ranges instead, plus a final character-set
audit (only Hebrew letters + standard nikud + expected punctuation allowed)
run against every verse before insertion. Ketiv/qere (Psalm 41:3) is shown in
the same `(ketiv) qere` format already used elsewhere in the app (see
`prayer-eshet-chayil`).

- **`tehillim-4`** (Psalm 4, full) — backfills Hashkiveinu's night/tired/
  anxious slot. Verse 5 ("רִגְזוּ וְאַל תֶּחֱטָאוּ... וְדֹמּוּ סֶלָה") is the
  Talmudic source (Berakhot 5a) for Kriat Shema Al Hamita; verse 9 ("בְּשָׁלוֹם
  יַחְדָּו אֶשְׁכְּבָה וְאִישָׁן") is its closing verse — a well-grounded,
  genuinely bedtime-themed replacement, unlike Hashkiveinu itself.
- **`tehillim-41`** (Psalm 41, full) — backfills Refaeinu's anxious/stressed/
  tired (healing) slot. Classic sickbed/visiting-the-sick psalm ("ה׳ יִסְעָדֶנּוּ
  עַל עֶרֶשׂ דְּוָי").
- **`tehillim-67`** (Psalm 67, full) — backfills Baruch Sheamar's and
  Shehecheyanu's grateful/happy slot. Short blessing psalm; its extra use
  after nightly Sefirat HaOmer counting (some communities) is a documented
  *additional* occasion, not an exclusive one — same reasoning already
  established for Psalms 27/121/130 in this app.
- **`tehillim-122`** (Psalm 122, full) — backfills Sim Shalom's stressed/
  grateful (peace) slot. Directly about praying for Jerusalem's peace
  ("שַׁאֲלוּ שְׁלוֹם יְרוּשָׁלִָם"), with no nusach dependency (unlike Sim
  Shalom, which is Ashkenazi-Shacharit-only in this app).
- **`mishlei-3-17`** (Proverbs 3:17, single verse — a complete aphorism unit,
  not a truncated excerpt of a continuous work, matching the existing
  `mishlei-*` single-verse items already in `torah_wisdom.json`) — backfills
  part of Sim Shalom's peace theme ("דְּרָכֶיהָ דַרְכֵי נֹעַם וְכׇל
  נְתִיבוֹתֶיהָ שָׁלוֹם").

**Sources:** https://www.sefaria.org/Psalms.4, .41, .67, .122,
https://www.sefaria.org/Proverbs.3.17, https://www.sefaria.org/Berakhot.5a.

**Confidence:** High. Unlike most entries in this document, the standalone-
safety conclusion here doesn't rest on a judgment call about occasion or
practice — it's a structural fact (no ברכה formula present) verified by
mechanical audit of the actual final text, not just asserted from genre.

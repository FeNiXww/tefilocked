# Rabbinic review queue — all 22 items, classified A/B/C/D

Re-classified this pass per an explicit instruction: split every item
currently marked `requiresRabbinicReview: true` into one of four categories,
based on what it *actually* is today — not on how it was historically
labeled, and not kept in the queue just because that was convenient for the
existing implementation.

- **A — real halachic uncertainty/dispute.** An actual open question a
  posek would need to answer (a genuine machloket, or a genuinely unaddressed
  question with real stakes). Belongs in the queue.
- **B — insufficient sourcing.** The underlying halacha is probably settled
  or a clear minhag, but this project's research hasn't reached
  primary-source rigor (single tertiary source, failed fetch, etc.).
  Belongs in the queue as a research task, not a live halachic dispute.
- **C — content/editorial issue.** Not a halachic question at all — a
  framing, sensitivity, or UI-clarity question. Mislabeled into this queue
  by the data model (which doesn't yet distinguish "needs a rabbi" from
  "needs an editorial read"). Recommend re-tagging in a future schema pass,
  but keep visible here so nothing silently disappears.
- **D — already sufficiently resolved.** The open question has actually
  been answered by this project's own research/implementation since it was
  first flagged, and no genuine uncertainty remains that changes product
  behavior. Recommend clearing `requiresRabbinicReview` for these.

**Nothing was removed from the app or silently resolved to shrink this
list** — every item below is still shown, its `liturgicalContext` untouched
except where this pass corrected a factual/stale claim (noted explicitly).
Total: **22 items** (was 21) — one (`prayer-shema`) was in the live data but
missing from the previous version of this document; it's added here. A
second, `prayer-asher-yatzar`, is newly added to the queue itself: a later
pass found a real bracha-levatala risk that the original research missed and
flipped its `requiresRabbinicReview` from `false` to `true` (see Category A).
`prayer-baruch-sheamar` and `prayer-hashkiveinu` were already in the queue
but are moved from Category B to Category A this pass — see those entries.

---

## Category A — real halachic uncertainty/dispute (8 items)

### `prayer-shehecheyanu` (שהחיינו)
Real bracha-levatala risk from displaying the text with no genuine
triggering occasion (Chabad.org, Din Online, Shulchan Aruch HaRav —
concordant on the general prohibition). The open question is specifically
whether this app's use case (devotional reading, no teacher/student
relationship) falls under the recognized "teaching" exception. **This is
the single highest-priority item in the entire library.** Already excluded
from random selection; the item itself is not yet reframed as explicit
"study text" pending the rabbi's answer — recommended, not yet done.

### `prayer-tefilat-haderech` (תפילת הדרך)
Same bracha-levatala family of concern as Shehecheyanu, structurally
reduced (petitionary, not thanks-for-a-completed-event) but not eliminated.
No source found addressing recitation while not actually traveling — a real
open question, not yet a competing pair of rulings. Already excluded from
random selection.

### `prayer-elokai-neshama` (אלהי נשמה)
Halachipedia references a real, named machloket on whether this blessing
may be said after tefillah if forgotten beforehand. This project has not
yet sourced the actual positions in that debate, so both what the dispute
says and its relevance to standalone app-reading remain open. A genuine
machloket, not a sourcing gap about whether one exists.

**Separately, the standalone-reading question itself is now resolved**
(previously `requires_review`, now `common_practice`): like Hashkiveinu,
this blessing has no opening "ברוך" of its own, but for a different, disputed
reason (Rishonim disagree on whether it's exempt as a ברכת הודאה, or as
semukhah to Asher Yatzar) — and unlike Hashkiveinu, there's an unbroken,
undisputed daily practice of saying it alone immediately upon waking, even
without Asher Yatzar said in real proximity beforehand. That practice, not
the theoretical semikhut question, is why it stays eligible for random
surfacing while Hashkiveinu does not. The forgotten-until-after-tefillah
machloket above is unrelated to this and remains open.

### `prayer-ashrei` (אשרי)
Standing/sitting for the closing Ashrei of Shacharit is a real, sourced
minhag difference (Rambam, Hilchot Tefillah 9:1–2, describes sitting
through Pesukei D'Zimrah/Krias Shema and standing only for the Amidah,
alongside real sources supporting standing). `standing.level: 'disputed'`
is the correct terminal classification — there is nothing to "resolve" here
except confirming the disclosure is adequate to a rabbi's eye.

### `shirat-hayam` (שירת הים)
A real, sourced standing custom exists (Kitzur Shulchan Aruch 14:4) but
isn't universally observed; an earlier unverifiable single-posek anecdote
was deliberately removed during independent re-verification rather than
kept as unreliable "evidence." `standing.level: 'disputed'` correctly
reflects a genuine minhag variation whose exact scope (standalone reading
vs. full Pesukei D'Zimrah) is still open.

### `prayer-baruch-sheamar` (ברוך שאמר)
**Moved into this category (was miscategorized as B — insufficient
sourcing) once a later pass finally asked the right question: moved to
`EXCLUDED_FROM_POOL`.** This is a full ברכה with שם ומלכות, twice ("בָּרוּךְ
אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם..." and the chatima "בָּרוּךְ אַתָּה
ה׳ מֶלֶךְ מְהֻלָּל בַּתִּשְׁבָּחוֹת"), instituted specifically as the
opening of Pesukei D'Zimra — not a generic praise text that may be said
whenever inspiration strikes. No source or custom was found for reciting it
detached from actually beginning Pesukei D'Zimra. Surfacing it as a random
"today's prayer" carries the same ברכה שאינה צריכה risk already recognized
for Shehecheyanu/Tefilat HaDerech above (now also Asher Yatzar — see below),
just triggered by "starting a fixed prayer sequence" rather than a personal
life event. This was missed in the original research, which only asked
standing/nusach questions and never asked whether the item should be shown
standalone at all.

Separately, still genuinely open (moot while excluded, unaffected by the
above): whether the general Amidah standing requirement carries over to
reading this one blessing in isolation — same open question as Sim
Shalom/Refaeinu's `standing.level: 'custom'`.

### `prayer-asher-yatzar` (אשר יצר)
**New finding — moved to `EXCLUDED_FROM_POOL`.** Previously marked
`requiresRabbinicReview: false` with `standaloneLevel: 'preferred'` and a
guidance note arguing that because this ברכה (full שם ומלכות: "בָּרוּךְ
אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם...") repeats many times a day (after
every use of the bathroom), rather than being a once-a-year event like
Shehecheyanu, reading it as text "at any hour of the day" was fine — even
"more in keeping with its original character than most other items in the
library." That reasoning conflates two different things: the *type* of
triggering event recurring often in general, versus this particular
recitation being tied to an actual just-occurred instance of it. The
blessing is instituted to be said immediately following the specific act
(after using the bathroom and washing hands) — the app has no way to verify
that just happened for the user it's being shown to, and "this kind of thing
happens to everyone multiple times a day" doesn't establish that it happened
right now. Reclassified into the same bracha-levatala-risk bucket as
Shehecheyanu/Tefilat HaDerech/Baruch Sheamar above — a recurring-but-still-
real-event trigger instead of a rare one, same underlying mechanism.
`requiresRabbinicReview` flipped to `true`.

### `prayer-hashkiveinu` (השכיבנו)
**Moved into this category (was miscategorized as B), and moved to
`EXCLUDED_FROM_POOL`, not just flagged.** Re-researched the standalone
question itself (previously only "requires_review" with no direct source).
Found one: Hashkiveinu opens with no "בָּרוּךְ אַתָּה ה׳" of its own because
it's a "ברכה הסמוכה לחברתה" to "אמת ואמונה"/Geulah before it; per Berachot
46a, a blessing may skip its own opening only if it is *never* recited
independently (a blessing sometimes said alone — the Gemara's own example is
"אשר בחר בנו" for an aliyah — must open with its own "ברוך" precisely
because it can stand alone). Chazal's actual text for an individual's
independent pre-sleep blessing is different — ברכת המפיל, which does open
with a full "ברוך אתה ה׳ אלקינו מלך העולם" because it's designed to be said
alone. No source or custom was found for reciting Hashkiveinu itself as a
standalone act outside Maariv's fixed sequence. This is now documented in
the item's `standaloneGuidance` and in `liturgicalEligibility.ts`'s
`EXCLUDED_FROM_POOL` comment, matching `prayer-refaeinu`/`prayer-sim-shalom`'s
existing precedent. This is still AI research, not a psak —
`requiresRabbinicReview` stays `true` and rabbinic confirmation is still
worth getting, but the app no longer surfaces the item as a random "today's
prayer" while that's pending.

Still genuinely open (unaffected by the above, and moot while excluded from
the pool): standing/facing for this specific paragraph (the congregation is
known to sit through the surrounding Shema-blessings sequence, standing only
at the following half-Kaddish, but that's about the sequence, not this
paragraph specifically), and whether the Shabbat-variant closing text
already implemented needs its own Yom Tov variant.

---

## Category B — insufficient sourcing, not a live dispute (9 items)

### `prayer-shema` (שמע) — *(newly added to this document this pass; was already `requiresRabbinicReview: true` in the data but missing from the previous version of this file)*
The app's `idealVsValidNote`/`rabbinicReviewNotes` were **stale** as of this
pass — they described a pre-eligibility-engine state ("the app does not
compute these times, shows text by device clock only") that stopped being
true once `zmanim.ts`/`liturgicalEligibility.ts` were built. **Corrected
this pass** (see `daily_prayers.json`, `prayer-shema.liturgicalContext.timeContext.idealVsValidNote`
and `.rabbinicReviewNotes`): the app now genuinely computes astronomical
zmanim via `kosher-zmanim` and gates Shema's eligibility status by them,
but only when the user has granted location — otherwise it discloses that
it doesn't know the time rather than guessing. What remains genuinely open
for a rabbi: (a) whether an astronomical calculation not cross-checked
against a local printed luach is precise enough to present as "the halachic
time," and (b) whether the current wording/why-panel makes the
location-dependency clear enough to an ordinary user. Not a dispute about
the underlying halacha (the three-tier morning window and the
until-chatzot/until-alot evening rule are well-sourced and directly
verified against Chabad.org's Shulchan Aruch text) — a precision/UX
question layered on settled halacha.

### `prayer-sim-shalom`, `prayer-refaeinu` (שים שלום, רפאנו)
Whether standing/facing-Jerusalem (established for the Amidah as a whole —
Berachot 26b, Shulchan Aruch OC 94:1) carry over to reading one blessing in
isolation. A structural argument supports "no" (no halachic category for a
partial voluntary Amidah), but no source says so directly. Modeled as
`not_applicable` (not asserting an unsourced requirement) with the open
question flagged internally, not surfaced as false certainty either way.
This pass additionally hardened `prayer-sim-shalom`'s `serviceRole` text to
make explicit that the Ashkenazi-Shacharit wording shown is not universal
(see `nusach-content-gaps.md`) — a separate, already-resolved product
decision, not part of the open sourcing question itself.

### `prayer-baruch-sheamar`, `prayer-asher-yatzar`, `prayer-hashkiveinu`
**Reclassified to Category A — see that section above.** These three no
longer belong here: each now carries a real, sourced bracha-levatala /
ברכה שאינה צריכה finding (the same family of concern as
`prayer-shehecheyanu`/`prayer-tefilat-haderech` above), not merely thin
sourcing on a settled point. All three are excluded from random selection.

### `prayer-ana-bekoach` (אנא בכח)
A single source (Chabad.org, citing Kiddushin 71a) describes the piyut's
acrostic as meant for visual contemplation, not vocal recitation of the
acrostic letters — not a restriction on the piyut's normal words. A second
corroborating source wasn't found. Confirmed this project: the app's
`verses` content has no separate acrostic-letter display, so the caution
doesn't currently apply regardless — the open item is sourcing rigor on a
claim that, even if fully confirmed, wouldn't currently change product
behavior.

### `tehillim-30` (תהלים ל׳)
Historically Chanukah-specific (Masechet Soferim), absent from classical
Geonic/Rishonic daily-Shacharit sources, entered some siddurim only in the
17th century; Sephardi custom keeps it Chanukah-only. Two follow-up
source-fetch attempts failed (404/403) — this remains the lowest-confidence
item in the entire library (`confidence: low`, disclosed). Unlike
`tehillim-100`, there is no documented *omission* custom here, only an
unresolved "how commonly is it said outside Chanukah" placement question —
the general "a Tanach text is safe to read regardless of liturgical
placement" principle still applies, so no exclusion is warranted.

### `tehillim-121` (תהלים קכ״א)
Independent re-verification found real liturgical placements in some rites
(Tefilat HaDerech inclusion, seasonal Maariv/Mincha additions, paired
recitation with Psalm 130 for the sick) that the original research
underestimated — but the specific season/service parameters conflict
between the secondary sources found. Needs one primary siddur source (e.g.
Sefaria's Nusach Edot HaMizrach text) to resolve; not evidence of an actual
dispute among poskim. `confidence: low`, disclosed.

### `prayer-mah-tovu` (מה טובו)
Only encyclopedic/descriptive sources found (Reform Judaism, Wikipedia),
not primary halachic texts, for the mainstream 4-verse practice or for a
historical note that the Maharshal skipped the Bilaam-sourced opening verse.
A documented historical minority practice, not a live contested machloket —
but not confirmed at primary-source rigor either. Disclosed in
`disagreements`.

### `prayer-veshamru` (ושמרו)
No source found on standing specifically for "Veshamru" itself (distinct
from the adjacent "Vayechulu," which does have one — a real risk of
conflating the two that this project has deliberately avoided). `unknown`
classification kept.

### `prayer-ein-keloheinu` (אין כאלהינו)
A documented Ashkenazi-Diaspora-vs-everyone-else frequency split
(daily vs. Shabbat/Yom Tov only) rests on a single tertiary source
(Wikipedia, citing Rav Amram Gaon) with no independent primary-source
confirmation found across two separate research passes. The claim is
plausible and specific, but needs a primary-source check (Shulchan
Aruch/Mishnah Berurah) to close.

---

## Category C — content/editorial issue, not halachic (3 items)

### `prayer-eshet-chayil` (אשת חיל)
Multiple legitimate readings exist (literal, mystical/Shechinah,
allegorical for Shabbat/Torah) — a real interpretive plurality, not a
dispute needing rabbinic resolution. Already framed with multiple layers
rather than asserting one interpretation (per the original pilot's
finding). The open item is UI framing-balance and an unverified claim about
partial Sephardi omission — an editorial/sensitivity question, explicitly
self-flagged as such in this item's own `rabbinicReviewNotes`.

### `prayer-birkat-kohanim` (ברכת כהנים)
**Updated — moved to `EXCLUDED_FROM_POOL`, on product judgment rather than a
reversed halachic finding.** The underlying halacha is still settled and
well-sourced exactly as before (Halachipedia confirms text-reading/parent-
blessing-a-child is categorically different from duchening, which needs a
minyan and a Kohen) — the text itself remains completely fine, no bracha-
levatala mechanism applies (it's Biblical verses, not a ברכה formula). What
changed: the app's owner flagged that its two known legitimate uses
(duchening; a parent blessing a child) both have a clear blesser/blessed
relationship, which the app's generic "here's your prayer for the moment"
framing to a solitary reader doesn't have — no precedent covers *that*
specific use. This is a real, distinct point from the original UI-clarity
question below, not just a restatement of it.

Original (still true, now moot while excluded) open question: purely
whether the app's on-screen wording is unambiguous enough that a user could
never mistake reading this text for having received nesiat kapayim — a
UI-clarity question, not an unresolved halachic point on its own.

### `tehillim-23` (תהלים כ״ג)
Two real, documented associations (Seudah Shlishit singing; a more
culturally recent, not classically-sourced link to funerals/Yizkor). The
open question — whether presenting a mourning-associated text as a neutral
"psalm of the day" needs different framing — is a sensitivity question,
explicitly self-flagged as such in this item's own `rabbinicReviewNotes`,
not a halachic one.

---

## Category D — already sufficiently resolved, no longer needs rabbinic review (2 items)

### `tehillim-100` (תהלים ק׳)
Previously flagged because the app enforced only the universal Shabbat/Yom
Tov omission and not the additional Ashkenazi-specific omission days (Erev
Pesach, Chol HaMoed Pesach, Erev Yom Kippur), while showing the psalm
identically to all users. **This pass resolved the product question**: the
item is now fully excluded from random selection (`EXCLUDED_FROM_POOL` in
`liturgicalEligibility.ts`) rather than partially enforcing an
Ashkenazi-only rule for everyone — see that file's doc comment and
`nusach-content-gaps.md`. The underlying halacha was never actually in
dispute (well-documented in both directions); what was open was a product
decision, now made conservatively. Nothing left for a rabbi to adjudicate —
recommend clearing `requiresRabbinicReview`. (Its `CALENDAR_RESTRICTED`
mechanism for the universal Shabbat/Yom Tov case remains implemented and
tested independently of the pool exclusion — see
`liturgicalEligibility.test.ts`'s synthetic-fixture test.)

### `prayer-aleinu` (עלינו לשבח)
Originally flagged over a stricter Zohar-based view against solo
recitation. Independently re-checked this project and the claim could not
be substantiated anywhere despite a dedicated search — `standaloneLevel`
was upgraded from `disputed` to `preferred` and the unsupported
disagreement entry removed. The one remaining point (a single-source claim
that some communities skip Aleinu at Mincha immediately followed by
Maariv) is minor sourcing polish on a settled main question, not a
reviewable uncertainty that changes product behavior. Recommend clearing
`requiresRabbinicReview`; optionally re-flag only if the Mincha-skip point
is ever surfaced in the UI (it currently isn't).

*(`tehillim-121` was also considered for Category D, since the psalm text
itself carries no halachic restriction — but its conflicting
secondary-source problem, three different rite/season claims that don't
agree, needs an actual primary source to resolve, not just a rabbi's
sign-off on already-settled research. Kept in Category B above, not here.)*

---

## Summary

Of 22 items (was 21 — see the note at the top of this document):
**8 are Category A** (real, sourced halachic uncertainty/dispute —
genuinely needs a rabbi's judgment call; this pass added `prayer-asher-yatzar`
as a new finding and moved `prayer-baruch-sheamar`/`prayer-hashkiveinu` here
from Category B, since all three turned out to carry a real bracha-levatala
/ ברכה שאינה צריכה risk once actually asked, not just thin sourcing on an
otherwise-settled point — all three are now excluded from random selection
in `liturgicalEligibility.ts`); **9 are Category B** (the halacha is probably
settled but this project's sourcing hasn't reached primary-source rigor — a
research task, not evidence of actual disagreement; includes `prayer-shema`,
added to this document this pass after finding it was live in the data but
undocumented here, plus a correction to its stale "no zmanim computed"
claim); **3 are Category C** (editorial/sensitivity framing questions
mislabeled into this queue by a data model that doesn't yet distinguish
"needs a rabbi" from "needs an editorial read"); **2 are Category D** (the
specific question that originally justified the flag has since been
resolved by this project's own work — recommend clearing
`requiresRabbinicReview` on `tehillim-100` and `prayer-aleinu` specifically;
`tehillim-121` was also considered for D but kept in Category B, since its
open question has not actually been answered, only correctly
downgraded/disclosed rather than resolved).

**No item was removed from the app, and no item was kept in this queue
merely because it was historically here** — `tehillim-100` and
`prayer-aleinu` are recommended for removal from the queue specifically
because their triggering questions were actually answered, not because
leaving them flagged was inconvenient.

# Nusach content gaps

Audits every item currently returning `NUSACH_DEPENDENT` (16 of 72) against
four questions: (A) does the *text itself* change by nusach, (B) does only
the custom/usage change, (C) is it safe to display as generic text as-is,
(D) should the app eventually carry nusach-specific text versions. See
`nusach-ux-decision.md` for why the answer today is "document, don't
auto-switch" rather than building a selector.

## The one real finding: `prayer-sim-shalom` needs a (D)

**This is the only item in the whole library where the underlying text
itself — not just its placement or frequency — genuinely differs by
nusach, and the app currently shows only one version without saying so
clearly enough.**

- The app's text is the Ashkenazi **Sim Shalom**, used at Shacharit (and
  Shabbat Mincha).
- Ashkenazi weekday Mincha/Maariv uses a *different, differently-worded*
  blessing, **Shalom Rav** — not a variant of Sim Shalom, a distinct text.
- Sephardi/Edot HaMizrach/Nusach Ari/Italian/Romaniote practice uses a
  Sim-Shalom-family text at all three services, without the Ashkenazi
  Shacharit/Mincha split.

A Sephardi user, or an Ashkenazi user reading this at what would be their
Mincha/Maariv time, could reasonably take this as "the" closing blessing of
the Amidah when it's specifically the Shacharit-nusach-Ashkenazi version.
**(A) and (D) both apply.** Mitigation already in place: it's classified
`REQUIRES_CONTEXT` (a prayer_component, not presented as complete), and its
`serviceRole` caption already names it "בנוסח אשכנז" explicitly — but the
app doesn't have the Sephardi text or Shalom Rav's text to offer as
alternatives, so a nusach-aware selector isn't buildable yet even if wanted.
**Recommended next step if this is prioritized:** source and verify Shalom
Rav's and the Sephardi Sim Shalom's exact text with the same rigor as
everything else here, then this becomes the first real nusach-variant pair
in the data model.

## Everything else: (B) and (C) — usage/placement varies, the text doesn't

All 15 remaining `NUSACH_DEPENDENT` items are documented differences in
**when/how often/in what physical gesture** something is done, not in the
words themselves — the displayed text is the same Tanach passage, Talmudic
teaching, or standard piyut text used across communities:

| Item | What actually varies |
|---|---|
| `prayer-modeh-ani` | Chabad hand-placement/head-bow gesture (not text) |
| `prayer-shema` | Eye-covering custom duration (Arizal vs. Maharil) |
| `prayer-birkat-kohanim` | Duchening frequency (daily vs. Shabbat/Yom Tov only) by community |
| `prayer-veshamru` | Chabad omits it from the service entirely (a practice choice, not a text variant — the verses themselves are fixed Torah text) |
| `prayer-adon-olam` | Where in the service it's placed (opens Shacharit / closes Shabbat Shacharit / closes Shabbat Maariv / bedtime) |
| `prayer-ana-bekoach` | How often per day it's recited (Chabad: several times; general custom: bedtime Shema + Kabbalat Shabbat) |
| `prayer-aleinu` | Bowing mechanics at Musaf (Ashkenazi/Sephardi/Yemenite differ in *how*, not the text) |
| `prayer-ein-keloheinu` | Said daily vs. Shabbat/Yom Tov only (Ashkenazi Diaspora vs. everyone else) |
| `tehillim-27` | Which services it's appended to, and end-of-season date |
| `tehillim-30` | Chanukah-only (Sephardi) vs. possibly-daily (unclear scope, flagged Low confidence) |
| `tehillim-34` | Whether verse 11 is appended to Birkat Hamazon's closing section |
| `tehillim-84` | Whether used to open Maariv in some communities |
| `tehillim-91` | A Motzei Shabbat association, not independently verified in depth |
| `tehillim-100` | Omission days differ by community (Ashkenaz omits more days than Sefarad) — already enforced correctly, see below |
| `tehillim-126` | Weekday substitute (Psalm 137) in some communities |
| `tehillim-130` | Nusach Sefard's antiphonal-before-the-ark custom during Aseret Yemei Teshuva |
| `tehillim-133` | Origin/adoption path of the "Hine Ma Tov" tune, not the psalm text |
| `tehillim-134` | Sephardi/Chassidic 15-Psalm Friday-night cycle vs. no such cycle in plain Ashkenazi practice |
| `shirat-hayam` | Historical daily-vs.-Shabbat-only recitation frequency in the Geonic period |

**A note on `tehillim-100`'s nusach split specifically, since it's the one
item where nusach and calendar-restriction intersect:** the app's
`omittedOn: ['shabbat', 'yom_tov']` enforcement (see `eligibility-matrix.md`)
is deliberately scoped to just Shabbat/Yom Tov, which research found is
omitted **universally** across nusach — the *additional* Ashkenazi-specific
omission days (Erev Pesach, Chol HaMoed Pesach, Erev Yom Kippur) were
intentionally left unimplemented rather than enforced for everyone
regardless of nusach. That was the right conservative scope choice already
made; recorded here so the reasoning is traceable rather than looking like
an oversight.

## What this means for "is it safe to display as generic text"

Yes, for 15 of 16 — the text itself is not in question; only the app's
implicit framing of *when/how often* it's normally said could mislead
someone about their own community's practice, and that's exactly what each
item's `standaloneGuidance`/`nusachDifferences` fields already spell out in
the "why?" panel. `prayer-sim-shalom` is the one exception, already
mitigated as far as reasonably possible without new sourced content (see
above) — not silently presented as universal.

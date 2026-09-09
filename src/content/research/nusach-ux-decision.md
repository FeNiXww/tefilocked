# Nusach UX: decision and reasoning

**Status: a decision, made and already substantially implemented — not a
scoping doc like the zmanim one.** Unlike real zmanim (which needs a new
permission and a new dependency before anything can be built), the right
move on nusach doesn't require new infrastructure — it requires being
honest with the existing infrastructure. That's done. What's *not* done
(real per-nusach text variants) is a separate, larger content project, and
this doc explains why that's being deliberately deferred rather than built
now.

## The four options, and why

The question as posed: should the app (1) ask nusach during onboarding,
(2) show a default with an explicit label, (3) offer a Settings toggle, or
(4) refuse to present nusach-sensitive items as formal prayers until this is
handled?

**(1) Ask during onboarding — rejected for now.** Two costs, not one:
- **Product cost:** onboarding already asks connection-rating, mood, and
  unlock duration. Adding "what's your nusach?" before the user has any
  reason to care yet is friction for a fact many casual users don't hold
  precisely, or that varies by which part of davening they mean.
- **The real blocker: there's nothing to switch to.** Asking for a nusach
  and then showing the *same* Ashkenazi-leaning text regardless of the
  answer would be worse than not asking — it would look like a real setting
  that does nothing. Building actual Sephardi/Nusach Sefard/Chabad text
  variants for every nusach-sensitive item, verified with the same
  source-per-claim rigor as the rest of this project, is a large content
  project in its own right — comparable in scope to the zmanim work, not a
  quick addition. Not started; would need its own decision to begin.

**(2) Default + explicit label — this is the actual current state, and the
right one for now.** `LiturgicalContext.nusachDifferences` already exists
on every relevant item, and `getPrayerGuidance()`
(`src/content/liturgicalGuidance.ts`) already surfaces it unconditionally in
the reading screen's "למה?" panel — see `prayer-sim-shalom` ("Ashkenazi
practice... Sephardi practice recites a Sim Shalom-family text at all three
services") and `prayer-hashkiveinu`, `prayer-aleinu`, `prayer-baruch-sheamar`,
`prayer-adon-olam`, and others for further examples. No code change was
needed for this option — it was already built as part of the data-model
work; this section just makes the decision explicit rather than leaving it
implicit.

**(3) Settings toggle — same blocker as (1).** A toggle with no variant
content behind it is the same problem as onboarding, just moved later. Not
viable before the content investment in (1) is made, if it's ever made.

**(4) Refuse to present as a formal prayer until handled — already achieved
by a different, existing mechanism, not this one.** The app never claims
that reading any item (Ashkenazi-worded or not) fulfills a formal tefillah
obligation — see `standaloneGuidance` across the library, and
`serviceRoleKind: 'prayer_component'` items in particular (Sim Shalom,
Refaeinu, Baruch Sheamar), which are explicitly framed as fragments, not
complete prayers, regardless of nusach. That framing already does the work
option (4) is asking for; it doesn't need a nusach-specific version of the
same idea.

## What this means concretely

- No onboarding change.
- No Settings change.
- The text shown for nusach-sensitive items stays what it is today
  (predominantly Ashkenazi-normative where a real difference exists), but
  is never presented as *the* universal Jewish text — the "why?" panel says
  plainly when another community's practice differs and how.
- If the app later wants real nusach selection, that's a separate, larger
  decision (new content across every affected item, verified per-claim like
  everything else here) — not something this audit is implementing or
  scoping in detail, the way `halachic-time-scoping.md` scopes zmanim.
  Flagging it as a known future option, not a plan in motion.

## Items currently carrying a documented, surfaced nusach difference

`prayer-modeh-ani`, `prayer-adon-olam`, `prayer-ana-bekoach` (frequency),
`prayer-aleinu`, `prayer-ein-keloheinu`, `prayer-hashkiveinu` (via its
Shabbat calendar variant note), `prayer-sim-shalom`, `prayer-baruch-sheamar`
(standing custom), `tehillim-126`, `tehillim-130`, `tehillim-134`, plus the
Pirkei Avot genre note on the Shabbat-study custom. See each item's
`liturgicalContext.nusachDifferences` and the main research doc for sources.

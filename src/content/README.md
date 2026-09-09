# Content packs

Each file matches `ContentItem[]` from `types.ts`. `meta.json` tracks
`contentVersion` so the app can detect a newer content pack pushed via EAS
Update (see architecture plan, Content Architecture section).

## contentVersion 5 — complete-text rebuild

As of contentVersion 5, `isTraditional: true` items (`tehillim.json`,
`daily_prayers.json`, `biblical_songs.json`, `chazal.json`,
`torah_wisdom.json`) are never truncated excerpts. A Psalm is the complete
chapter, verse by verse; a Siddur prayer is its complete standard text
(skipping only halachic instructional notes and optional name-insert
placeholders that aren't themselves part of the fixed recited text).
`chazal.json`/`torah_wisdom.json` entries are complete in themselves — a
single Mishnah/Talmudic maxim is a whole unit, not a shortened excerpt of a
longer source.

`tehillim.json`, `daily_prayers.json`, and `biblical_songs.json` were built
from Sefaria's Miqra'ot (Masoretic Tanach) and Siddur Ashkenaz text APIs —
every `verses[].hebrewText` string is copied verbatim from a fetched, cited
source (chapter+verse for Tanach; the matching Siddur Ashkenaz node for
prayers), then normalized: cantillation marks stripped, the Tetragrammaton
rendered as `ה'`, and the "-הים" Elokim-root suffix rendered "-קים" (the
customary print convention). `chazal.json`/`torah_wisdom.json` predate this
pass and keep their original hand-checked text, just reshaped into the
single-verse `verses[]` array the new schema expects — the app is
Hebrew-only, so no English translation field is carried in any pack.

`kind` (`psalm` | `prayer` | `biblical_song` | `wisdom` | `reflection` |
`personal`) and `isTraditional` are the authenticity classification the UI
relies on — see the note on `ContentKind` in `types.ts`. Nothing in these
five bundled packs is AI-generated; `reflection`/`personal` exist in the
type for future original content and must always be visibly labeled as
such, never presented as a traditional source.

## contentVersion 6 — time-of-day awareness

`ContentItem` gained an optional `timeWindows?: DayPart[]` field
(`DayPart` = `'anytime' | 'morning' | 'afternoon' | 'night'`, see
`dayPart.ts`). Only the handful of `daily_prayers.json` items with a real,
obvious time affinity were tagged (`prayer-modeh-ani`/`prayer-baruch-sheamar`
→ morning, `prayer-shema` → morning+night, `prayer-hashkiveinu` → night,
`prayer-ashrei` → morning+afternoon); everything else — including all of
Tehillim, Chazal, Torah wisdom, and the rest of the daily prayers — is left
untagged (implicitly `anytime`), matching real practice. This is a coarse
device-clock bucket, not real halachic zmanim (no sunrise/location
calculation) — see `pickContentForMood`/`pickPrayer` in `index.ts` for how
it's applied, always with a same-mood fallback so a narrow time window can
never make a pick come back empty.

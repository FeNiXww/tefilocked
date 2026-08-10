# Content packs

A handful of items per mood so the filter/selection logic and UI have
something real to render. Every Hebrew liturgical text here (Tehillim,
prayers, Pirkei Avot quotes) has been checked against a printed siddur/Tanach.

Each file matches `ContentItem[]` from `types.ts`. `meta.json` tracks
`contentVersion` so the app can detect a newer content pack pushed via EAS
Update (see architecture plan, Content Architecture section).

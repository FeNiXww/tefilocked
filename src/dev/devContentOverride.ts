/**
 * Dev-only override so a specific content item (e.g. Shema) can be forced
 * open deterministically for testing, instead of hoping the random pool
 * lands on it. In-memory only (module-level variable, not persisted to
 * MMKV) — resets on every reload, and every consumer gates on `__DEV__` in
 * addition to this module existing, so there is no path for this to affect
 * a production build even if the check here were ever bypassed by mistake.
 *
 * Set from Settings' dev section (`__DEV__`-only); read once by
 * `useLockContentFlow.selectMood`, which — in dev builds only — returns
 * this item instead of calling `pickContentForMood`.
 */
let forcedContentId: string | null = null;

export function setDevForcedContentId(id: string | null): void {
  if (!__DEV__) return;
  forcedContentId = id;
}

export function getDevForcedContentId(): string | null {
  if (!__DEV__) return null;
  return forcedContentId;
}

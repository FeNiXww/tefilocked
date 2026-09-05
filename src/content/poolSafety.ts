import {
  buildEligibilityContext,
  evaluateLiturgicalEligibility,
  isEligibleForRandomPool as isStatusEligible,
  resolveDiasporaOrIsrael,
  type EligibilityContext,
  type EligibilityLocation,
} from './liturgicalEligibility';
import type { ContentItem } from './types';
import type { UserRegion } from '../data/storage/mmkv';

/**
 * The random-pool gate — now a thin wrapper over the central Liturgical
 * Eligibility Engine (`liturgicalEligibility.ts`), not a separate rule set.
 * Previously this file had its own 7-category classification computed
 * independently from the "why?" panel's logic; that duplication is gone —
 * both now read the same `evaluateLiturgicalEligibility` call, so they
 * cannot silently drift apart.
 *
 * Takes an already-built `EligibilityContext` (see `buildEligibilityContext`)
 * so callers filtering many items in one pass — e.g. `index.ts`'s
 * `filterEligible` — build the Hebrew-calendar/zmanim context once and reuse
 * it, instead of each item re-deriving it (that per-item rebuild used to
 * dominate the mood-pick and duration-confirm handlers with redundant
 * astronomical math).
 */
export function isEligibleContent(item: ContentItem, context: EligibilityContext): boolean {
  const result = evaluateLiturgicalEligibility(item, context);
  return isStatusEligible(result.status);
}

/**
 * Single-item convenience wrapper that builds its own context. `now`/
 * `location`/`region` default to "right now, no location, unknown region" so
 * existing callers don't need to change — only
 * `TIME_NOT_YET`/`TIME_EXPIRED`/`CALENDAR_RESTRICTED` actually need live
 * date/location/region to matter, and those only ever narrow the pool when
 * the engine has real data to be sure (see `liturgicalEligibility.ts`).
 *
 * Prefer `isEligibleContent` with a shared context when checking more than
 * one item against the same `now`/`location`/`region`.
 */
export function isSafeForRandomPool(
  item: ContentItem,
  now: Date = new Date(),
  location: EligibilityLocation | null = null,
  region: UserRegion = 'unknown'
): boolean {
  const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(region));
  return isEligibleContent(item, context);
}

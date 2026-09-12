import {
  buildEligibilityContext,
  evaluateLiturgicalEligibility,
  isEligibleForRandomPool as isStatusEligible,
  resolveDiasporaOrIsrael,
  type EligibilityContext,
  type EligibilityLocation,
} from './liturgicalEligibility';
import type { ContentItem } from './types';

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
 * `location` default to "right now, no location" so existing callers don't
 * need to change. Region is no longer a separate input — it's derived from
 * the same `location` via `resolveDiasporaOrIsrael` (see that function's
 * doc comment for what "no location" resolves to).
 *
 * Prefer `isEligibleContent` with a shared context when checking more than
 * one item against the same `now`/`location`.
 */
export function isSafeForRandomPool(
  item: ContentItem,
  now: Date = new Date(),
  location: EligibilityLocation | null = null
): boolean {
  const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(location));
  return isEligibleContent(item, context);
}

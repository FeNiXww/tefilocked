import dailyPrayers from './daily_prayers.json';
import tehillim from './tehillim.json';
import biblicalSongs from './biblical_songs.json';
import torahWisdom from './torah_wisdom.json';
import chazal from './chazal.json';
import meta from './meta.json';
import { storage } from '../data/storage/mmkv';
import { getCurrentDayPart } from './dayPart';
import { isEligibleContent } from './poolSafety';
import { buildEligibilityContext, resolveDiasporaOrIsrael } from './liturgicalEligibility';
import { getCachedZmanimLocation } from '../native/location';
import { getUserRegion } from '../data/storage/mmkv';
import type { ContentItem, ContentType, DayPart, Mood } from './types';

// "personal_prayers" has no bundled pack — it's user-authored content (the
// questionnaire's "Personal prayers" option), not part of the seeded library.
const ALL_CONTENT: ContentItem[] = [
  ...(dailyPrayers as ContentItem[]),
  ...(tehillim as ContentItem[]),
  ...(biblicalSongs as ContentItem[]),
  ...(torahWisdom as ContentItem[]),
  ...(chazal as ContentItem[]),
];

/** First verse's Hebrew, for a short card preview — never the full text. */
export function previewLine(item: ContentItem): string {
  return item.verses[0]?.hebrewText ?? '';
}

export const contentVersion = meta.contentVersion;

const RECENTLY_SHOWN_LIMIT = 5;

function recentlyShownKey(category: string): string {
  return `content.recentlyShown.${category}`;
}

function getRecentlyShown(category: string): string[] {
  const raw = storage.getString(recentlyShownKey(category));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function pushRecentlyShown(category: string, contentId: string): void {
  const recent = [contentId, ...getRecentlyShown(category).filter((id) => id !== contentId)].slice(
    0,
    RECENTLY_SHOWN_LIMIT
  );
  storage.set(recentlyShownKey(category), JSON.stringify(recent));
}

/**
 * Picks one item from the pool, biased away from whatever was most recently
 * shown for the given category, and records the pick. If every candidate was
 * recently shown (small content pool), falls back to the full pool minus just
 * the single most-recent pick — so back-to-back repeats are never possible,
 * even once the recency buffer has cycled through the whole pool.
 */
function pickRandomWithRecencyAvoidance(pool: ContentItem[], category: string): ContentItem | null {
  if (pool.length === 0) return null;

  const recentlyShown = getRecentlyShown(category);
  const recentlyShownSet = new Set(recentlyShown);
  const fresh = pool.filter((item) => !recentlyShownSet.has(item.id));

  let candidates = fresh;
  if (candidates.length === 0) {
    const lastShownId = recentlyShown[0];
    const withoutLast = pool.filter((item) => item.id !== lastShownId);
    candidates = withoutLast.length > 0 ? withoutLast : pool;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  pushRecentlyShown(category, chosen.id);
  return chosen;
}

/** True if `item` has no time restriction, or its restriction includes the given day part. */
function isTimeEligible(item: ContentItem, dayPart: DayPart): boolean {
  const windows = item.timeWindows ?? ['anytime'];
  return windows.includes('anytime') || windows.includes(dayPart);
}

/**
 * Filters `pool` through the Liturgical Eligibility Engine (via
 * `poolSafety.ts`) for `now` — done at *selection* time, not at module-load
 * time, since eligibility can genuinely change through the day
 * (TIME_NOT_YET → available → TIME_EXPIRED) and by calendar day
 * (CALENDAR_RESTRICTED). Reuses whatever zmanim location the user has
 * already granted (see src/native/location.ts) — never requests it here;
 * a pick with no granted location simply can't narrow by real zman, which
 * `poolSafety`/the engine already handle by not fabricating one.
 */
function filterEligible(pool: ContentItem[], now: Date): ContentItem[] {
  const location = getCachedZmanimLocation();
  const region = getUserRegion();
  // Built once per call and reused across every item in `pool` — this used
  // to be rebuilt (Hebrew-date conversion + up to 2 full zmanim computations)
  // inside the filter callback for every single item, which is what made
  // mood/duration selection feel slow (see buildEligibilityContext's doc).
  const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(region));
  return pool.filter((item) => isEligibleContent(item, context));
}

/**
 * Picks one content item for the given mood + the user's preferred content
 * types, biased away from whatever was most recently shown for that mood.
 * Prefers items whose `timeWindows` fit the current time of day (e.g. won't
 * surface a morning-only prayer at night) but never lets that narrow the
 * pool to nothing — a mood match always beats an empty result.
 */
export function pickContentForMood(mood: Mood, preferredTypes: ContentType[], now: Date = new Date()): ContentItem | null {
  const dayPart = getCurrentDayPart(now);
  const preferredSet = new Set(preferredTypes);
  const matches = filterEligible(ALL_CONTENT, now).filter(
    (item) => item.moods.includes(mood) && item.contentTypes.some((t) => preferredSet.has(t))
  );
  const timeEligible = matches.filter((item) => isTimeEligible(item, dayPart));
  const pool = timeEligible.length > 0 ? timeEligible : matches;
  return pickRandomWithRecencyAvoidance(pool, mood);
}

export function getAllContent(): ContentItem[] {
  return ALL_CONTENT;
}

const PRAYER_POOL: ContentItem[] = [
  ...(tehillim as ContentItem[]),
  ...(chazal as ContentItem[]),
  ...(dailyPrayers as ContentItem[]),
  ...(biblicalSongs as ContentItem[]),
];

const PRAYER_RECENCY_CATEGORY = 'prayerOfTheMoment';

/**
 * Picks a random prayer, biased away from whatever was most recently shown.
 * `excludeId` keeps it from matching the quote item just shown in the same
 * trigger; falls back to the full pool if excluding would empty it. Prefers
 * the current time-of-day's eligible items the same way `pickContentForMood`
 * does, with the same never-return-nothing fallback.
 */
export function pickPrayer(excludeId?: string, now: Date = new Date()): ContentItem | null {
  const dayPart = getCurrentDayPart(now);
  const eligible = filterEligible(PRAYER_POOL, now);
  const pool = excludeId ? eligible.filter((item) => item.id !== excludeId) : eligible;
  const basePool = pool.length > 0 ? pool : eligible;
  const timeEligible = basePool.filter((item) => isTimeEligible(item, dayPart));
  const finalPool = timeEligible.length > 0 ? timeEligible : basePool;
  return pickRandomWithRecencyAvoidance(finalPool, PRAYER_RECENCY_CATEGORY);
}

import dailyPrayers from './daily_prayers.json';
import tehillim from './tehillim.json';
import torahWisdom from './torah_wisdom.json';
import chazal from './chazal.json';
import meta from './meta.json';
import { storage } from '../data/storage/mmkv';
import type { ContentItem, ContentType, Mood } from './types';

// "personal_prayers" has no bundled pack — it's user-authored content (the
// questionnaire's "Personal prayers" option), not part of the seeded library.
const ALL_CONTENT: ContentItem[] = [
  ...(dailyPrayers as ContentItem[]),
  ...(tehillim as ContentItem[]),
  ...(torahWisdom as ContentItem[]),
  ...(chazal as ContentItem[]),
];

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

/**
 * Picks one content item for the given mood + the user's preferred content
 * types, biased away from whatever was most recently shown for that mood.
 */
export function pickContentForMood(mood: Mood, preferredTypes: ContentType[]): ContentItem | null {
  const preferredSet = new Set(preferredTypes);
  const matches = ALL_CONTENT.filter(
    (item) => item.moods.includes(mood) && item.contentTypes.some((t) => preferredSet.has(t))
  );
  return pickRandomWithRecencyAvoidance(matches, mood);
}

export function getAllContent(): ContentItem[] {
  return ALL_CONTENT;
}

const PRAYER_POOL: ContentItem[] = [
  ...(tehillim as ContentItem[]),
  ...(chazal as ContentItem[]),
  ...(dailyPrayers as ContentItem[]),
];

const PRAYER_RECENCY_CATEGORY = 'prayerOfTheMoment';

/**
 * Picks a random prayer, biased away from whatever was most recently shown.
 * `excludeId` keeps it from matching the quote item just shown in the same
 * trigger; falls back to the full pool if excluding would empty it.
 */
export function pickPrayer(excludeId?: string): ContentItem | null {
  const pool = excludeId ? PRAYER_POOL.filter((item) => item.id !== excludeId) : PRAYER_POOL;
  return pickRandomWithRecencyAvoidance(pool.length > 0 ? pool : PRAYER_POOL, PRAYER_RECENCY_CATEGORY);
}

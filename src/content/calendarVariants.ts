import { isShabbatToday } from './calendar';
import type { ContentItem, Verse } from './types';

/**
 * Picks the verses to actually display for `item` on `date` — the Shabbat
 * variant when one exists and today is Shabbat, otherwise the standard
 * `verses`. The one place this substitution happens, so both app flows
 * (locked-app interception and the onboarding demo, which share
 * ContentDisplay) show the same text for the same day.
 */
export function resolveVerses(item: ContentItem, date: Date = new Date()): Verse[] {
  const shabbatVerses = item.calendarVariantVerses?.shabbat;
  if (shabbatVerses && isShabbatToday(date)) return shabbatVerses;
  return item.verses;
}

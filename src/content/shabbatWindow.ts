import { isPhoneRestrictedDay, type DiasporaOrIsrael } from './hebrewCalendar';
import { computeZmanim } from './zmanim';

/**
 * Real sunset/tzeit-aware Shabbat & Yom Tov detection, for streak
 * protection — layered on top of `hebrewCalendar.ts` (which is deliberately
 * location-free) and `zmanim.ts` (which does the actual sunset/nightfall
 * math). Kept as its own module so `hebrewCalendar.ts` never has to depend
 * on location.
 *
 * Boundary used: sunset (not candle-lighting, which communities bring
 * forward by their own number of minutes) to tzeit hakochavim (nightfall) —
 * the same "don't fake precision the app doesn't have a real opinion on"
 * posture as the rest of zmanim.ts. When no location is available (not yet
 * granted, denied, or the library couldn't compute sunset/tzais at all —
 * e.g. near the poles), every function here falls back to
 * `isPhoneRestrictedDay`'s calendar-day-of-week check.
 */

export interface ZmanimLocation {
  latitude: number;
  longitude: number;
  elevation: number;
}

/**
 * The Gregorian date whose calendar-day restriction (see
 * `isPhoneRestrictedDay`) is actually in effect *right now*, or `null` if
 * phone use isn't currently restricted. This is `now`'s own date before
 * tonight's nightfall, or tomorrow's date once tonight's sunset has passed
 * (since the Hebrew day — and Shabbat/Yom Tov — begins at sunset, not
 * midnight) — e.g. Friday evening after sunset resolves to Saturday's date,
 * which is what makes the Shabbat check fire for Friday evening at all.
 * Callers that need to know *which* day it halachically is (not just
 * whether phone use is restricted) — e.g. to greet "שבת שלום" vs a specific
 * Yom Tov — should use this rather than `now`'s own Gregorian date.
 */
export function getEffectiveRestrictedDate(
  now: Date,
  location: ZmanimLocation | null,
  diasporaOrIsrael: DiasporaOrIsrael
): Date | null {
  if (!location) return isPhoneRestrictedDay(now, diasporaOrIsrael) ? now : null;

  const z = computeZmanim(now, location.latitude, location.longitude, location.elevation);
  if (!z.sunset || !z.tzais) return isPhoneRestrictedDay(now, diasporaOrIsrael) ? now : null;

  // Still within "today"'s Hebrew day (before tonight's nightfall) — e.g.
  // Saturday afternoon, or any point during a Yom Tov day itself.
  if (now.getTime() < z.tzais.getTime() && isPhoneRestrictedDay(now, diasporaOrIsrael)) {
    return now;
  }
  // Past tonight's sunset — the next Hebrew day may have already begun
  // (e.g. Friday evening rolling into Shabbat, or erev Yom Tov into Yom Tov).
  if (now.getTime() >= z.sunset.getTime()) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isPhoneRestrictedDay(tomorrow, diasporaOrIsrael)) return tomorrow;
  }
  return null;
}

/**
 * Whether phone use is halachically restricted at this exact instant.
 * Unlike `isPhoneRestrictedDay` (which only knows "is today's Gregorian
 * date Shabbat/Yom Tov"), this also catches the hours that actually matter
 * to a user checking their phone in real time: Friday evening after
 * sunset, and the hours between Saturday's own sunset and Havdalah.
 */
export function isPhoneRestrictedNow(
  now: Date,
  location: ZmanimLocation | null,
  diasporaOrIsrael: DiasporaOrIsrael
): boolean {
  return getEffectiveRestrictedDate(now, location, diasporaOrIsrael) !== null;
}

/**
 * Whether the UTC calendar-day bucket `dayStr` (see db.ts's `toDayString`)
 * should excuse a missed prayer — used by `getCurrentStreak`'s backward
 * walk. A single day bucket can straddle a real Shabbat/Yom Tov boundary
 * (e.g. "Friday" is an ordinary day until sunset, then already Shabbat), so
 * this checks two representative local instants — midday and late evening —
 * rather than one: if either was genuinely restricted, the whole day counts
 * as protected. This never protects a real ordinary weekday (both checks
 * would be false), but can protect slightly more of a transition day than
 * strictly necessary — the same "safe direction" tradeoff already
 * documented in hebrewCalendar.ts.
 */
export function isProtectedStreakDayAt(
  dayStr: string,
  location: ZmanimLocation | null,
  diasporaOrIsrael: DiasporaOrIsrael
): boolean {
  const midday = new Date(`${dayStr}T12:00:00.000Z`);
  if (isPhoneRestrictedNow(midday, location, diasporaOrIsrael)) return true;

  // A genuine local instant (not a UTC anchor) — sunset always happens
  // before 23:00 local outside the polar regions this app doesn't attempt
  // to support, so this reliably lands after Friday/erev-Yom-Tov sunset.
  const [year, month, day] = dayStr.split('-').map(Number);
  const lateEvening = new Date(year, month - 1, day, 23, 0, 0);
  return isPhoneRestrictedNow(lateEvening, location, diasporaOrIsrael);
}

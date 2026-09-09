/**
 * Day-of-week-only Shabbat detection — deliberately not real zmanim (no
 * sunset/havdalah calculation, matching `dayPart.ts`'s existing philosophy of
 * never faking halachic precision the app doesn't have the data to back).
 * Saturday counts as Shabbat; Friday evening after sunset (already Shabbat
 * halachically) and Saturday night before havdalah (still Shabbat) are NOT
 * detected — both would require real sunset times. Yom Tov, Rosh Hashanah,
 * and Yom Kippur are out of scope entirely: unlike Shabbat, they don't fall
 * on a fixed day of the week, so detecting them needs a Hebrew-calendar
 * library, not just `Date.getDay()` — a separate, larger piece of work.
 */
export function isShabbatToday(date: Date = new Date()): boolean {
  return date.getDay() === 6;
}

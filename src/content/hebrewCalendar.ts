import { calcDaysInMonth, isLeapYear, toJewishDate } from 'jewish-date';
import type { JewishDate } from 'jewish-date';

/**
 * Real Hebrew-calendar layer — Gregorian↔Hebrew conversion via `jewish-date`
 * (MIT-licensed, chosen specifically to avoid the GPL-2.0 licensing the
 * entire `@hebcal` ecosystem carries; see
 * src/content/research/calendar-zmanim-infrastructure.md for the license
 * comparison). Holiday/fast-day/Rosh-Chodesh detection is this project's
 * own logic on top of that conversion — deterministic date math, not a
 * halachic judgment call, but every rule below is still sourced (see the
 * same doc) rather than assumed.
 *
 * Deliberately does NOT depend on location. `diasporaOrIsrael` defaults to
 * `'diaspora'` (documented assumption, not silently guessed) because the
 * app has no reliable signal for where the user actually is unless they've
 * separately granted zmanim location access (see zmanim.ts) — and even
 * then, "current GPS location" and "which Yom Tov schedule the user
 * personally observes" aren't the same fact (a diaspora Jew traveling in
 * Israel still keeps two days). Never silently switched by GPS.
 */

export type DiasporaOrIsrael = 'diaspora' | 'israel';

export type FastDay =
  | 'tzom_gedaliah'
  | 'asara_btevet'
  | 'taanit_esther'
  | 'shiva_asar_btammuz'
  | 'tisha_bav';

export interface JewishCalendarContext {
  gregorianDate: Date;
  hebrewDate: JewishDate;
  /** 0 = Sunday ... 6 = Saturday, from the Gregorian date — the same convention `calendar.ts`'s `isShabbatToday` uses. */
  dayOfWeek: number;
  isShabbat: boolean;
  isFriday: boolean;
  isSaturday: boolean;
  isRoshChodesh: boolean;
  isRoshHashanah: boolean;
  isYomKippur: boolean;
  isSukkot: boolean;
  isSheminiAtzeret: boolean;
  isSimchatTorah: boolean;
  isPesach: boolean;
  isShavuot: boolean;
  isChanukah: boolean;
  isPurim: boolean;
  isShushanPurim: boolean;
  /** Any of the 5 minor/major fast days below, already adjusted for the Shabbat-postponement rules — null on a non-fast day. */
  fastDay: FastDay | null;
  /** True for any of the Yom Tov checks above — a quick "is this a day with special liturgy" flag, not a halachic ruling about work restrictions. */
  isYomTov: boolean;
  diasporaOrIsrael: DiasporaOrIsrael;
}

const isMonth = (hd: JewishDate, month: string) => hd.monthName === month;

function isRoshChodesh(hd: JewishDate): boolean {
  if (hd.day === 1) return true;
  // Day 30 of a 30-day month is also Rosh Chodesh (of the following month,
  // observed together with day 1) — Rosh Chodesh is a 2-day observance
  // whenever the outgoing month has 30 days. Source: Shulchan Aruch Orach
  // Chaim 417; see calendar-zmanim-infrastructure.md.
  return hd.day === 30;
}

/** Chanukah: 25 Kislev for 8 days, crossing into Tevet — length of Kislev varies by year (29 or 30 days), so this is computed from the actual month length, never a fixed end-date. Source: Shulchan Aruch Orach Chaim 670. */
function isChanukah(hd: JewishDate): boolean {
  if (isMonth(hd, 'Kislev') && hd.day >= 25) return true;
  if (isMonth(hd, 'Tevet')) {
    const kislevLength = calcDaysInMonth(hd.year, 'Kislev');
    const daysOfChanukahInKislev = kislevLength - 25 + 1; // 25..kislevLength
    const daysRemainingInTevet = 8 - daysOfChanukahInKislev;
    return hd.day <= daysRemainingInTevet;
  }
  return false;
}

/** Purim: 14 Adar (14 Adar II in a leap year, since Purim is observed in the second Adar per Megillah 6b). Shushan Purim (walled cities, e.g. Jerusalem) is 15 Adar/Adar II — modeled here as a date fact only; the app has no per-user "is your city walled" signal. */
function purimMonthName(hd: JewishDate): string {
  return isLeapYear(hd.year) ? 'AdarII' : 'Adar';
}

/**
 * A fast day's *base* Hebrew date, before the Shabbat-postponement rules
 * below are applied. Sources: Shulchan Aruch Orach Chaim 549-550, 686;
 * see calendar-zmanim-infrastructure.md for the full citation per fast.
 */
function baseFastDay(hd: JewishDate): FastDay | null {
  if (isMonth(hd, 'Tishri') && hd.day === 3) return 'tzom_gedaliah';
  if (isMonth(hd, 'Tevet') && hd.day === 10) return 'asara_btevet';
  if (isMonth(hd, purimMonthName(hd)) && hd.day === 13) return 'taanit_esther';
  if (isMonth(hd, 'Tammuz') && hd.day === 17) return 'shiva_asar_btammuz';
  if (isMonth(hd, 'Av') && hd.day === 9) return 'tisha_bav';
  return null;
}

/**
 * Applies each fast's specific Shabbat-handling rule:
 * - Tzom Gedaliah, Shiva Asar B'Tammuz, Tisha B'Av: postponed to Sunday
 *   (the next day) when the base date is Shabbat.
 * - Asara B'Tevet: never postponed — uniquely, per the fixed Hebrew
 *   calendar's molad rules, 10 Tevet can fall on Friday but never on
 *   Shabbat itself, so this case doesn't arise in practice. No adjustment
 *   applied.
 * - Ta'anit Esther: moved *earlier*, to the preceding Thursday (11 Adar/
 *   Adar II), when the base date is Shabbat — not postponed to Sunday,
 *   because fasting the day after Purim/Shushan Purim would conflict with
 *   their festive character ("ain makdimin puranuta" — Megillah 5a).
 * Source: Chabad.org, "Fast of Esther" (citing this reasoning); Halachipedia,
 * "Fast Days". See calendar-zmanim-infrastructure.md.
 */
function isFastDayObserved(target: FastDay, date: Date, hd: JewishDate): boolean {
  const base = baseFastDay(hd);
  const dayOfWeek = date.getDay();

  if (base === target) {
    if (target === 'taanit_esther') return dayOfWeek !== 6; // moved off Shabbat entirely, to Thursday — checked below instead
    if (dayOfWeek === 6 && target !== 'asara_btevet') return false; // postponed to Sunday, handled below
    return true;
  }

  // Postponed-to-Sunday fasts: check if *yesterday* (Shabbat) was the base date.
  if (dayOfWeek === 0 && (target === 'tzom_gedaliah' || target === 'shiva_asar_btammuz' || target === 'tisha_bav')) {
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayHd = toJewishDate(yesterday);
    return baseFastDay(yesterdayHd) === target;
  }

  // Ta'anit Esther moved earlier to Thursday: check if *the coming Saturday* is 13 Adar/Adar II.
  if (target === 'taanit_esther' && dayOfWeek === 4) {
    const upcomingSaturday = new Date(date);
    upcomingSaturday.setDate(upcomingSaturday.getDate() + 2);
    const saturdayHd = toJewishDate(upcomingSaturday);
    return baseFastDay(saturdayHd) === 'taanit_esther';
  }

  return false;
}

function resolveFastDay(date: Date, hd: JewishDate): FastDay | null {
  const candidates: FastDay[] = ['tzom_gedaliah', 'asara_btevet', 'taanit_esther', 'shiva_asar_btammuz', 'tisha_bav'];
  return candidates.find((f) => isFastDayObserved(f, date, hd)) ?? null;
}

export function getJewishCalendarContext(
  date: Date = new Date(),
  diasporaOrIsrael: DiasporaOrIsrael = 'diaspora'
): JewishCalendarContext {
  const hd = toJewishDate(date);
  const dayOfWeek = date.getDay();

  // Sukkot: 15-21 Tishrei everywhere (Chol HaMoed extends the same in both).
  // Source: Vayikra 23:34-36; Shulchan Aruch OC 625, 663.
  const isSukkot = isMonth(hd, 'Tishri') && hd.day >= 15 && hd.day <= 21;
  // Shemini Atzeret: 22 Tishrei everywhere.
  const isSheminiAtzeret = isMonth(hd, 'Tishri') && hd.day === 22;
  // Simchat Torah: combined with Shemini Atzeret (22 Tishrei) in Israel;
  // a separate 23 Tishrei in the diaspora's added Yom Tov Sheni day.
  // Source: Chabad.org / OU.org holiday calendars.
  const isSimchatTorah =
    diasporaOrIsrael === 'israel' ? isSheminiAtzeret : isMonth(hd, 'Tishri') && hd.day === 23;

  // Pesach: 15-21 Nisan in Israel, 15-22 Nisan in the diaspora (Yom Tov
  // Sheni Shel Galuyot). Source: Vayikra 23:5-8; Shulchan Aruch OC 429.
  const pesachEndDay = diasporaOrIsrael === 'israel' ? 21 : 22;
  const isPesach = isMonth(hd, 'Nisan') && hd.day >= 15 && hd.day <= pesachEndDay;

  // Shavuot: 6 Sivan in Israel (one day); 6-7 Sivan in the diaspora.
  const isShavuot = isMonth(hd, 'Sivan') && (hd.day === 6 || (diasporaOrIsrael === 'diaspora' && hd.day === 7));

  const isRoshHashanah = isMonth(hd, 'Tishri') && (hd.day === 1 || hd.day === 2);
  const isYomKippur = isMonth(hd, 'Tishri') && hd.day === 10;
  const isChanukahToday = isChanukah(hd);
  const isPurimToday = isMonth(hd, purimMonthName(hd)) && hd.day === 14;
  const isShushanPurimToday = isMonth(hd, purimMonthName(hd)) && hd.day === 15;

  return {
    gregorianDate: date,
    hebrewDate: hd,
    dayOfWeek,
    isShabbat: dayOfWeek === 6,
    isFriday: dayOfWeek === 5,
    isSaturday: dayOfWeek === 6,
    isRoshChodesh: isRoshChodesh(hd),
    isRoshHashanah,
    isYomKippur,
    isSukkot,
    isSheminiAtzeret,
    isSimchatTorah,
    isPesach,
    isShavuot,
    isChanukah: isChanukahToday,
    isPurim: isPurimToday,
    isShushanPurim: isShushanPurimToday,
    fastDay: resolveFastDay(date, hd),
    isYomTov: isRoshHashanah || isYomKippur || isSukkot || isSheminiAtzeret || isSimchatTorah || isPesach || isShavuot,
    diasporaOrIsrael,
  };
}

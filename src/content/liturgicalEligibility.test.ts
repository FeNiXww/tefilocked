import { describe, expect, it } from 'vitest';
import { buildEligibilityContext, evaluateLiturgicalEligibility, isEligibleForRandomPool } from './liturgicalEligibility';
import { isSafeForRandomPool } from './poolSafety';
import { getJewishCalendarContext, isPhoneRestrictedDay } from './hebrewCalendar';
import { computeZmanim } from './zmanim';
import { resolveVerses } from './calendarVariants';
import { isShabbatToday } from './calendar';
import dailyPrayers from './daily_prayers.json';
import tehillim from './tehillim.json';
import chazal from './chazal.json';
import type { ContentItem } from './types';

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137, elevation: 0 };

const items = dailyPrayers as ContentItem[];
const tehillimItems = tehillim as ContentItem[];
const chazalItems = chazal as ContentItem[];

const shema = items.find((i) => i.id === 'prayer-shema')!;
const simShalom = items.find((i) => i.id === 'prayer-sim-shalom')!;
const shehecheyanu = items.find((i) => i.id === 'prayer-shehecheyanu')!;
const tefilatHaderech = items.find((i) => i.id === 'prayer-tefilat-haderech')!;
const hashkiveinu = items.find((i) => i.id === 'prayer-hashkiveinu')!;
const adonOlam = items.find((i) => i.id === 'prayer-adon-olam')!;
const psalm100 = tehillimItems.find((i) => i.id === 'tehillim-100')!;
const pirkeiAvot = chazalItems.find((i) => i.id === 'avot-1-6-judge-favorably')!;

describe('hebrewCalendar', () => {
  it('matches an independently-verified reference date', () => {
    // 2026-08-29 = 16 Elul 5786, confirmed against Chabad.org's own "today" display during research.
    const ctx = getJewishCalendarContext(new Date('2026-08-29T12:00:00'));
    expect(ctx.hebrewDate.day).toBe(16);
    expect(ctx.hebrewDate.monthName).toBe('Elul');
    expect(ctx.hebrewDate.year).toBe(5786);
    expect(ctx.isShabbat).toBe(true);
  });

  it('detects a calendar transition — fast day postponed off Shabbat to Sunday', () => {
    // 3 Tishrei 5785 (Tzom Gedaliah's base date) fell on Shabbat in 2024;
    // real halacha postpones it to Sunday, 4 Tishrei — verified against
    // Halachipedia's fast-day postponement rule during research.
    const saturday = getJewishCalendarContext(new Date('2024-10-05T12:00:00'));
    expect(saturday.fastDay).toBeNull();
    const sunday = getJewishCalendarContext(new Date('2024-10-06T12:00:00'));
    expect(sunday.fastDay).toBe('tzom_gedaliah');
  });

  it('detects Chanukah as exactly 8 days across the Kislev/Tevet month boundary', () => {
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      if (getJewishCalendarContext(new Date(2026, 11, d, 12)).isChanukah) count++;
    }
    for (let d = 1; d <= 15; d++) {
      if (getJewishCalendarContext(new Date(2027, 0, d, 12)).isChanukah) count++;
    }
    expect(count).toBe(8);
  });

  it('detects a holiday — Yom Kippur, 10 Tishrei', () => {
    const ctx = getJewishCalendarContext(new Date('2026-09-21T12:00:00'));
    expect(ctx.isYomKippur).toBe(true);
    expect(ctx.isYomTov).toBe(true);
  });

  describe('isPhoneRestrictedDay — for streak protection', () => {
    it('flags Shabbat (2026-08-29 = Saturday)', () => {
      expect(isPhoneRestrictedDay(new Date('2026-08-29T12:00:00'))).toBe(true);
    });

    it('does not flag an ordinary Friday (2026-08-28) — matches the existing day-of-week-only Shabbat limitation', () => {
      expect(isPhoneRestrictedDay(new Date('2026-08-28T12:00:00'))).toBe(false);
    });

    it('flags Yom Kippur (2026-09-21, a Monday) regardless of region', () => {
      expect(isPhoneRestrictedDay(new Date('2026-09-21T12:00:00'), 'diaspora')).toBe(true);
      expect(isPhoneRestrictedDay(new Date('2026-09-21T12:00:00'), 'israel')).toBe(true);
    });

    it('does not flag Chol HaMoed Sukkot (2026-09-28, 17 Tishrei — a Monday, mid-festival but not Yom Tov itself)', () => {
      const ctx = getJewishCalendarContext(new Date('2026-09-28T12:00:00'));
      expect(ctx.isSukkot).toBe(true);
      expect(isPhoneRestrictedDay(new Date('2026-09-28T12:00:00'))).toBe(false);
    });

    it('flags Sukkot Yom Tov Sheni (2026-09-27, 16 Tishrei) only in the diaspora', () => {
      expect(isPhoneRestrictedDay(new Date('2026-09-27T12:00:00'), 'diaspora')).toBe(true);
      expect(isPhoneRestrictedDay(new Date('2026-09-27T12:00:00'), 'israel')).toBe(false);
    });

    it('flags Simchat Torah (2026-10-04, diaspora only — Israel already covered it via Shemini Atzeret on 2026-10-03)', () => {
      expect(isPhoneRestrictedDay(new Date('2026-10-03T12:00:00'), 'israel')).toBe(true); // Shemini Atzeret
      expect(isPhoneRestrictedDay(new Date('2026-10-04T12:00:00'), 'diaspora')).toBe(true); // Simchat Torah
      expect(isPhoneRestrictedDay(new Date('2026-10-04T12:00:00'), 'israel')).toBe(false); // ordinary day in Israel
    });

    it('flags Pesach\'s first and seventh days everywhere, and the diaspora-only eighth day (2026-04-09)', () => {
      expect(isPhoneRestrictedDay(new Date('2026-04-02T12:00:00'), 'diaspora')).toBe(true); // 15 Nisan
      expect(isPhoneRestrictedDay(new Date('2026-04-08T12:00:00'), 'diaspora')).toBe(true); // 21 Nisan
      expect(isPhoneRestrictedDay(new Date('2026-04-09T12:00:00'), 'diaspora')).toBe(true); // 22 Nisan
      expect(isPhoneRestrictedDay(new Date('2026-04-09T12:00:00'), 'israel')).toBe(false);
    });

    it('does not flag Chol HaMoed Pesach (2026-04-05, 18 Nisan)', () => {
      const ctx = getJewishCalendarContext(new Date('2026-04-05T12:00:00'));
      expect(ctx.isPesach).toBe(true);
      expect(isPhoneRestrictedDay(new Date('2026-04-05T12:00:00'))).toBe(false);
    });

    it('flags Shavuot everywhere, and the diaspora-only second day (2026-05-23)', () => {
      expect(isPhoneRestrictedDay(new Date('2026-05-22T12:00:00'), 'diaspora')).toBe(true);
      expect(isPhoneRestrictedDay(new Date('2026-05-23T12:00:00'), 'diaspora')).toBe(true);
      // 2026-05-23 also happens to be a Saturday, so it's independently
      // Shabbat-restricted in Israel too that year — not proof the Yom Tov
      // branch is region-gated here. See the Sukkot/Simchat Torah tests
      // above for that (isolated on non-Saturday dates).
      expect(isPhoneRestrictedDay(new Date('2026-05-23T12:00:00'), 'israel')).toBe(true);
    });

    it('does not flag a fast day (Tzom Gedaliah, 2024-10-06) — fasting doesn\'t restrict phone use', () => {
      const ctx = getJewishCalendarContext(new Date('2024-10-06T12:00:00'));
      expect(ctx.fastDay).toBe('tzom_gedaliah');
      expect(isPhoneRestrictedDay(new Date('2024-10-06T12:00:00'))).toBe(false);
    });

    it('does not flag Chanukah — a joyous day with no melacha prohibition', () => {
      const decDays = Array.from({ length: 31 }, (_, i) => new Date(2026, 11, i + 1, 12));
      const chanukahWeekday = decDays.find((d) => getJewishCalendarContext(d).isChanukah && d.getDay() !== 6);
      expect(chanukahWeekday).toBeDefined();
      expect(isPhoneRestrictedDay(chanukahWeekday!)).toBe(false);
    });

    it('does not flag an ordinary weekday', () => {
      expect(isPhoneRestrictedDay(new Date('2026-08-26T12:00:00'))).toBe(false); // Wednesday, no holiday
    });
  });
});

describe('zmanim', () => {
  it('computes sunrise/sunset within ~2 minutes of an independent astronomical API (sunrise-sunset.org) at sea level', () => {
    const z = computeZmanim(new Date('2026-08-29T12:00:00'), JERUSALEM.latitude, JERUSALEM.longitude, 0);
    // API reference (fetched during research): sunrise 06:11:37, sunset 19:08:36 local time.
    const expectedSunrise = new Date('2026-08-29T06:11:37');
    const expectedSunset = new Date('2026-08-29T19:08:36');
    expect(Math.abs(z.sunrise!.getTime() - expectedSunrise.getTime())).toBeLessThan(3 * 60 * 1000);
    expect(Math.abs(z.sunset!.getTime() - expectedSunset.getTime())).toBeLessThan(3 * 60 * 1000);
  });

  it('orders sof zman shma MGA before GRA (MGA counts from dawn, an earlier start than sunrise)', () => {
    const z = computeZmanim(new Date('2026-08-29T12:00:00'), JERUSALEM.latitude, JERUSALEM.longitude, 0);
    expect(z.sofZmanShma.mga!.getTime()).toBeLessThan(z.sofZmanShma.gra!.getTime());
  });
});

describe('evaluateLiturgicalEligibility — Shema (real halachic zman)', () => {
  // Shema is a twice-daily obligation, so at almost any clock time there is
  // always a *most recently closed* window to report against (last night's,
  // or this morning's) — which is more informative than "not yet," so the
  // engine prefers TIME_EXPIRED over TIME_NOT_YET whenever both could apply.
  // A pure "genuinely nothing has happened yet" TIME_NOT_YET state is
  // consequently rare for this specific item — see the dedicated dead-zone
  // test below for the case this most often shows up as.
  it('TIME_EXPIRED at 3am — last night\'s window already closed at halachic midnight, today\'s dawn is still hours away', () => {
    const now = new Date('2026-08-29T03:00:00');
    const ctx = buildEligibilityContext(now, JERUSALEM);
    expect(evaluateLiturgicalEligibility(shema, ctx).status).toBe('TIME_EXPIRED');
  });

  it('TIME_NOT_YET is reachable when the "last night" boundary itself is unavailable (e.g. only forward zmanim could be computed)', () => {
    // Simulates a boundary case by evaluating against a context whose
    // `previousNightZmanim` never got populated (no location) alongside a
    // `zmanim` block for a fixed reference date only — real app usage
    // always computes both together (see buildEligibilityContext), so this
    // specifically exercises the fallback branch rather than a realistic
    // live scenario.
    const now = new Date('2026-08-29T03:00:00');
    const zmanim = computeZmanim(now, JERUSALEM.latitude, JERUSALEM.longitude, JERUSALEM.elevation);
    const calendar = getJewishCalendarContext(now, 'diaspora');
    const ctx = { now, calendar, zmanim, previousNightZmanim: null };
    expect(evaluateLiturgicalEligibility(shema, ctx).status).toBe('TIME_NOT_YET');
  });

  it('not time-blocked during the morning window (falls through to a non-time status)', () => {
    const now = new Date('2026-08-29T07:00:00');
    const ctx = buildEligibilityContext(now, JERUSALEM);
    const status = evaluateLiturgicalEligibility(shema, ctx).status;
    expect(status).not.toBe('TIME_NOT_YET');
    expect(status).not.toBe('TIME_EXPIRED');
  });

  it('TIME_EXPIRED after the morning window, before chatzot', () => {
    const now = new Date('2026-08-29T11:00:00');
    const ctx = buildEligibilityContext(now, JERUSALEM);
    expect(evaluateLiturgicalEligibility(shema, ctx).status).toBe('TIME_EXPIRED');
  });

  it('not time-blocked during the evening window', () => {
    const now = new Date('2026-08-29T20:00:00');
    const ctx = buildEligibilityContext(now, JERUSALEM);
    const status = evaluateLiturgicalEligibility(shema, ctx).status;
    expect(status).not.toBe('TIME_NOT_YET');
    expect(status).not.toBe('TIME_EXPIRED');
  });

  it('TIME_EXPIRED in the pre-dawn dead zone (after last night halachic midnight, before today dawn) — the midnight edge case', () => {
    const now = new Date('2026-08-30T01:30:00');
    const ctx = buildEligibilityContext(now, JERUSALEM);
    expect(evaluateLiturgicalEligibility(shema, ctx).status).toBe('TIME_EXPIRED');
  });

  it('never fabricates a time judgment when location is unavailable — blocks outright instead', () => {
    // Same "clearly expired" clock time as the TIME_EXPIRED test above, but
    // with no location granted — must NOT claim TIME_EXPIRED (or TIME_NOT_YET)
    // without real zmanim data to back it. Rather than showing the content
    // ungated (the old behavior), it's now excluded via LOCATION_REQUIRED —
    // see onboarding's LocationPrimer, the one place this is actually asked.
    const now = new Date('2026-08-29T11:00:00');
    const ctx = buildEligibilityContext(now, null);
    const status = evaluateLiturgicalEligibility(shema, ctx).status;
    expect(status).not.toBe('TIME_EXPIRED');
    expect(status).not.toBe('TIME_NOT_YET');
    expect(status).toBe('LOCATION_REQUIRED');
  });

  it('NEGATIVE: Shema does not appear in the random pool when genuinely past its zman with real location data', () => {
    const now = new Date('2026-08-29T11:00:00');
    expect(isSafeForRandomPool(shema, now, JERUSALEM)).toBe(false);
  });
});

describe('evaluateLiturgicalEligibility — blessing requiring context (Amidah fragment)', () => {
  it('Sim Shalom is excluded from the random pool — a single fixed Amidah blessing is never a bare "prayer"', () => {
    const ctx = buildEligibilityContext(new Date('2026-08-29T12:00:00'), null);
    const result = evaluateLiturgicalEligibility(simShalom, ctx);
    expect(result.status).toBe('EXCLUDED_FROM_RANDOM_POOL');
  });

  it('is NOT safe for the random pool — reciting one Amidah blessing out of nineteen, detached and with no occasion, is not a complete act of prayer', () => {
    expect(isSafeForRandomPool(simShalom, new Date(), null)).toBe(false);
  });
});

describe('evaluateLiturgicalEligibility — nusach dependence', () => {
  it('Adon Olam is NUSACH_DEPENDENT (documented placement varies by community)', () => {
    const ctx = buildEligibilityContext(new Date('2026-08-29T12:00:00'), null);
    expect(evaluateLiturgicalEligibility(adonOlam, ctx).status).toBe('NUSACH_DEPENDENT');
  });
});

describe('evaluateLiturgicalEligibility — calendar-restricted content', () => {
  // Psalm 100 itself is now excluded from the random pool entirely (see
  // EXCLUDED_FROM_POOL's doc comment) — not because the Shabbat/Yom Tov
  // `omittedOn` mechanism is wrong (it isn't), but because research also
  // found *additional*, Ashkenazi-specific omission days this app can't
  // safely enforce without nusach data it deliberately doesn't collect.
  // EXCLUDED_FROM_RANDOM_POOL is checked before CALENDAR_RESTRICTED, so it
  // masks the latter for this specific item now — tested directly below —
  // while the underlying `omittedOn`/CALENDAR_RESTRICTED mechanism itself
  // is verified separately against a synthetic fixture so it stays covered
  // independent of this one item's exclusion.
  it('Psalm 100 is EXCLUDED_FROM_RANDOM_POOL regardless of day, not merely CALENDAR_RESTRICTED on Shabbat', () => {
    const shabbatDate = new Date('2026-08-29T12:00:00'); // confirmed Shabbat above
    const weekday = new Date('2026-08-27T12:00:00'); // a Thursday
    expect(evaluateLiturgicalEligibility(psalm100, buildEligibilityContext(shabbatDate, null)).status).toBe(
      'EXCLUDED_FROM_RANDOM_POOL'
    );
    expect(evaluateLiturgicalEligibility(psalm100, buildEligibilityContext(weekday, null)).status).toBe(
      'EXCLUDED_FROM_RANDOM_POOL'
    );
  });

  it('the omittedOn/CALENDAR_RESTRICTED mechanism itself still works, verified against a synthetic fixture (not Psalm 100, which is separately excluded)', () => {
    const synthetic: ContentItem = {
      id: 'test-omitted-on-shabbat',
      kind: 'psalm',
      isTraditional: true,
      title: 'test',
      source: 'test',
      verses: [{ number: 1, hebrewText: 'test' }],
      moods: ['happy'],
      contentTypes: ['tehillim'],
      liturgicalContext: {
        ...psalm100.liturgicalContext!,
        omittedOn: ['shabbat'],
      },
    };
    const shabbatDate = new Date('2026-08-29T12:00:00');
    const weekday = new Date('2026-08-27T12:00:00');
    expect(evaluateLiturgicalEligibility(synthetic, buildEligibilityContext(shabbatDate, null)).status).toBe(
      'CALENDAR_RESTRICTED'
    );
    expect(evaluateLiturgicalEligibility(synthetic, buildEligibilityContext(weekday, null)).status).not.toBe(
      'CALENDAR_RESTRICTED'
    );
  });

  it('NEGATIVE: Psalm 100 does not appear in the random pool on Shabbat', () => {
    const shabbatDate = new Date('2026-08-29T12:00:00');
    expect(isSafeForRandomPool(psalm100, shabbatDate, null)).toBe(false);
  });
});

describe('evaluateLiturgicalEligibility — excluded items', () => {
  it('Shehecheyanu is EXCLUDED_FROM_RANDOM_POOL regardless of date', () => {
    for (const date of ['2026-01-01T12:00:00', '2026-09-15T12:00:00', '2026-12-25T12:00:00']) {
      const ctx = buildEligibilityContext(new Date(date), null);
      expect(evaluateLiturgicalEligibility(shehecheyanu, ctx).status).toBe('EXCLUDED_FROM_RANDOM_POOL');
    }
  });

  it('NEGATIVE: Shehecheyanu never appears in the safe pool, with or without location, on any date', () => {
    expect(isSafeForRandomPool(shehecheyanu, new Date('2026-01-01'), null)).toBe(false);
    expect(isSafeForRandomPool(shehecheyanu, new Date('2026-06-15'), JERUSALEM)).toBe(false);
  });

  it('Tefilat HaDerech is also excluded (weaker but real bracha-levatala risk)', () => {
    expect(isSafeForRandomPool(tefilatHaderech, new Date(), null)).toBe(false);
  });
});

describe('evaluateLiturgicalEligibility — devotional content safe anytime', () => {
  it('a Pirkei Avot excerpt is eligible for the random pool on an arbitrary date/time', () => {
    expect(isSafeForRandomPool(pirkeiAvot, new Date('2026-03-15T15:00:00'), null)).toBe(true);
  });
});

describe('evaluateLiturgicalEligibility — unresearched content ("unknown condition")', () => {
  it('an item with no liturgicalContext is NOT_VERIFIED and excluded from the pool', () => {
    const unresearched: ContentItem = {
      id: 'test-unresearched',
      kind: 'reflection',
      isTraditional: false,
      title: 'test',
      source: 'test',
      verses: [{ number: 1, hebrewText: 'test' }],
      moods: ['happy'],
      contentTypes: ['personal_prayers'],
    };
    const ctx = buildEligibilityContext(new Date(), null);
    const result = evaluateLiturgicalEligibility(unresearched, ctx);
    expect(result.status).toBe('NOT_VERIFIED');
    expect(isEligibleForRandomPool(result.status)).toBe(false);
  });
});

describe('calendarVariants — Shabbat text variant', () => {
  it('shows the correct weekday vs. Shabbat/Yom Tov closing line for Hashkiveinu across a Fri/Sat/Sun boundary', () => {
    const friday = new Date('2026-08-28T20:00:00');
    const saturday = new Date('2026-08-29T20:00:00');
    const sunday = new Date('2026-08-30T20:00:00');

    expect(isShabbatToday(friday)).toBe(false);
    expect(isShabbatToday(saturday)).toBe(true);
    expect(isShabbatToday(sunday)).toBe(false);

    // Normalized before comparison — Hebrew nikud text can carry different
    // (visually-identical) Unicode combining-mark orderings depending on
    // how it was typed/generated, so a raw substring match between
    // independently-typed strings can spuriously fail even when correct.
    const weekdayClosing = resolveVerses(hashkiveinu, friday)[1].hebrewText.normalize('NFC');
    const shabbatClosing = resolveVerses(hashkiveinu, saturday)[1].hebrewText.normalize('NFC');
    const sundayClosing = resolveVerses(hashkiveinu, sunday)[1].hebrewText.normalize('NFC');

    expect(weekdayClosing).toContain('שׁוֹמֵר עַמּוֹ יִשְׂרָאֵל לָעַד'.normalize('NFC'));
    expect(shabbatClosing).toContain('הַפּוֹרֵשׂ סֻכַּת שָׁלוֹם'.normalize('NFC'));
    // Nikud verified directly against Sefaria's API during independent re-verification.
    expect(shabbatClosing).toContain('יְרוּשָׁלָיִם'.normalize('NFC'));
    expect(sundayClosing).toBe(weekdayClosing);
  });
});

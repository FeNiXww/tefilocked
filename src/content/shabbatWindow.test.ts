import { describe, expect, it } from 'vitest';
import { computeZmanim } from './zmanim';
import { getEffectiveRestrictedDate, isPhoneRestrictedNow, isProtectedStreakDayAt, type ZmanimLocation } from './shabbatWindow';

// Same coordinates the existing zmanim tests verify against an independent
// astronomical API — see liturgicalEligibility.test.ts.
const JERUSALEM: ZmanimLocation = { latitude: 31.7683, longitude: 35.2137, elevation: 0 };

// 2026-08-29 is an independently-verified Saturday (see
// liturgicalEligibility.test.ts's hebrewCalendar tests); 2026-08-28 is the
// Friday immediately before it, in the same ordinary (no Yom Tov) week.
const FRIDAY = '2026-08-28';
const SATURDAY = '2026-08-29';
const SUNDAY = '2026-08-30';
const TUESDAY = '2026-08-25';

function fridayZmanim() {
  return computeZmanim(new Date(`${FRIDAY}T12:00:00`), JERUSALEM.latitude, JERUSALEM.longitude, JERUSALEM.elevation);
}

function saturdayZmanim() {
  return computeZmanim(new Date(`${SATURDAY}T12:00:00`), JERUSALEM.latitude, JERUSALEM.longitude, JERUSALEM.elevation);
}

describe('isPhoneRestrictedNow — with a real location', () => {
  it('is NOT restricted on Friday afternoon, well before sunset', () => {
    const z = fridayZmanim();
    const beforeSunset = new Date(z.sunset!.getTime() - 3 * 60 * 60 * 1000);
    expect(isPhoneRestrictedNow(beforeSunset, JERUSALEM, 'israel')).toBe(false);
  });

  it('IS restricted right after Friday sunset — Shabbat has begun even though the Gregorian date is still Friday', () => {
    const z = fridayZmanim();
    const afterSunset = new Date(z.sunset!.getTime() + 60 * 1000);
    expect(isPhoneRestrictedNow(afterSunset, JERUSALEM, 'israel')).toBe(true);
  });

  it('IS restricted on Saturday afternoon', () => {
    expect(isPhoneRestrictedNow(new Date(`${SATURDAY}T14:00:00`), JERUSALEM, 'israel')).toBe(true);
  });

  it('is NOT restricted right after Saturday nightfall (Havdalah)', () => {
    const z = saturdayZmanim();
    const afterTzais = new Date(z.tzais!.getTime() + 60 * 1000);
    expect(isPhoneRestrictedNow(afterTzais, JERUSALEM, 'israel')).toBe(false);
  });

  it('falls back to the calendar-day check when no location is available', () => {
    const z = fridayZmanim();
    const afterSunset = new Date(z.sunset!.getTime() + 60 * 1000);
    // No location: Friday evening still reads as an ordinary Friday.
    expect(isPhoneRestrictedNow(afterSunset, null, 'israel')).toBe(false);
    expect(isPhoneRestrictedNow(new Date(`${SATURDAY}T14:00:00`), null, 'israel')).toBe(true);
  });
});

describe('getEffectiveRestrictedDate', () => {
  it('resolves Friday evening after sunset to Saturday\'s date, not Friday\'s', () => {
    const z = fridayZmanim();
    const afterSunset = new Date(z.sunset!.getTime() + 60 * 1000);
    const effective = getEffectiveRestrictedDate(afterSunset, JERUSALEM, 'israel');
    expect(effective?.toISOString().slice(0, 10)).toBe(SATURDAY);
  });

  it('returns null when nothing is restricted', () => {
    expect(getEffectiveRestrictedDate(new Date(`${TUESDAY}T12:00:00`), JERUSALEM, 'israel')).toBeNull();
  });
});

describe('isProtectedStreakDayAt', () => {
  it('protects the Friday day-bucket (its evening rolled into Shabbat) when a location is known', () => {
    expect(isProtectedStreakDayAt(FRIDAY, JERUSALEM, 'israel')).toBe(true);
  });

  it('protects the Saturday day-bucket', () => {
    expect(isProtectedStreakDayAt(SATURDAY, JERUSALEM, 'israel')).toBe(true);
  });

  it('does not protect an ordinary Sunday', () => {
    expect(isProtectedStreakDayAt(SUNDAY, JERUSALEM, 'israel')).toBe(false);
  });

  it('does not protect an ordinary Tuesday', () => {
    expect(isProtectedStreakDayAt(TUESDAY, JERUSALEM, 'israel')).toBe(false);
  });

  it('falls back to Saturday-only protection with no location', () => {
    expect(isProtectedStreakDayAt(FRIDAY, null, 'israel')).toBe(false);
    expect(isProtectedStreakDayAt(SATURDAY, null, 'israel')).toBe(true);
  });
});

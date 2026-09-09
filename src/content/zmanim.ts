import { ComplexZmanimCalendar, GeoLocation } from 'kosher-zmanim';
import type { HalachicZman } from './types';

/**
 * Real halachic zmanim via `kosher-zmanim` (LGPL-3.0 — chosen specifically
 * because it's safe to use as a dependency in a commercial closed-source
 * app, unlike the GPL-2.0 `@hebcal` ecosystem; see
 * src/content/research/calendar-zmanim-infrastructure.md).
 *
 * **The library itself describes its status as alpha** ("not all methods
 * have been tested for accuracy" — its own README). This module has been
 * spot-checked against reference values for a handful of dates/locations
 * (see the research doc) but has NOT been independently audited the way
 * the app's halachic-practice research has. Treat any time this returns as
 * a computed estimate worth a second source before leaning on it for
 * anything consequential — the same "AI-researched, not a psak" posture
 * the rest of this app's content carries, just applied to code instead of
 * text.
 *
 * Multiple opinions are represented explicitly (never collapsed to one
 * "true" number) for the zmanim where opinions meaningfully diverge —
 * currently sof zman Shema and sof zman tefilah (GRA vs. Magen Avraham).
 * Single-value zmanim below (sunrise, sunset, chatzot, etc.) are
 * astronomical facts or have one dominant convention in common use; see
 * inline notes for which.
 */

export interface ZmanimResult {
  /** Astronomical sunrise/sunset — not in dispute. */
  sunrise: Date | null;
  sunset: Date | null;
  /** Midpoint of the halachic day — the GRA's definition (sunrise-to-sunset midpoint), the most common convention. */
  chatzot: Date | null;
  /** Dawn, 72 minutes before sunrise — a widely-used practical convention; other degree-based definitions exist in the underlying library but aren't exposed here yet (see "don't overengineer" note in the research doc). */
  alosHashachar: Date | null;
  /**
   * Multiple opinions, not collapsed to one — see
   * calendar-zmanim-infrastructure.md for sourcing. `moderate` (11°, ~48 min
   * before sunrise around the equinox) is the value this app's eligibility
   * engine actually uses as its Shema-window start (a specific, documented
   * choice — see `getZmanValue`'s `misheyakir` case), not a silent default;
   * `earlier`/`later` are the library's other named-posek-attributed
   * variants, exposed for anyone who wants to compare or override.
   */
  misheyakir: {
    /**
     * ~11.5°, roughly 52 min before sunrise around the equinox — the
     * *earliest* clock time of the three (a larger degree-below-horizon
     * corresponds to an earlier point in the dawn, further from sunrise;
     * this took a real test failure to catch — see
     * calendar-zmanim-infrastructure.md).
     */
    earlier: Date | null;
    /** ~11°, roughly 48 min before sunrise around the equinox — the value this engine uses. */
    moderate: Date | null;
    /** ~10.2°, roughly 45 min before sunrise around the equinox — the latest (closest-to-sunrise) of the three. */
    later: Date | null;
    /** ~9.5°, attributed by the library to Rabbi Shmuel Kamenetsky (36/45 min figures) — later still, closer to sunrise than any of the three above. */
    kamenetsky: Date | null;
  };
  /** Nightfall — the library's default (~8.5° below horizon), a moderate, commonly-cited opinion. Stricter opinions (e.g. Rabbeinu Tam's 72 minutes) exist and aren't exposed here yet. */
  tzais: Date | null;
  sofZmanShma: {
    /** Vilna Gaon's opinion: from sunrise, not dawn. */
    gra: Date | null;
    /** Magen Avraham's opinion: from alos hashachar (dawn), not sunrise — earlier than the GRA's. */
    mga: Date | null;
  };
  sofZmanTfila: {
    gra: Date | null;
    mga: Date | null;
  };
  minchaGedola: Date | null;
  minchaKetana: Date | null;
  plagHamincha: Date | null;
  /** Halachic midnight — the astronomical midpoint between sunset and the next sunrise (not simply chatzot + 12h, which would be slightly wrong away from the equinoxes). */
  chatzotHalailah: Date | null;
}

/**
 * Computes the day's zmanim for a given date/location. Returns `null` for
 * every field the underlying library couldn't compute (e.g. polar-region
 * dates where the sun doesn't rise/set) — callers must treat `null` as
 * "unknown," never substitute a guessed clock time.
 */
export function computeZmanim(date: Date, latitude: number, longitude: number, elevationMeters = 0): ZmanimResult {
  const timeZoneId = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const geoLocation = new GeoLocation('', latitude, longitude, elevationMeters, timeZoneId);
  const calendar = new ComplexZmanimCalendar(geoLocation);
  calendar.setDate(date);

  const toDate = (dt: { toJSDate: () => Date } | null): Date | null => (dt ? dt.toJSDate() : null);

  return {
    sunrise: toDate(calendar.getSunrise()),
    sunset: toDate(calendar.getSunset()),
    chatzot: toDate(calendar.getChatzos()),
    alosHashachar: toDate(calendar.getAlosHashachar()),
    misheyakir: {
      earlier: toDate(calendar.getMisheyakir11Point5Degrees()),
      moderate: toDate(calendar.getMisheyakir11Degrees()),
      later: toDate(calendar.getMisheyakir10Point2Degrees()),
      kamenetsky: toDate(calendar.getMisheyakir9Point5Degrees()),
    },
    tzais: toDate(calendar.getTzais()),
    sofZmanShma: {
      gra: toDate(calendar.getSofZmanShmaGRA()),
      mga: toDate(calendar.getSofZmanShmaMGA()),
    },
    sofZmanTfila: {
      gra: toDate(calendar.getSofZmanTfilaGRA()),
      mga: toDate(calendar.getSofZmanTfilaMGA()),
    },
    minchaGedola: toDate(calendar.getMinchaGedola()),
    // These two lack a zero-arg convenience overload in this library's
    // current type declarations (unlike getMinchaGedola/getChatzos above)
    // — pass the sunrise/sunset day boundary explicitly instead, the same
    // GRA-based definition the zero-arg methods elsewhere in this file use.
    minchaKetana: toDate(calendar.getMinchaKetana(calendar.getSunrise(), calendar.getSunset())),
    plagHamincha: toDate(calendar.getPlagHamincha(calendar.getSunrise(), calendar.getSunset())),
    chatzotHalailah: toDate(calendar.getSolarMidnight()),
  };
}

/** Maps a `HalachicZman` (the descriptive enum already used in researched content) to the computed value(s) for it, where this module has one. Absent key = not yet wired to a computation. */
export function getZmanValue(result: ZmanimResult, zman: HalachicZman): Date | null {
  switch (zman) {
    case 'alot_hashachar':
      return result.alosHashachar;
    case 'netz_hachama':
      return result.sunrise;
    case 'sof_zman_krias_shema':
      // GRA (later/more lenient than MGA, since GRA counts from sunrise not
      // dawn) is used as the single end-of-window value the eligibility
      // engine checks against — a deliberate, documented choice: for a
      // TIME_EXPIRED judgment specifically, the more lenient opinion is the
      // safer one to rely on (less likely to falsely tell someone their
      // window closed when a legitimate opinion says it's still open).
      // Both opinions remain available via `computeZmanim` directly for
      // anyone who wants the stricter MGA figure.
      return result.sofZmanShma.gra;
    case 'sof_zman_tefillah':
      return result.sofZmanTfila.gra; // same reasoning as sof_zman_krias_shema above.
    case 'chatzot':
      return result.chatzot;
    case 'mincha_gedolah':
      return result.minchaGedola;
    case 'mincha_ketanah':
      return result.minchaKetana;
    case 'plag_hamincha':
      return result.plagHamincha;
    case 'shkia':
      return result.sunset;
    case 'tzeit_hakochavim':
      return result.tzais;
    case 'chatzot_halailah':
      return result.chatzotHalailah;
    case 'misheyakir':
      return result.misheyakir.moderate; // see the `misheyakir` field's doc comment for why this specific opinion.
    case 'bein_hashmashot':
      return null; // not yet wired — see the research doc's "not yet exposed" note.
  }
}

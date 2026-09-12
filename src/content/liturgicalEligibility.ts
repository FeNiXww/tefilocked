import { getJewishCalendarContext, type DiasporaOrIsrael, type JewishCalendarContext } from './hebrewCalendar';
import { computeZmanim, getZmanValue, type ZmanimResult } from './zmanim';
import { getPrayerGuidance, type PrayerGuidanceDetail } from './liturgicalGuidance';
import type { ContentItem, Certainty } from './types';

// Approximate Israel bounding box (generous — includes the Golan and Eilat
// with margin) used only to turn a granted GPS fix into `DiasporaOrIsrael`.
// A rough rectangle is deliberately good enough here: the only thing this
// distinction changes is a handful of Yom Tov Sheni Shel Galuyot dates, not
// anything where a few km of border precision matters.
const ISRAEL_BOUNDS = { minLat: 29.0, maxLat: 33.5, minLon: 34.0, maxLon: 35.95 };

function isLocationInIsrael(location: EligibilityLocation): boolean {
  return (
    location.latitude >= ISRAEL_BOUNDS.minLat &&
    location.latitude <= ISRAEL_BOUNDS.maxLat &&
    location.longitude >= ISRAEL_BOUNDS.minLon &&
    location.longitude <= ISRAEL_BOUNDS.maxLon
  );
}

/**
 * Turns the user's location (or lack of one) into the `DiasporaOrIsrael`
 * value `getJewishCalendarContext` needs. A granted location is classified
 * by a rough Israel bounding box; no location (never asked during
 * onboarding, or explicitly declined) resolves to `'israel'` — a deliberate
 * product decision, not a guess: onboarding's location screen is the one
 * real ask, and someone who has none is assumed to be a local user rather
 * than defaulted to the more conservative diaspora reading this function
 * used before location was a first-class part of onboarding.
 */
export function resolveDiasporaOrIsrael(location: EligibilityLocation | null): DiasporaOrIsrael {
  if (!location) return 'israel';
  return isLocationInIsrael(location) ? 'israel' : 'diaspora';
}

/**
 * The central Liturgical Eligibility Engine — the one place that decides
 * both (a) whether an item may be randomly surfaced and (b) what the "why?"
 * panel says about it. Both questions are answered from the same evaluation
 * so the two can never drift apart (previously `poolSafety.ts` and
 * `liturgicalGuidance.ts` were two separate rule sets computed independently
 * — this supersedes that split; see poolSafety.ts's updated role below).
 *
 * `evaluateLiturgicalEligibility` is a pure function of its inputs — no I/O,
 * no timers, safe to call from a render function or a test with a fixed
 * date/location/nusach. Callers own fetching the calendar/zmanim/nusach
 * context once (see `buildEligibilityContext`) and passing it in, rather
 * than each item re-deriving it.
 */

export type EligibilityStatus =
  | 'AVAILABLE'
  | 'AVAILABLE_WITH_CONTEXT'
  | 'TIME_NOT_YET'
  | 'TIME_EXPIRED'
  | 'CALENDAR_RESTRICTED'
  | 'NUSACH_DEPENDENT'
  | 'REQUIRES_CONTEXT'
  | 'NOT_VERIFIED'
  | 'LOCATION_REQUIRED'
  | 'EXCLUDED_FROM_RANDOM_POOL';

export interface EligibilityResult {
  status: EligibilityStatus;
  /** Short, calm, Hebrew — safe to show directly on the reading screen. */
  reason: string;
  /** How confident the underlying research is — `'unknown'` when the item has no LiturgicalContext at all. */
  certainty: Certainty | 'unknown';
  /** Short Hebrew bullet points (standing/direction/minyan/etc.) when relevant — same data source as the "why?" panel. */
  requirements: PrayerGuidanceDetail[];
  /** Internal-only notes (e.g. "still needs rabbinic review") — not shown to users. */
  warnings: string[];
  sources: string[];
}

/**
 * Items excluded from random selection regardless of time/calendar/nusach —
 * moved here from poolSafety.ts, which now delegates to this engine. See
 * each item's `liturgicalContext.standaloneGuidance` and the research doc
 * for why. Keep short and justified — most `requires_review` items stay
 * eligible with their context surfaced normally.
 *
 * - `prayer-shehecheyanu`, `prayer-tefilat-haderech`, `prayer-asher-yatzar`,
 *   `prayer-baruch-sheamar`: real bracha-levatala / ברכה שאינה צריכה risk if
 *   surfaced as a generic devotional prompt. All four contain a full
 *   halachic ברכה formula ("בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם...")
 *   instituted for a *specific* triggering occasion — a genuinely novel/joyous
 *   event (Shehecheyanu), setting out on a journey (Tefilat HaDerech), having
 *   just relieved oneself (Asher Yatzar), or beginning Pesukei D'Zimra
 *   specifically (Baruch Sheamar) — and the app has no way to confirm that
 *   occasion is actually true for the user at the moment it's surfaced.
 *   Reciting a fixed ברכה formula (Shem + Malchut) detached from its real
 *   occasion is the classic case poskim warn about, regardless of how
 *   sincere or well-intentioned the reading is. This is a stricter standard
 *   than "is the text itself complete and readable" — a text can be
 *   perfectly coherent on its own and still carry this risk if it's a
 *   ברכה formula tied to an unverifiable trigger. Items that are Torah/Tehillim
 *   text, piyutim, or declarations *without* a ברוך-formula (the large
 *   majority of this library) never carry this risk at all, no matter how
 *   "used to be part of a bigger service" they are — see `prayer-elokai-neshama`
 *   for an item that stays eligible precisely because it doesn't have this
 *   problem (its ברכה, unusually, has an always-true occasion — see its
 *   `standaloneGuidance`).
 * - `prayer-birkat-kohanim`: a different concern than the bracha-levatala
 *   family above — the text itself is just Biblical verses (Bamidbar
 *   6:24-26), not a ברכה formula, so it was previously kept eligible on that
 *   basis. But presenting it generically as "your prayer for the moment" to
 *   a solitary user has no real precedent either: the verses are
 *   second-person ("יְבָרֶכְךָ ה׳..."), and every actual use this text has —
 *   duchening (a Kohen blessing the congregation) or a parent blessing a
 *   child on Friday night — has a clear blesser/blessed relationship the
 *   app's generic single-reader framing doesn't have. Excluded on product
 *   judgment, not a reversed halachic finding about the text itself.
 * - `prayer-refaeinu`, `prayer-sim-shalom`, `prayer-hashkiveinu`: single
 *   fixed blessings lifted out of a fixed liturgical sequence (the Amidah for
 *   the first two; the Shema blessings of Maariv for Hashkiveinu) — the text
 *   itself presupposes the blessing(s) before it and, per the Amidah/Shema
 *   blessings' own halachic structure, does not constitute a complete act of
 *   prayer said on its own (see each item's `standaloneGuidance`). Surfacing
 *   one as "today's prayer," detached from its sequence and with no occasion
 *   behind it, is exactly the "read this for no reason" problem this
 *   exclusion exists to avoid.
 *
 *   Hashkiveinu specifically: it opens straight into "הַשְׁכִּיבֵנוּ" with no
 *   "בָּרוּךְ אַתָּה ה׳..." of its own, because Berachot 46a's rule for a
 *   "ברכה הסמוכה לחברתה" (a blessing juxtaposed to the one before it) is that
 *   it may omit its own opening ONLY if it is never recited independently —
 *   any blessing sometimes said on its own (the Talmud's own example: "אשר
 *   בחר בנו" for an aliyah) must open with its own "ברוך" precisely because
 *   it can stand alone. Chazal's actual solution for an individual's
 *   *independent*, pre-sleep blessing is a different text entirely — ברכת
 *   המפיל ("הַמַּפִּיל חֶבְלֵי שֵׁנָה..."), which does open with a full
 *   "בָּרוּךְ אַתָּה ה׳ אֱלֹקֵינוּ מֶלֶךְ הָעוֹלָם" precisely because it's
 *   designed to be said alone. Hashkiveinu's missing opening isn't an
 *   oversight the app can paper over with a caveat — it's the halachic
 *   record's own confirmation that this text was never meant to be lifted
 *   out of its place between Geulah and the Amidah, unlike a genuinely
 *   self-contained blessing (e.g. Asher Yatzar, which does open with its own
 *   "ברוך", or Elokai Neshama, which lacks an opening for a different,
 *   disputed reason but has an unbroken, undisputed daily practice of solo
 *   recitation upon waking that Hashkiveinu has no equivalent of) — those
 *   stay eligible.
 * - `tehillim-100`: the item's own researched `omittedOn` (Shabbat/Yom Tov)
 *   is already enforced generically via `CALENDAR_RESTRICTED` and needs no
 *   exclusion for that part. But research also found *additional*,
 *   Ashkenazi-specific omission days (Erev Pesach, Chol HaMoed Pesach, Erev
 *   Yom Kippur) that this app cannot safely enforce without knowing the
 *   user's nusach — and a nusach selector is explicitly out of scope right
 *   now (see nusach-content-gaps.md, nusach-ux-decision.md). Rather than
 *   silently apply an Ashkenazi-only rule to every user, or silently ignore
 *   it, the conservative choice is to hold the whole item back from random
 *   selection until nusach-aware calendar logic exists. Not deleted — all
 *   its researched data stays intact, and it remains directly viewable
 *   (with its `CALENDAR_RESTRICTED` status still correct) if the app ever
 *   grows a direct-content-browse feature.
 */
const EXCLUDED_FROM_POOL = new Set<string>([
  'prayer-shehecheyanu',
  'prayer-tefilat-haderech',
  'prayer-refaeinu',
  'prayer-sim-shalom',
  'prayer-hashkiveinu',
  'prayer-asher-yatzar',
  'prayer-baruch-sheamar',
  'prayer-birkat-kohanim',
  'tehillim-100',
]);

export interface EligibilityLocation {
  latitude: number;
  longitude: number;
  elevation: number;
}

export interface EligibilityContext {
  now: Date;
  calendar: JewishCalendarContext;
  /** null when the user hasn't granted (or hasn't been asked for) zmanim location — never a guessed value. */
  zmanim: ZmanimResult | null;
  /**
   * Yesterday's zmanim, needed only for the pre-dawn "which night's window
   * am I in" edge case (see `getRelevantZmanBoundary`) — e.g. it's 1am,
   * today's morning Shema window hasn't opened yet, but *last* night's
   * evening window already closed at halachic midnight. Without checking
   * yesterday's numbers too, that would misreport as "not yet" instead of
   * "expired." Also null when no location is available.
   */
  previousNightZmanim: ZmanimResult | null;
}

/**
 * Bundles the calendar + (optional) zmanim context once, for reuse across
 * many `evaluateLiturgicalEligibility` calls in the same render/selection
 * pass — avoids recomputing Hebrew-date/astronomical math per item. Pass
 * `location` only when the user has actually granted it (see
 * src/native/location.ts) — never a guessed or default coordinate.
 */
export function buildEligibilityContext(
  now: Date,
  location: EligibilityLocation | null,
  diasporaOrIsrael: DiasporaOrIsrael = 'diaspora'
): EligibilityContext {
  const zmanim = location ? computeZmanim(now, location.latitude, location.longitude, location.elevation) : null;
  const previousNightZmanim = location
    ? computeZmanim(new Date(now.getTime() - 24 * 60 * 60 * 1000), location.latitude, location.longitude, location.elevation)
    : null;
  return { now, calendar: getJewishCalendarContext(now, diasporaOrIsrael), zmanim, previousNightZmanim };
}

function isOmittedToday(item: ContentItem, calendar: JewishCalendarContext): boolean {
  const occasions = item.liturgicalContext?.omittedOn;
  if (!occasions || occasions.length === 0) return false;
  return occasions.some((o) => (o === 'shabbat' && calendar.isShabbat) || (o === 'yom_tov' && calendar.isYomTov));
}

export function evaluateLiturgicalEligibility(item: ContentItem, context: EligibilityContext): EligibilityResult {
  const lc = item.liturgicalContext;

  if (EXCLUDED_FROM_POOL.has(item.id)) {
    return {
      status: 'EXCLUDED_FROM_RANDOM_POOL',
      reason: 'תלוי בנסיבות ספציפיות',
      certainty: lc?.standaloneLevel ?? 'unknown',
      requirements: [],
      warnings: ['excluded_from_pool: unnecessary-blessing risk or an incomplete liturgical fragment if surfaced generically — see research doc'],
      sources: lc?.researchSources ?? [],
    };
  }

  if (!lc) {
    return {
      status: 'NOT_VERIFIED',
      reason: '',
      certainty: 'unknown',
      requirements: [],
      warnings: ['no liturgicalContext — never researched'],
      sources: [],
    };
  }

  if (isOmittedToday(item, context.calendar)) {
    return {
      status: 'CALENDAR_RESTRICTED',
      reason: 'הקטע הזה לא נאמר היום לפי המנהג הרגיל',
      certainty: lc.confidence === 'needs_review' ? 'unknown' : lc.standaloneLevel,
      requirements: getPrayerGuidance(item),
      warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
      sources: lc.researchSources,
    };
  }

  if (lc.timeContext.hasRealHalachicZman) {
    if (!context.zmanim) {
      // No location granted — there is no honest way to tell whether this
      // item's real halachic time window is even open right now, and
      // showing it ungated would silently misrepresent that. Block it
      // outright rather than falling through to AVAILABLE_WITH_CONTEXT (the
      // previous behavior) — see onboarding's LocationPrimer, the one place
      // this is actually asked.
      return {
        status: 'LOCATION_REQUIRED',
        reason: 'התפילה הזו תלויה בזמן הלכתי אמיתי — צריך גישה למיקום כדי להציג אותה',
        certainty: lc.standaloneLevel,
        requirements: getPrayerGuidance(item),
        warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
        sources: lc.researchSources,
      };
    }
    const zman = getRelevantZmanBoundary(item, context);
    if (zman) {
      if (context.now < zman.start) {
        return {
          status: 'TIME_NOT_YET',
          reason: 'הזמן המומלץ לתפילה זו עדיין לא הגיע',
          certainty: lc.standaloneLevel,
          requirements: getPrayerGuidance(item),
          warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
          sources: lc.researchSources,
        };
      }
      if (zman.end && context.now > zman.end) {
        return {
          status: 'TIME_EXPIRED',
          reason: 'הזמן המומלץ לתפילה זו עבר',
          certainty: lc.standaloneLevel,
          requirements: getPrayerGuidance(item),
          warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
          sources: lc.researchSources,
        };
      }
    }
  }

  if (lc.serviceRoleKind === 'prayer_component' || lc.serviceRoleKind === 'blessing') {
    return {
      status: 'REQUIRES_CONTEXT',
      reason: lc.serviceRole,
      certainty: lc.standaloneLevel,
      requirements: getPrayerGuidance(item),
      warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
      sources: lc.researchSources,
    };
  }

  if (lc.nusachDifferences && lc.nusachDifferences.length > 0) {
    return {
      status: 'NUSACH_DEPENDENT',
      reason: 'יש הבדלים בנוסח התפילה בין מנהגים שונים',
      certainty: lc.standaloneLevel,
      requirements: getPrayerGuidance(item),
      warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
      sources: lc.researchSources,
    };
  }

  const guidance = getPrayerGuidance(item);
  if (guidance.length > 0) {
    return {
      status: 'AVAILABLE_WITH_CONTEXT',
      reason: lc.serviceRole,
      certainty: lc.standaloneLevel,
      requirements: guidance,
      warnings: lc.requiresRabbinicReview ? ['requires_rabbinic_review'] : [],
      sources: lc.researchSources,
    };
  }

  return {
    status: 'AVAILABLE',
    reason: '',
    certainty: lc.standaloneLevel,
    requirements: [],
    warnings: [],
    sources: lc.researchSources,
  };
}

/** True for statuses that mean "do not randomly hand this out right now" — the gate `poolSafety.ts` enforces. */
export function isEligibleForRandomPool(status: EligibilityStatus): boolean {
  return (
    status !== 'EXCLUDED_FROM_RANDOM_POOL' &&
    status !== 'NOT_VERIFIED' &&
    status !== 'TIME_NOT_YET' &&
    status !== 'TIME_EXPIRED' &&
    status !== 'CALENDAR_RESTRICTED' &&
    status !== 'LOCATION_REQUIRED'
  );
}

/**
 * Currently only Shema has `relevantZmanim` populated with a pair the engine
 * understands. Shema has BOTH a morning and an evening window — using
 * `chatzot` (solar noon, not the device clock) to decide which one applies
 * "right now" is itself a halachically-motivated choice (the day/night
 * halachic divide), not an arbitrary AM/PM split. Returns null (no time
 * check performed, never a guessed boundary) whenever a needed zman is
 * unavailable — e.g. near the poles, where the underlying library can
 * legitimately return null for sunrise/sunset itself.
 */
function getRelevantZmanBoundary(item: ContentItem, context: EligibilityContext): { start: Date; end: Date | null } | null {
  const { zmanim, previousNightZmanim, now } = context;
  if (!zmanim) return null;
  const relevant = item.liturgicalContext?.timeContext.relevantZmanim;
  if (!relevant || relevant.length === 0) return null;

  const isShemaZmanSet = relevant.includes('misheyakir') && relevant.includes('sof_zman_krias_shema');
  if (!isShemaZmanSet) return null;

  // Real misheyakir (11°, see zmanim.ts's doc comment for why this specific
  // opinion among several named-posek-attributed options) as the morning
  // window's start — previously this used alos hashachar (dawn) as a
  // stand-in, which is genuinely earlier than any misheyakir opinion; now
  // that a real computation exists, using it is both more accurate and
  // still conservative relative to the *latest* misheyakir opinion exposed
  // (11.5°, ~4 minutes later) — see calendar-zmanim-infrastructure.md.
  const todaysMisheyakir = getZmanValue(zmanim, 'misheyakir');
  const todaysSofZmanShma = getZmanValue(zmanim, 'sof_zman_krias_shema');
  const tonightStart = getZmanValue(zmanim, 'tzeit_hakochavim');
  const tonightEnd = getZmanValue(zmanim, 'chatzot_halailah');
  const lastNightStart = previousNightZmanim ? getZmanValue(previousNightZmanim, 'tzeit_hakochavim') : null;
  const lastNightEnd = previousNightZmanim ? getZmanValue(previousNightZmanim, 'chatzot_halailah') : null;

  const within = (start: Date | null, end: Date | null) => !!start && !!end && now >= start && now <= end;

  // A full calendar day, in chronological order, has up to 4 relevant
  // regions for Shema. Check "am I currently inside a valid window" for
  // both candidates first (order doesn't matter between them — they can't
  // overlap), then fall back to "which window is the *relevant* one to
  // report as not-yet/expired" for wherever `now` actually falls:
  //
  //   [00:00 ── lastNightEnd) : tail of last night's still-open window
  //   [lastNightEnd ── todaysMisheyakir) : dead zone — last night's just closed
  //   [todaysMisheyakir ── todaysSofZmanShma] : this morning's window
  //   (todaysSofZmanShma ── tonightStart) : afternoon — expired/not-yet-tonight
  //   [tonightStart ── tonightEnd] : tonight's window
  if (within(lastNightStart, lastNightEnd)) return { start: lastNightStart!, end: lastNightEnd! };
  if (within(todaysMisheyakir, todaysSofZmanShma)) return { start: todaysMisheyakir!, end: todaysSofZmanShma! };
  if (within(tonightStart, tonightEnd)) return { start: tonightStart!, end: tonightEnd! };

  if (lastNightEnd && now >= lastNightEnd && (!todaysMisheyakir || now < todaysMisheyakir)) {
    // Dead zone: not yet today's morning window, but last night's window
    // has closed — report against last night's (already expired) window,
    // not an unopened future one.
    if (lastNightStart) return { start: lastNightStart, end: lastNightEnd };
  }

  if (todaysMisheyakir && todaysSofZmanShma && now > todaysSofZmanShma && (!tonightStart || now < tonightStart)) {
    // Afternoon: this morning's window already closed, tonight's hasn't
    // opened yet — report against the morning window (expired), matching
    // "the recommended time passed" rather than implying nothing has
    // happened yet.
    return { start: todaysMisheyakir, end: todaysSofZmanShma };
  }

  if (todaysMisheyakir && now < todaysMisheyakir) {
    // Genuinely before misheyakir with no still-open prior window (e.g. the
    // narrow dead zone already handled above covers the "last night just
    // closed" case; this is the residual "nothing has opened yet at all"
    // case) — not-yet against today's morning window.
    return { start: todaysMisheyakir, end: todaysSofZmanShma };
  }

  if (tonightStart && now < tonightStart) {
    return { start: tonightStart, end: tonightEnd };
  }

  return null;
}

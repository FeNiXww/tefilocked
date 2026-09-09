export type Mood =
  | 'stressed'
  | 'anxious'
  | 'grateful'
  | 'lonely'
  | 'happy'
  | 'distracted'
  | 'tired';

export type ContentType =
  | 'tehillim'
  | 'daily_prayers'
  | 'torah_wisdom'
  | 'chazal'
  | 'personal_prayers';

/**
 * What KIND of text this is, independent of `ContentType` (which pack/user
 * preference bucket it's filed under). `isTraditional: true` items must be
 * complete, verbatim, sourced texts — never AI-generated, never silently
 * shortened. `reflection`/`personal` items are explicitly NOT traditional
 * sources and must never be labeled as one.
 */
export type ContentKind = 'psalm' | 'prayer' | 'biblical_song' | 'wisdom' | 'reflection' | 'personal';

export interface Verse {
  /** Verse/line number within this item, 1-indexed, for display as "verse N". */
  number: number;
  hebrewText: string;
}

/**
 * Coarse device-clock time-of-day bucket a prayer is traditionally tied to
 * (e.g. Modeh Ani ~ morning, Hashkiveinu ~ night) — loosely inspired by
 * Shacharit/Mincha/Maariv but deliberately NOT real halachic zmanim (no
 * sunrise/location calculation). See `dayPart.ts`.
 */
export type DayPart = 'anytime' | 'morning' | 'afternoon' | 'night';

/**
 * How trustworthy `LiturgicalContext` is, for a given item. Nothing produced by
 * AI research (web search + synthesis, however well-cited) should be treated
 * as a psak — it's a sourced draft until an actual rabbi has reviewed it.
 */
export type ReviewStatus = 'ai_researched_unverified' | 'rabbinically_reviewed';

/**
 * Classification of a researched claim's halachic weight. AI research must
 * never collapse these into a single "allowed"/"not allowed" binary — a
 * custom is not a requirement, a disputed point is not a settled one, and
 * "unknown" must stay "unknown" rather than being guessed into a rule.
 *
 * - required            — genuine halachic requirement (chiyuv)
 * - prohibited           — genuine halachic prohibition (issur)
 * - preferred            — לכתחילה: the ideal way, but not "mei'akev" (not blocking)
 * - valid_not_ideal      — בדיעבד: acceptable after the fact, not the ideal
 * - custom               — מנהג: a real, sourced communal practice, not a din
 * - common_practice      — widely done in practice, without a clear halachic source pinning it down
 * - recommended          — a general/spiritual recommendation, not a halachic one
 * - disputed             — poskim disagree; see `disagreements`
 * - nusach_dependent      — the answer genuinely varies by nusach/community; see `nusachDifferences`
 * - unknown              — insufficient evidence found; do not guess
 * - requires_review       — needs a specific rabbinic look before this can be stated with confidence
 * - not_applicable        — this concern doesn't apply to this particular text
 */
export type Certainty =
  | 'required'
  | 'prohibited'
  | 'preferred'
  | 'valid_not_ideal'
  | 'custom'
  | 'common_practice'
  | 'recommended'
  | 'disputed'
  | 'nusach_dependent'
  | 'unknown'
  | 'requires_review'
  | 'not_applicable';

/** One classified, sourced claim: its weight plus a short Hebrew explanation that must never overstate `level`. */
export interface HalachicRule {
  level: Certainty;
  /** Hebrew, concise, user-facing-safe (shown in a "why?" panel) — must match `level`'s actual strength, e.g. "נהוג לעמוד" not "יש לעמוד" when `level` is `custom`. */
  explanation: string;
}

/**
 * Named halachic time concepts (see Shulchan Aruch Orach Chaim's zmanim
 * chapters) that are relevant to this item's timing. Purely descriptive —
 * the app has no location/sunrise-sunset infrastructure (no
 * HalachicTimeProvider yet, see README note below) and does not compute
 * these; this list only records which concepts *would* govern the zman if
 * such a provider existed.
 */
export type HalachicZman =
  | 'alot_hashachar'
  | 'misheyakir'
  | 'netz_hachama'
  | 'sof_zman_krias_shema'
  | 'sof_zman_tefillah'
  | 'chatzot'
  | 'mincha_gedolah'
  | 'mincha_ketanah'
  | 'plag_hamincha'
  | 'shkia'
  | 'bein_hashmashot'
  | 'tzeit_hakochavim'
  | 'chatzot_halailah';

export interface HalachicTimeContext {
  /**
   * True only for texts with a real, sunrise/sunset-anchored halachic time
   * window (e.g. Shema) — as opposed to `timeWindows` on `ContentItem`,
   * which is always just a loose device-clock bucket and never claims to be
   * a real zman. False/absent means this text has no fixed halachic window
   * of its own (its timing, if any, is derived from whatever service it's
   * part of).
   */
  hasRealHalachicZman: boolean;
  /** Which named zmanim concepts bound this text's ideal/valid window, if any. */
  relevantZmanim?: HalachicZman[];
  /** Hebrew: ideal time vs. still-valid vs. no-longer-fulfills-the-original-obligation — never collapsed to "unavailable". */
  idealVsValidNote?: string;
}

/** Whether reciting this text requires/benefits from a minyan, and whether that only applies to part of it. */
export interface MinyanContext {
  level: Certainty;
  /** True when only a specific component (e.g. Kedusha, Chazarat HaShatz, duchening) needs a minyan while the rest doesn't. */
  componentOnly?: boolean;
  explanation: string;
}

/** A documented difference in text, timing, placement, or practice between communities/nusach. Never invent a universal rule when practice actually varies. */
export interface NusachDifference {
  /** e.g. "אשכנז", "ספרד/עדות המזרח", "חב״ד". */
  community: string;
  difference: string;
}

/** A textual or practical variant tied to the Jewish calendar (Shabbat, Rosh Chodesh, a holiday, a fast day, etc.). */
export interface CalendarVariant {
  /** e.g. "שבת", "ראש חודש", "עשרת ימי תשובה". */
  occasion: string;
  variantDescription: string;
}

/** A real disagreement found between reputable sources — recorded, never silently resolved by picking one side. */
export interface Disagreement {
  topic: string;
  /** Both/all positions found, and which sources hold them. */
  positions: string;
}

/**
 * Which community's text/practice `verses` represents. `'universal'` means
 * genuinely no meaningful variance was found (most Tehillim, Torah/Talmud
 * excerpts); `'unknown'` means nusach wasn't specifically researched for
 * this item, which is different from `'universal'` and should not be
 * treated as equivalent to it. Never used to auto-switch text — see
 * src/content/research/nusach-ux-decision.md.
 */
export type Nusach = 'ashkenaz' | 'sefard' | 'edot_hamizrach' | 'unknown' | 'universal';

/**
 * A specific, narrow occasion on which an item is documented as normally
 * *omitted* (not just "has a variant") — e.g. Psalm 100 on Shabbat/Yom Tov.
 * Deliberately minimal (not a general rule language) per the "don't
 * overengineer" principle: add a value here only when research has actually
 * confirmed a real omission, not speculatively.
 */
export type OmissionOccasion = 'shabbat' | 'yom_tov';

/**
 * What kind of liturgical unit this text actually is — the section
 * 7/16-critical distinction between a complete prayer and a mere component
 * of a larger structure (e.g. one blessing of the Amidah). Drives whether
 * the UI may ever imply "prayer completed."
 */
export type ServiceRoleKind =
  | 'complete_prayer'
  | 'prayer_component'
  | 'blessing'
  | 'psalm'
  | 'biblical_passage'
  | 'supplication'
  | 'piyut'
  | 'seasonal_addition'
  | 'occasion_triggered'
  | 'other';

/**
 * Liturgical/halachic context for a prayer item, distinct from the loose
 * `timeWindows` clock-hour bucketing above. Only populated for items that
 * have actually been researched (see src/content/research/) — absent for
 * everything else, never guessed or defaulted. Every claim here is
 * AI-researched (see `reviewStatus`), not a psak — read via
 * `getPrayerGuidance` (src/content/liturgicalGuidance.ts), never rendered
 * raw in the UI, so wording stays consistent with each field's `Certainty`.
 */
export interface LiturgicalContext {
  serviceRoleKind: ServiceRoleKind;
  /** Where this text normally sits liturgically, e.g. "closing prayer of every service" or "19th blessing of the Amidah, not an independent unit". Hebrew, shown to users. */
  serviceRole: string;
  /** Whether reading this text alone, outside its full service, is a coherent/appropriate use, and any caveat. Hebrew. */
  standaloneGuidance: string;
  standaloneLevel: Certainty;
  timeContext: HalachicTimeContext;
  standing: HalachicRule;
  facingJerusalem: HalachicRule;
  minyan: MinyanContext;
  calendarVariants?: CalendarVariant[];
  /** Occasions on which research confirmed this item is normally omitted entirely — see `OmissionOccasion`. Absent = no known omission rule (not the same as "confirmed always said"). */
  omittedOn?: OmissionOccasion[];
  /** Which community `verses` represents — see `Nusach`. Defaults to treating this as unset (`'unknown'`) when absent from older entries, never inferred. */
  textNusach?: Nusach;
  nusachDifferences?: NusachDifference[];
  disagreements?: Disagreement[];
  confidence: 'high' | 'medium' | 'low' | 'needs_review';
  reviewStatus: ReviewStatus;
  /** True whenever a specific point here should be checked by a qualified rabbi before being treated as settled — independent of `reviewStatus`, which covers the whole entry. */
  requiresRabbinicReview: boolean;
  /** What specifically needs a rabbi's eyes, if `requiresRabbinicReview` is true. Hebrew or English, internal — not shown to users. */
  rabbinicReviewNotes?: string;
  /** URLs of the sources this entry's claims are drawn from. */
  researchSources: string[];
  /** Open questions, disagreements not captured above, or caveats — not shown to users, kept for traceability. */
  researchNotes?: string;
}

export interface ContentItem {
  id: string;
  kind: ContentKind;
  /** True for verbatim traditional sources (Tanach, Siddur); false for original app content. */
  isTraditional: boolean;
  /** Hebrew display title, e.g. "תהילים כ״ז" or "מודה אני". */
  title: string;
  /** Citation, e.g. "ספר תהילים", "דברים ו׳:ד׳-ט׳", "תפילה מסורתית". */
  source: string;
  /** Tanach chapter number, when this item is a full chapter/pericope. */
  chapter?: number;
  /** The complete text, verse by verse — never a truncated excerpt for isTraditional items. */
  verses: Verse[];
  moods: Mood[];
  contentTypes: ContentType[];
  /** When present, this item should only be recommended during these day parts. Absent/omitted = no restriction. */
  timeWindows?: DayPart[];
  /** Researched liturgical/halachic context. See `LiturgicalContext` — absent unless actually researched. */
  liturgicalContext?: LiturgicalContext;
  /**
   * Full replacement `verses` arrays for specific calendar occasions (see
   * `resolveVerses` in ./calendarVariants.ts) — e.g. Hashkiveinu's real
   * Shabbat/Yom Tov closing line, which differs from `verses`' weekday
   * text. Only populated where research confirmed an actual textual
   * difference; absent means `verses` is used unconditionally. Only
   * `shabbat` is wired up today (see `isShabbatToday` in ./calendar.ts) —
   * Yom Tov/Rosh Chodesh/fast-day detection needs real Hebrew-calendar
   * infrastructure this app doesn't have yet.
   */
  calendarVariantVerses?: Partial<Record<'shabbat', Verse[]>>;
}

export const ALL_MOODS: Mood[] = [
  'stressed',
  'anxious',
  'grateful',
  'lonely',
  'happy',
  'distracted',
  'tired',
];

export const ALL_CONTENT_TYPES: ContentType[] = [
  'tehillim',
  'daily_prayers',
  'torah_wisdom',
  'chazal',
  'personal_prayers',
];

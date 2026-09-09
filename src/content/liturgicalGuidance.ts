import type { ContentItem, LiturgicalContext } from './types';

/** One line for the "למה?" panel: a short category label plus its explanation, already worded to match the underlying `Certainty`. */
export interface PrayerGuidanceDetail {
  label: string;
  text: string;
}

/**
 * The single place that turns a researched `LiturgicalContext` into
 * user-facing guidance. Both the locked-app interception flow and the
 * in-app onboarding demo render through `ContentDisplay`, which calls this
 * — so there is exactly one halachic-wording code path, not two.
 *
 * Deliberately conservative: only surfaces a line when the underlying field
 * is actually informative (`not_applicable` fields are omitted rather than
 * shown as a flat "no"), and never adds emphasis or certainty beyond what
 * `LiturgicalContext`'s `explanation`/`note` strings already say. This
 * function must never itself decide whether the current moment is "the
 * right time" — the app has no real zmanim/location data (see
 * `HalachicTimeContext.hasRealHalachicZman`), so it only ever surfaces that
 * limitation, never a computed "yes/no" for the current instant.
 */
export function getPrayerGuidance(item: ContentItem): PrayerGuidanceDetail[] {
  const ctx = item.liturgicalContext;
  if (!ctx) return [];

  const details: PrayerGuidanceDetail[] = [];

  if (ctx.standaloneGuidance) {
    details.push({ label: 'קריאה עצמאית', text: ctx.standaloneGuidance });
  }

  if (ctx.timeContext.hasRealHalachicZman) {
    details.push({
      label: 'זמן',
      text:
        ctx.timeContext.idealVsValidNote ??
        'לתפילה זו יש זמן הלכתי מוגדר, התלוי בזריחה ושקיעה. האפליקציה מציגה תוכן לפי שעון המכשיר בלבד ואינה מחשבת את הזמן ההלכתי המדויק.',
    });
  }

  if (ctx.standing.level !== 'not_applicable') {
    details.push({ label: 'עמידה', text: ctx.standing.explanation });
  }

  if (ctx.facingJerusalem.level !== 'not_applicable') {
    details.push({ label: 'כיוון', text: ctx.facingJerusalem.explanation });
  }

  if (ctx.minyan.level !== 'not_applicable') {
    details.push({ label: 'מניין', text: ctx.minyan.explanation });
  }

  if (ctx.nusachDifferences && ctx.nusachDifferences.length > 0) {
    details.push({
      label: 'הבדלי נוסח',
      text: ctx.nusachDifferences.map((d) => `${d.community}: ${d.difference}`).join(' '),
    });
  }

  if (ctx.calendarVariants && ctx.calendarVariants.length > 0) {
    details.push({
      label: 'תלוי לוח שנה',
      text: ctx.calendarVariants.map((c) => `${c.occasion}: ${c.variantDescription}`).join(' '),
    });
  }

  if (ctx.disagreements && ctx.disagreements.length > 0) {
    details.push({
      label: 'מחלוקת',
      text: 'קיימת מחלוקת פוסקים או שוני מנהגים בנושא זה שטרם הוכרע כאן.',
    });
  }

  return details;
}

/** True when this item's researched context has an open point a rabbi should specifically look at — for internal/QA use, never shown to end users. */
export function needsRabbinicReview(context: LiturgicalContext): boolean {
  return context.requiresRabbinicReview || context.reviewStatus !== 'rabbinically_reviewed';
}

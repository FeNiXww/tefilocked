import { useState } from 'react';
import { getOnboardingFullAnswers, setOnboardingFullAnswers, setOnboardingGender, setOnboardingName } from '../../data/storage/mmkv';

export type AgeRange = '10-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type PhoneHoursRange = '<2' | '2-4' | '4-6' | '6+';
export type Gender = 'man' | 'woman';

export interface OnboardingAnswers {
  name: string;
  ageRange: AgeRange | null;
  phoneHoursRange: PhoneHoursRange | null;
  gender: Gender | null;
  commitment: string | null;
  /** True only once the user has actually completed the press-and-hold confirmation gesture for `commitment` — selecting a level alone does not set this. */
  commitmentConfirmed: boolean;
  /** Whether the notification-primer screen's OS prompt was granted — informational only, never gates anything. */
  notificationsEnabled: boolean | null;
  /** Whether the location-primer screen's OS prompt was granted — informational only, never gates anything. */
  locationEnabled: boolean | null;
}

export const INITIAL_ONBOARDING_ANSWERS: OnboardingAnswers = {
  name: '',
  ageRange: null,
  phoneHoursRange: null,
  gender: null,
  commitment: null,
  commitmentConfirmed: false,
  notificationsEnabled: null,
  locationEnabled: null,
};

/**
 * Picks the grammatically-correct Hebrew variant for the answered gender —
 * `woman` gets the feminine form, everything else (including not-yet-answered)
 * falls back to masculine, matching the unmarked/default form Hebrew itself uses.
 */
export function pickG(gender: Gender | null, masculine: string, feminine: string): string {
  return gender === 'woman' ? feminine : masculine;
}

/** Props every onboarding step component receives from `OnboardingFlow`. */
export interface StepComponentProps {
  answers: OnboardingAnswers;
  update: (patch: Partial<OnboardingAnswers>) => void;
  onNext: () => void;
  onBack?: () => void;
  progress: { current: number; total: number };
}

/** Resumable, incrementally-persisted onboarding answer state — every `update()` call writes the full blob to MMKV so a killed app doesn't lose progress. */
export function useOnboardingState() {
  const [answers, setAnswers] = useState<OnboardingAnswers>(
    () => getOnboardingFullAnswers<OnboardingAnswers>() ?? INITIAL_ONBOARDING_ANSWERS
  );

  const update = (patch: Partial<OnboardingAnswers>) => {
    setAnswers((prev) => {
      const next = { ...prev, ...patch };
      setOnboardingFullAnswers(next);
      if (patch.name !== undefined) setOnboardingName(patch.name);
      if (patch.gender) setOnboardingGender(patch.gender);
      return next;
    });
  };

  return { answers, update };
}

export const AGE_RANGES: { id: AgeRange; label: string }[] = [
  { id: '10-17', label: '10-17' },
  { id: '18-24', label: '18-24' },
  { id: '25-34', label: '25-34' },
  { id: '35-44', label: '35-44' },
  { id: '45-54', label: '45-54' },
  { id: '55+', label: '55+' },
];

export const PHONE_HOURS_RANGES: { id: PhoneHoursRange; label: string }[] = [
  { id: '<2', label: 'פחות משעתיים' },
  { id: '2-4', label: '2-4 שעות' },
  { id: '4-6', label: '4-6 שעות' },
  { id: '6+', label: '+6 שעות' },
];

const AGE_REMAINING_YEARS: Record<AgeRange, number> = {
  '10-17': 65,
  '18-24': 60,
  '25-34': 50,
  '35-44': 40,
  '45-54': 30,
  '55+': 20,
};

const PHONE_HOURS_MIDPOINT: Record<PhoneHoursRange, number> = {
  '<2': 1,
  '2-4': 3,
  '4-6': 5,
  '6+': 7,
};

export interface PhoneTimeStats {
  hoursPerYear: number;
  daysPerYear: number;
  lifetimeYears: number;
  /** Same projection as `lifetimeYears`, kept to one decimal place — the onboarding reveal's hero number uses this so the figure reads as a precise, personal calculation rather than a rounded guess. */
  lifetimeYearsPrecise: number;
}

/** The "bombshell" numbers — how much of this year, and of the user's remaining life, goes to the phone. */
export function computePhoneTimeStats(answers: OnboardingAnswers): PhoneTimeStats {
  const dailyHours = PHONE_HOURS_MIDPOINT[answers.phoneHoursRange ?? '2-4'];
  const remainingYears = AGE_REMAINING_YEARS[answers.ageRange ?? '25-34'];
  const hoursPerYear = dailyHours * 365;
  const lifetimeYearsRaw = (hoursPerYear * remainingYears) / 8760;
  return {
    hoursPerYear: Math.round(hoursPerYear),
    daysPerYear: Math.round(hoursPerYear / 24),
    lifetimeYears: Math.round(lifetimeYearsRaw),
    lifetimeYearsPrecise: Math.round(lifetimeYearsRaw * 10) / 10,
  };
}

// The product's daily ritual is framed as "5 minutes a day" (Bombshell's
// positive-reframe beat) — these two figures are flat projections of that
// commitment, not derived from the user's current habit.
export const DAILY_PRAYER_MINUTES = 5;
export const YEARLY_PRAYER_HOURS = Math.round((DAILY_PRAYER_MINUTES * 365) / 60);
export const MONTHLY_PRAYER_HOURS = Math.round(((DAILY_PRAYER_MINUTES * 30) / 60) * 10) / 10;

export interface CommitmentLevel {
  id: string;
  label: string;
  emoji: string;
  percent: number;
  /** Affirming reflection copy shown right after picking this level. */
  affirmation: string;
}

interface CommitmentLevelBase {
  id: string;
  emoji: string;
  percent: number;
  labelM: string;
  labelF: string;
  affirmationM: string;
  affirmationF: string;
}

const COMMITMENT_LEVELS_BASE: CommitmentLevelBase[] = [
  {
    id: 'extremely',
    emoji: '🔥',
    percent: 100,
    labelM: 'מחויב לגמרי',
    labelF: 'מחויבת לגמרי',
    affirmationM:
      'אתה כל-כולך בפנים, וכך גם ה׳. זו עמדת הלב שמזיזה הרים — בואו נשמור על התנופה הזו יחד.',
    affirmationF:
      'את כל-כולך בפנים, וכך גם ה׳. זו עמדת הלב שמזיזה הרים — בואו נשמור על התנופה הזו יחד.',
  },
  {
    id: 'very',
    emoji: '💪',
    percent: 80,
    labelM: 'מחויב מאוד',
    labelF: 'מחויבת מאוד',
    affirmationM: 'מחויבות אמיתית היא בדיוק מה שצריך כדי להפוך הרגל לחיים. אנחנו כאן בשבילך.',
    affirmationF: 'מחויבות אמיתית היא בדיוק מה שצריך כדי להפוך הרגל לחיים. אנחנו כאן בשבילך.',
  },
  {
    id: 'somewhat',
    emoji: '🤔',
    percent: 55,
    labelM: 'די מחויב',
    labelF: 'די מחויבת',
    affirmationM: 'זו התחלה כנה — לא צריך שלמות, רק עקביות. כל תפילה קטנה בונה משהו גדול יותר.',
    affirmationF: 'זו התחלה כנה — לא צריך שלמות, רק עקביות. כל תפילה קטנה בונה משהו גדול יותר.',
  },
  {
    id: 'little',
    emoji: '🌱',
    percent: 30,
    labelM: 'קצת מחויב',
    labelF: 'קצת מחויבת',
    affirmationM: 'גם זרע קטן יכול לגדול. ניקח את זה צעד אחד בכל פעם, בלי לחץ.',
    affirmationF: 'גם זרע קטן יכול לגדול. ניקח את זה צעד אחד בכל פעם, בלי לחץ.',
  },
  {
    id: 'trying',
    emoji: '🪄',
    percent: 10,
    labelM: 'רק מנסה',
    labelF: 'רק מנסה',
    affirmationM: 'זה בסדר גמור להתחיל בסקרנות. תן לזה הזדמנות — אולי זה בדיוק מה שחיפשת.',
    affirmationF: 'זה בסדר גמור להתחיל בסקרנות. תני לזה הזדמנות — אולי זה בדיוק מה שחיפשת.',
  },
];

function resolveCommitmentLevel(base: CommitmentLevelBase, gender: Gender | null): CommitmentLevel {
  return {
    id: base.id,
    emoji: base.emoji,
    percent: base.percent,
    label: pickG(gender, base.labelM, base.labelF),
    affirmation: pickG(gender, base.affirmationM, base.affirmationF),
  };
}

export function commitmentLevels(gender: Gender | null): CommitmentLevel[] {
  return COMMITMENT_LEVELS_BASE.map((base) => resolveCommitmentLevel(base, gender));
}

export function commitmentPercent(commitmentId: string | null): number {
  return COMMITMENT_LEVELS_BASE.find((level) => level.id === commitmentId)?.percent ?? COMMITMENT_LEVELS_BASE[2].percent;
}

export function commitmentLevel(commitmentId: string | null, gender: Gender | null): CommitmentLevel {
  const base = COMMITMENT_LEVELS_BASE.find((level) => level.id === commitmentId) ?? COMMITMENT_LEVELS_BASE[2];
  return resolveCommitmentLevel(base, gender);
}

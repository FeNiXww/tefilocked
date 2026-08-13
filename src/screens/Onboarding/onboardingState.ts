import { useState } from 'react';
import type { Mood } from '../../content/types';
import { getOnboardingFullAnswers, setOnboardingFullAnswers, setOnboardingGender, setOnboardingName } from '../../data/storage/mmkv';

export type AgeRange = '10-17' | '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type PhoneHoursRange = '1-2' | '2-3' | '3-4' | '4-5' | '5-6' | '6+';
export type Gender = 'man' | 'woman';

export interface OnboardingAnswers {
  name: string;
  ageRange: AgeRange | null;
  phoneHoursRange: PhoneHoursRange | null;
  gender: Gender | null;
  affiliation: string | null;
  previousAppsUsed: string | null;
  prayerDaysPerWeek: number;
  struggles: string[];
  relationshipStatus: string | null;
  obstacles: string[];
  goals: string[];
  thrivingVision: string | null;
  demoMood: Mood | null;
  demoConnection: number | null;
  demoContentText: string | null;
  demoContentSource: string | null;
  commitment: string | null;
}

export const INITIAL_ONBOARDING_ANSWERS: OnboardingAnswers = {
  name: '',
  ageRange: null,
  phoneHoursRange: null,
  gender: null,
  affiliation: null,
  previousAppsUsed: null,
  prayerDaysPerWeek: 3,
  struggles: [],
  relationshipStatus: null,
  obstacles: [],
  goals: [],
  thrivingVision: null,
  demoMood: null,
  demoConnection: null,
  demoContentText: null,
  demoContentSource: null,
  commitment: null,
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
  { id: '1-2', label: '1-2 שעות' },
  { id: '2-3', label: '2-3 שעות' },
  { id: '3-4', label: '3-4 שעות' },
  { id: '4-5', label: '4-5 שעות' },
  { id: '5-6', label: '5-6 שעות' },
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
  '1-2': 1.5,
  '2-3': 2.5,
  '3-4': 3.5,
  '4-5': 4.5,
  '5-6': 5.5,
  '6+': 7,
};

export interface PhoneTimeStats {
  hoursPerYear: number;
  daysPerYear: number;
  lifetimeYears: number;
}

/** The "bombshell" numbers — how much of this year, and of the user's remaining life, goes to the phone. */
export function computePhoneTimeStats(answers: OnboardingAnswers): PhoneTimeStats {
  const dailyHours = PHONE_HOURS_MIDPOINT[answers.phoneHoursRange ?? '3-4'];
  const remainingYears = AGE_REMAINING_YEARS[answers.ageRange ?? '25-34'];
  const hoursPerYear = dailyHours * 365;
  return {
    hoursPerYear: Math.round(hoursPerYear),
    daysPerYear: Math.round(hoursPerYear / 24),
    lifetimeYears: Math.round((hoursPerYear * remainingYears) / 8760),
  };
}

// The product's daily ritual is framed as "5 minutes a day" (Bridge screen
// copy) — these two figures are flat projections of that commitment, not
// derived from the user's current habit, matching the reference app's
// paywall-adjacent stats ("30+ hours a year", "2.5 hours" monthly).
export const DAILY_PRAYER_MINUTES = 5;
export const YEARLY_PRAYER_HOURS = Math.round((DAILY_PRAYER_MINUTES * 365) / 60);
export const MONTHLY_PRAYER_HOURS = Math.round(((DAILY_PRAYER_MINUTES * 30) / 60) * 10) / 10;

export const PLAN_HORIZON_DAYS = 30;

export function computeTargetDate(fromDate: Date = new Date()): Date {
  const date = new Date(fromDate);
  date.setDate(date.getDate() + PLAN_HORIZON_DAYS);
  return date;
}

export function formatHebrewDate(date: Date): string {
  return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
}

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
      'אתה כל-כולך בפנים, וכך גם הקדוש ברוך הוא. זו עמדת הלב שמזיזה הרים — בואו נשמור על התנופה הזו יחד.',
    affirmationF:
      'את כל-כולך בפנים, וכך גם הקדוש ברוך הוא. זו עמדת הלב שמזיזה הרים — בואו נשמור על התנופה הזו יחד.',
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

import { AGE_RANGES, commitmentLevels, PHONE_HOURS_RANGES, pickG, type Gender, type OnboardingAnswers } from './onboardingState';

export interface ChoiceOption {
  id: string;
  label: string;
  emoji?: string;
}

export interface SingleChoiceQuestion {
  key: keyof OnboardingAnswers;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  options: ChoiceOption[];
}

export const AGE_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'ageRange',
  title: `${pickG(gender, 'בן', 'בת')} כמה ${pickG(gender, 'אתה', 'את')}?`,
  options: AGE_RANGES.map((range) => ({ id: range.id, label: range.label })),
});

export const PHONE_USAGE_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'phoneHoursRange',
  title: `כמה זמן ${pickG(gender, 'אתה', 'את')} על הטלפון בכל יום?`,
  options: PHONE_HOURS_RANGES.map((range) => ({ id: range.id, label: range.label })),
});

export const GENDER_QUESTION: SingleChoiceQuestion = {
  key: 'gender',
  subtitle: 'כדי שפניית הלשון בתפילות תהיה מדויקת בשבילך',
  title: 'מה המגדר שלך?',
  options: [
    { id: 'man', label: 'זכר' },
    { id: 'woman', label: 'נקבה' },
  ],
};

export const COMMITMENT_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'commitment',
  title: `כמה ${pickG(gender, 'מחויב אתה', 'מחויבת את')} להפוך את העתיד הזה למציאות?`,
  options: commitmentLevels(gender).map((level) => ({ id: level.id, label: level.label, emoji: level.emoji })),
});

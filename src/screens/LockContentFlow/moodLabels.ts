import type { Mood } from '../../content/types';
import { pickG, type Gender } from '../Onboarding/onboardingState';

export const MOOD_LABELS_HE: Record<Mood, string> = {
  stressed: 'לחוץ',
  anxious: 'חרד',
  grateful: 'אסיר תודה',
  lonely: 'בודד',
  happy: 'שמח',
  distracted: 'מוסח דעת',
  tired: 'עייף',
};

const MOOD_LABELS_HE_FEMININE: Record<Mood, string> = {
  stressed: 'לחוצה',
  anxious: 'חרדה',
  grateful: 'אסירת תודה',
  lonely: 'בודדה',
  happy: 'שמחה',
  distracted: 'מוסחת דעת',
  tired: 'עייפה',
};

export function moodLabel(mood: Mood, gender: Gender | null): string {
  return pickG(gender, MOOD_LABELS_HE[mood], MOOD_LABELS_HE_FEMININE[mood]);
}

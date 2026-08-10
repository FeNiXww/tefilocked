import type { Mood } from '../content/types';

// Maps each discrete mood to a 1-5 valence for analytics/display only (e.g.
// "avg mood" in Insights). Never used by pickContentForMood or JSON content
// tagging — purely a reporting concern, safe to retune without touching
// content matching.
export const MOOD_VALENCE: Record<Mood, number> = {
  stressed: 2,
  anxious: 2,
  tired: 2,
  lonely: 2,
  distracted: 3,
  grateful: 5,
  happy: 5,
};
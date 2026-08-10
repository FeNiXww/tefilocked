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

export interface ContentItem {
  id: string;
  hebrewText: string;
  transliteration?: string;
  translation?: string;
  source: string;
  moods: Mood[];
  contentTypes: ContentType[];
  length: 'short' | 'medium';
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

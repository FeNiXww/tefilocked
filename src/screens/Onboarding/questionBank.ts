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

export interface MultiChoiceQuestion {
  key: keyof OnboardingAnswers;
  title: string;
  subtitle: string;
  maxSelect?: number;
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

export const AFFILIATION_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'affiliation',
  eyebrow: 'כדי שהתפילות והתכנים ירגישו נכונים בשבילך',
  title: 'מה הקירבה שלך לדת?',
  options: [
    { id: 'charedi', label: pickG(gender, 'חרדי', 'חרדית') },
    { id: 'national_religious', label: pickG(gender, 'דתי לאומי', 'דתייה לאומית') },
    { id: 'traditional', label: pickG(gender, 'מסורתי', 'מסורתית') },
    { id: 'reform_conservative', label: pickG(gender, 'רפורמי או קונסרבטיבי', 'רפורמית או קונסרבטיבית') },
    { id: 'connected_secular', label: pickG(gender, 'מחובר אך לא דתי', 'מחוברת אך לא דתייה') },
    { id: 'secular', label: pickG(gender, 'חילוני', 'חילונית') },
  ],
});

export const PREVIOUS_APPS_QUESTION: SingleChoiceQuestion = {
  key: 'previousAppsUsed',
  title: 'האם השתמשת בעבר באפליקציות תפילה כמו זו?',
  options: [
    { id: 'yes', label: 'כן, השתמשתי' },
    { id: 'a_little', label: 'קצת, ולא הצליח לי' },
    { id: 'no', label: 'לא, זו הפעם הראשונה' },
  ],
};

export const GENDER_QUESTION: SingleChoiceQuestion = {
  key: 'gender',
  subtitle: 'כדי שפניית הלשון בתפילות תהיה מדויקת בשבילך',
  title: 'מה המגדר שלך?',
  options: [
    { id: 'man', label: 'זכר' },
    { id: 'woman', label: 'נקבה' },
  ],
};

export const STRUGGLES_QUESTION = (gender: Gender | null): MultiChoiceQuestion => ({
  key: 'struggles',
  title: 'לפעמים, קשיים עמוקים בנפש שלנו הם הבעיה שגורמת למרחק מהקדוש ברוך הוא. מה עומד בדרכך?',
  subtitle: pickG(gender, 'בחר את כל מה שרלוונטי', 'בחרי את כל מה שרלוונטי'),
  options: [
    { id: 'wandering_thoughts', label: 'מחשבות מסעירות', emoji: '🌀' },
    { id: 'anxiety', label: 'דאגה וחרדה מתמדת', emoji: '😥' },
    { id: 'loneliness', label: 'תחושת בדידות או ריקנות', emoji: '😔' },
    { id: 'pride', label: 'גאווה או הסתמכות עצמית', emoji: '💪' },
  ],
});

export const RELATIONSHIP_STATUS_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'relationshipStatus',
  title: `איך היית ${pickG(gender, 'מתאר', 'מתארת')} את הקשר שלך עם הקדוש ברוך הוא כרגע?`,
  options: [
    { id: 'ups_and_downs', label: 'יש לזה עליות וירידות', emoji: '📈' },
    { id: 'distant', label: pickG(gender, 'מרגיש קצת רחוק לאחרונה', 'מרגישה קצת רחוקה לאחרונה'), emoji: '😔' },
    { id: 'starting', label: pickG(gender, 'רק מתחיל או בונה מחדש', 'רק מתחילה או בונה מחדש'), emoji: '🌱' },
    { id: 'close', label: 'קרוב וקבוע', emoji: '🙏' },
  ],
});

export const OBSTACLES_QUESTION = (gender: Gender | null): MultiChoiceQuestion => ({
  key: 'obstacles',
  title: 'מה הדבר העיקרי העומד בינך לבין קשר קרוב לקדוש ברוך הוא?',
  subtitle: pickG(gender, 'בחר עד 3', 'בחרי עד 3'),
  maxSelect: 3,
  options: [
    { id: 'phone_distraction', label: 'הטלפון והרשתות החברתיות', emoji: '📱' },
    { id: 'lack_of_focus', label: 'חוסר מיקוד ומחשבות נודדות', emoji: '🧠' },
    { id: 'lack_of_motivation', label: 'חוסר מוטיבציה או תחושת "יובש"', emoji: '😮‍💨' },
    { id: 'busyness', label: 'עומס וחוסר זמן', emoji: '⏰' },
  ],
});

export const GOALS_QUESTION = (gender: Gender | null): MultiChoiceQuestion => ({
  key: 'goals',
  title: `מה ${pickG(gender, 'תרצה', 'תרצי')} להשיג עם תפילוקט?`,
  subtitle: pickG(gender, 'בחר עד 3', 'בחרי עד 3'),
  maxSelect: 3,
  options: [
    { id: 'god_first', label: 'לשים את הקדוש ברוך הוא במקום הראשון, לפני הטלפון', emoji: '🙏' },
    { id: 'consistent_habit', label: 'לבנות הרגל תפילה עקבי', emoji: '🔄' },
    { id: 'deepen_connection', label: 'להעמיק את הקשר שלי עם הקדוש ברוך הוא', emoji: '❤️' },
    { id: 'find_peace', label: 'למצוא שקט נפשי ', emoji: '🕊️' },
    { id: 'start_with_intention', label: 'להתחיל את היום עם אלוקים, לא בהסחת דעת', emoji: '🎯' },
  ],
});

export const THRIVING_VISION_QUESTION: SingleChoiceQuestion = {
  key: 'thrivingVision',
  title: 'בגדול, איך נראה קשר מוצלח עם הקדוש ברוך הוא בשבילך?',
  options: [
    { id: 'trust', label: 'לבטוח בדרך של הקדוש ברוך הוא, גם כשקשה', emoji: '🤝' },
    { id: 'integrity', label: 'לחיות באמת ובשלמות', emoji: '💯' },
    { id: 'serve_others', label: 'להשתמש בכישרונות שלי כדי לעזור לאחרים', emoji: '🙌' },
    { id: 'torah_life', label: 'לבנות את חיי על התורה', emoji: '📖' },
  ],
};

export const COMMITMENT_QUESTION = (gender: Gender | null): SingleChoiceQuestion => ({
  key: 'commitment',
  title: `כמה ${pickG(gender, 'מחויב אתה', 'מחויבת את')} להפוך את העתיד הזה למציאות?`,
  options: commitmentLevels(gender).map((level) => ({ id: level.id, label: level.label, emoji: level.emoji })),
});

export function getOptionLabels(gender: Gender | null): Record<string, Record<string, string>> {
  return {
    affiliation: Object.fromEntries(AFFILIATION_QUESTION(gender).options.map((o) => [o.id, o.label])),
    relationshipStatus: Object.fromEntries(RELATIONSHIP_STATUS_QUESTION(gender).options.map((o) => [o.id, o.label])),
    obstacles: Object.fromEntries(OBSTACLES_QUESTION(gender).options.map((o) => [o.id, o.label])),
    goals: Object.fromEntries(GOALS_QUESTION(gender).options.map((o) => [o.id, o.label])),
    thrivingVision: Object.fromEntries(THRIVING_VISION_QUESTION.options.map((o) => [o.id, o.label])),
  };
}

import { pickG, type StepComponentProps } from '../onboardingState';
import { TapToContinue } from '../TapToContinue';

export function Solution({ answers, onNext }: StepComponentProps) {
  const gender = answers.gender;
  return (
    <TapToContinue
      variant="light"
      headline={'תפילוקט עוזרת לך לשים את **הקדוש ברוך הוא** במקום הראשון'}
      body={`זה פשוט: בכל יום, ${pickG(gender, 'אתה מתפלל', 'את מתפללת')} כדי לפתוח את האפליקציות שלך.`}
      onNext={onNext}
    />
  );
}

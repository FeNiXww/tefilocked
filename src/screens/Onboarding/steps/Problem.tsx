import { pickG, type StepComponentProps } from '../onboardingState';
import { TapToContinue } from '../TapToContinue';

export function Problem({ answers, onNext }: StepComponentProps) {
  const gender = answers.gender;
  return (
    <TapToContinue
      variant="light"
      headline={`${pickG(gender, 'מרגיש', 'מרגישה')} שהטלפון תופס יותר תשומת לב מאשר **הקדוש ברוך הוא**?`}
      body={`${pickG(gender, 'אתה', 'את')} לא לבד. הסחות דעת נמצאות בכל מקום, ובשקט מרחיקות אותך מהשקט ש${pickG(gender, 'אתה מחפש', 'את מחפשת')}.`}
      onNext={onNext}
    />
  );
}

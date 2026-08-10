import { pickG, type StepComponentProps } from '../onboardingState';
import { TapToContinue } from '../TapToContinue';

export function Bridge({ answers, onNext }: StepComponentProps) {
  const gender = answers.gender;
  return (
    <TapToContinue
      variant="light"
      headline={'זה **לא חייב** להיות ככה'}
      body={`יש לך 5 דקות בשביל הקדוש ברוך הוא בכל יום? ${pickG(gender, 'בוא', 'בואי')} נבנה תוכנית בשבילך.`}
      onNext={onNext}
    />
  );
}

import type { ReactElement } from 'react';
import { MultiChoiceStep } from './MultiChoiceStep';
import type { StepComponentProps } from './onboardingState';
import {
  AFFILIATION_QUESTION,
  AGE_QUESTION,
  COMMITMENT_QUESTION,
  GENDER_QUESTION,
  GOALS_QUESTION,
  OBSTACLES_QUESTION,
  PHONE_USAGE_QUESTION,
  PREVIOUS_APPS_QUESTION,
  RELATIONSHIP_STATUS_QUESTION,
  STRUGGLES_QUESTION,
  THRIVING_VISION_QUESTION,
} from './questionBank';
import { SingleChoiceStep } from './SingleChoiceStep';
import { Bombshell } from './steps/Bombshell';
import { Bridge } from './steps/Bridge';
import { CoreLoopDemo } from './steps/CoreLoopDemo';
import { FaithSnapshot } from './steps/FaithSnapshot';
import { IntroPager } from './steps/IntroPager';
import { JourneyChart } from './steps/JourneyChart';
import { JourneySummary } from './steps/JourneySummary';
import { BuildingPlanLoader } from './steps/BuildingPlanLoader';
import { NameInput } from './steps/NameInput';
import { PlanSummary } from './steps/PlanSummary';
import { PrayerFrequencyStep } from './steps/PrayerFrequencyStep';
import { Problem } from './steps/Problem';
import { ReviewPrompt } from './steps/ReviewPrompt';
import { SocialProof } from './steps/SocialProof';
import { Solution } from './steps/Solution';
import { StreakCelebration } from './steps/StreakCelebration';
import { StrugglesReflection } from './steps/StrugglesReflection';
import { WidgetIntro } from './steps/WidgetIntro';

export interface OnboardingStepDef {
  key: string;
  render: (props: StepComponentProps) => ReactElement;
}

// The full onboarding sequence, in order — see the plan's "Screen Map" for
// how each beat maps back to the reference app's 29-screen structure.
// Reordering or removing a step is a one-line change here.
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // Swipeable "Embrace" + "Lockdown" pair — demonstrates the core mechanic
  // as the very first beat of onboarding.
  { key: 'introPager', render: (p) => <IntroPager {...p} /> },
  // Asked right up front, before any other copy needs a pronoun — every
  // gendered string below (את/אתה, מחויב/ת, etc.) reads off this answer.
  { key: 'gender', render: (p) => <SingleChoiceStep {...p} question={GENDER_QUESTION} /> },
  { key: 'problem', render: (p) => <Problem {...p} /> },
  { key: 'solution', render: (p) => <Solution {...p} /> },
  { key: 'name', render: (p) => <NameInput {...p} /> },
  { key: 'age', render: (p) => <SingleChoiceStep {...p} question={AGE_QUESTION(p.answers.gender)} /> },
  { key: 'phoneUsage', render: (p) => <SingleChoiceStep {...p} question={PHONE_USAGE_QUESTION(p.answers.gender)} /> },
  { key: 'bombshell', render: (p) => <Bombshell {...p} /> },
  { key: 'bridge', render: (p) => <Bridge {...p} /> },
  { key: 'previousApps', render: (p) => <SingleChoiceStep {...p} question={PREVIOUS_APPS_QUESTION} /> },
  { key: 'affiliation', render: (p) => <SingleChoiceStep {...p} question={AFFILIATION_QUESTION(p.answers.gender)} /> },
  { key: 'prayerFrequency', render: (p) => <PrayerFrequencyStep {...p} /> },
  { key: 'struggles', render: (p) => <MultiChoiceStep {...p} question={STRUGGLES_QUESTION(p.answers.gender)} /> },
  { key: 'strugglesReflection', render: (p) => <StrugglesReflection {...p} /> },
  {
    key: 'relationshipStatus',
    render: (p) => <SingleChoiceStep {...p} question={RELATIONSHIP_STATUS_QUESTION(p.answers.gender)} />,
  },
  { key: 'obstacles', render: (p) => <MultiChoiceStep {...p} question={OBSTACLES_QUESTION(p.answers.gender)} /> },
  { key: 'goals', render: (p) => <MultiChoiceStep {...p} question={GOALS_QUESTION(p.answers.gender)} /> },
  { key: 'thrivingVision', render: (p) => <SingleChoiceStep {...p} question={THRIVING_VISION_QUESTION} /> },
  { key: 'journeySummary', render: (p) => <JourneySummary {...p} /> },
  { key: 'journeyChart', render: (p) => <JourneyChart {...p} /> },
  { key: 'coreLoopDemo', render: (p) => <CoreLoopDemo {...p} /> },
  { key: 'streakCelebration', render: (p) => <StreakCelebration {...p} /> },
  { key: 'widgetIntro', render: (p) => <WidgetIntro {...p} /> },
  { key: 'reviewPrompt', render: (p) => <ReviewPrompt {...p} /> },
  { key: 'buildingPlan', render: (p) => <BuildingPlanLoader {...p} /> },
  { key: 'planSummary', render: (p) => <PlanSummary {...p} /> },
  { key: 'commitment', render: (p) => <SingleChoiceStep {...p} question={COMMITMENT_QUESTION(p.answers.gender)} /> },
  { key: 'faithSnapshot', render: (p) => <FaithSnapshot {...p} /> },
  { key: 'socialProof', render: (p) => <SocialProof {...p} /> },
];

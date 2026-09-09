import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { AutoAdvanceChoiceStep } from './AutoAdvanceChoiceStep';
import type { StepComponentProps } from './onboardingState';
import { AGE_QUESTION, COMMITMENT_QUESTION, GENDER_QUESTION, PHONE_USAGE_QUESTION } from './questionBank';
import { AppSelectionStep } from './steps/AppSelectionStep';
import { Bombshell } from './steps/Bombshell';
import { CommitmentStep } from './steps/CommitmentStep';
import { CoreLoopDemo } from './steps/CoreLoopDemo';
import { IntroPager } from './steps/IntroPager';
import { NameInput } from './steps/NameInput';
import { NotificationPrimer } from './steps/NotificationPrimer';
import { PermissionSetup } from './steps/PermissionSetup';
import { Purpose } from './steps/Purpose';
import { WidgetPrimer } from './steps/WidgetPrimer';

export interface OnboardingStepDef {
  key: string;
  render: (props: StepComponentProps) => ReactElement;
}

// The full onboarding sequence, in order. Reordering or removing a step is a
// one-line change here. See the redesign plan for the psychology behind this
// ordering: intro pager → fast personalization → emotional payoff → hands-on
// proof → commitment → setup → paywall.
export const ONBOARDING_STEPS: OnboardingStepDef[] = [
  // The swipeable "Embrace" + "Lockdown" pair — original opening beats, kept
  // as-is per product direction rather than replaced.
  { key: 'introPager', render: (p) => <IntroPager {...p} /> },
  { key: 'name', render: (p) => <NameInput {...p} /> },
  // Asked right after name, before any other copy needs a pronoun — every
  // gendered string below (את/אתה, מחויב/ת, etc.) reads off this answer.
  { key: 'gender', render: (p) => <AutoAdvanceChoiceStep {...p} question={GENDER_QUESTION} /> },
  { key: 'age', render: (p) => <AutoAdvanceChoiceStep {...p} question={AGE_QUESTION(p.answers.gender)} /> },
  { key: 'phoneUsage', render: (p) => <AutoAdvanceChoiceStep {...p} question={PHONE_USAGE_QUESTION(p.answers.gender)} /> },
  // Right after the phone-usage answer, while it's freshest — the "years of
  // your life" reveal is computed directly from age + this answer.
  { key: 'bombshell', render: (p) => <Bombshell {...p} /> },
  // The payoff beat immediately after the reveal — reframes that same figure
  // as reclaimable time before the flow moves on to unrelated questions.
  { key: 'purpose', render: (p) => <Purpose {...p} /> },
  // The hands-on "aha" moment — the user actually does the core loop once,
  // ending with their first streak lighting.
  { key: 'coreLoopDemo', render: (p) => <CoreLoopDemo {...p} /> },
  { key: 'commitment', render: (p) => <CommitmentStep {...p} question={COMMITMENT_QUESTION(p.answers.gender)} /> },
  // Android-only: iOS's Screen Time permission is a single FamilyControls
  // runtime prompt (IOSLockList), not a two-step Settings walkthrough, and
  // its app picker is a native SwiftUI view that doesn't fit this list-row
  // UI — iOS keeps deferring both to the first Home visit.
  ...(Platform.OS === 'android'
    ? [
        { key: 'appSelection', render: (p: StepComponentProps) => <AppSelectionStep {...p} /> },
        { key: 'permissionSetup', render: (p: StepComponentProps) => <PermissionSetup {...p} /> },
      ]
    : []),
  { key: 'notificationPrimer', render: (p) => <NotificationPrimer {...p} /> },
  { key: 'widgetPrimer', render: (p) => <WidgetPrimer {...p} /> },
];

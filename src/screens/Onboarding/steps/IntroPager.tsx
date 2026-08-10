import { OnboardingPager } from '../pager/OnboardingPager';
import { ScreenTwo } from '../pager/ScreenTwo';
import { ScreenThree } from '../pager/ScreenThree';
import type { StepComponentProps } from '../onboardingState';

/** The swipeable "Embrace" + "Lockdown" pair right after Welcome — sets up the app's core mechanic before the linear question flow begins. */
export function IntroPager({ onNext }: StepComponentProps) {
  return (
    <OnboardingPager pages={[(p) => <ScreenTwo {...p} />, (p) => <ScreenThree {...p} />]} onComplete={onNext} />
  );
}

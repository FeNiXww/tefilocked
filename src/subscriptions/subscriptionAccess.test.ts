import { describe, expect, it } from 'vitest';
import { computeHasAppAccess, computeSubscriptionStatus } from './subscriptionAccess';

const REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;
const NOW = 1_000_000_000;

describe('computeSubscriptionStatus', () => {
  it('is NO_SUBSCRIPTION with no entitlement and no trial ever started', () => {
    expect(
      computeSubscriptionStatus({ entitlementActive: false, trialEndsAt: null, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })
    ).toBe('NO_SUBSCRIPTION');
  });

  it('is TRIAL_ACTIVE well before the trial ends', () => {
    const trialEndsAt = NOW + 3 * REMINDER_LEAD_MS;
    expect(computeSubscriptionStatus({ entitlementActive: false, trialEndsAt, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })).toBe(
      'TRIAL_ACTIVE'
    );
  });

  it('is TRIAL_ENDING within the reminder lead window', () => {
    const trialEndsAt = NOW + REMINDER_LEAD_MS / 2;
    expect(computeSubscriptionStatus({ entitlementActive: false, trialEndsAt, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })).toBe(
      'TRIAL_ENDING'
    );
  });

  it('is TRIAL_EXPIRED once the trial end timestamp has passed', () => {
    expect(
      computeSubscriptionStatus({ entitlementActive: false, trialEndsAt: NOW - 1, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })
    ).toBe('TRIAL_EXPIRED');
  });

  it('is SUBSCRIBED whenever entitlementActive is true, regardless of trial timestamps', () => {
    expect(
      computeSubscriptionStatus({ entitlementActive: true, trialEndsAt: null, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })
    ).toBe('SUBSCRIBED');
    expect(
      computeSubscriptionStatus({ entitlementActive: true, trialEndsAt: NOW - 1, now: NOW, reminderLeadMs: REMINDER_LEAD_MS })
    ).toBe('SUBSCRIBED');
  });
});

// Regression coverage for the actual bug this was extracted to fix:
// hasAppAccess() used to return true forever once any trial had ever been
// started, regardless of whether it later expired without converting to a
// real subscription — permanent free access after a single cancelled trial.
describe('computeHasAppAccess', () => {
  it('grants access for an active or ending trial, and for a confirmed subscription', () => {
    expect(computeHasAppAccess('TRIAL_ACTIVE')).toBe(true);
    expect(computeHasAppAccess('TRIAL_ENDING')).toBe(true);
    expect(computeHasAppAccess('SUBSCRIBED')).toBe(true);
  });

  it('denies access once a trial has expired without converting, and when none was ever started', () => {
    expect(computeHasAppAccess('TRIAL_EXPIRED')).toBe(false);
    expect(computeHasAppAccess('NO_SUBSCRIPTION')).toBe(false);
  });
});

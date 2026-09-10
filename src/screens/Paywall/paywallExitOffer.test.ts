import { describe, expect, it } from 'vitest';
import { shouldShowPaywallExitOffer } from './paywallExitOffer';

describe('shouldShowPaywallExitOffer', () => {
  it('shows the offer when backing out of the last page for the first time', () => {
    expect(shouldShowPaywallExitOffer(3, 3, false)).toBe(true);
  });

  it('never shows the offer twice on the same install', () => {
    expect(shouldShowPaywallExitOffer(3, 3, true)).toBe(false);
  });

  it('never shows the offer when backing out of an earlier page', () => {
    expect(shouldShowPaywallExitOffer(1, 3, false)).toBe(false);
    expect(shouldShowPaywallExitOffer(2, 3, false)).toBe(false);
  });
});

/**
 * The pure decision behind Paywall/index.tsx's back-button handling: backing
 * out of the final pricing page shows the one-time exit offer instead of
 * just stepping back — but only the first time on this install, and only
 * from that specific page (backing out of any earlier page always just goes
 * back). Extracted as a pure function, separate from the mmkv read/write and
 * the actual navigation, so the branching itself is unit-testable without a
 * storage or Reanimated dependency.
 */
export function shouldShowPaywallExitOffer(pageIndex: number, lastPageIndex: number, alreadySeen: boolean): boolean {
  return pageIndex === lastPageIndex && !alreadySeen;
}

// __DEV__-only escape hatch, same pattern as devContentOverride.ts — lets a
// developer force `evaluateLiturgicalEligibility`'s "now" to a specific
// instant so time-boundary states (e.g. Shema's before/during/bedieved/
// after windows) can be verified on-device deterministically, without
// touching the emulator's real system clock (which would affect every app
// and every cert/notification on the device, not just this one screen).
let forcedNow: Date | null = null;

export function setDevForcedNow(iso: string | null): void {
  if (!__DEV__) return;
  forcedNow = iso ? new Date(iso) : null;
}

export function getDevForcedNow(): Date {
  if (__DEV__ && forcedNow) return forcedNow;
  return new Date();
}

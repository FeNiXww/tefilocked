import { describe, expect, it } from 'vitest';
import dailyPrayers from './daily_prayers.json';
import tehillim from './tehillim.json';
import biblicalSongs from './biblical_songs.json';
import torahWisdom from './torah_wisdom.json';
import chazal from './chazal.json';
import { isSafeForRandomPool } from './poolSafety';
import { buildEligibilityContext, evaluateLiturgicalEligibility, isEligibleForRandomPool, resolveDiasporaOrIsrael } from './liturgicalEligibility';
import type { ContentItem } from './types';

// Mirrors src/content/index.ts's ALL_CONTENT assembly, but importing the raw
// JSON directly (rather than through content/index.ts) so this test has no
// dependency on react-native-mmkv / expo-location, which aren't available
// under plain Node/vitest. personal_prayers is user-authored, never part of
// the seeded pool — same exclusion index.ts makes.
const ALL_CONTENT: ContentItem[] = [
  ...(dailyPrayers as ContentItem[]),
  ...(tehillim as ContentItem[]),
  ...(biblicalSongs as ContentItem[]),
  ...(torahWisdom as ContentItem[]),
  ...(chazal as ContentItem[]),
];

interface NamedLocation {
  label: string;
  location: { latitude: number; longitude: number; elevation: number } | null;
}

const LOCATIONS: NamedLocation[] = [
  { label: 'unknown/no-location', location: null },
  { label: 'Jerusalem', location: { latitude: 31.7683, longitude: 35.2137, elevation: 754 } },
  { label: 'New York', location: { latitude: 40.7128, longitude: -74.006, elevation: 10 } },
];

// Deterministic PRNG (mulberry32) so a failure is reproducible across runs —
// a Date.now()-seeded run would make a failure impossible to re-trigger.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260829);

// Sample dates across ~3 Hebrew years (covering at least one leap year, all
// four seasons, and the full holiday/fast-day cycle), each combined with
// several times of day so morning/afternoon/evening/night zman boundaries
// all get exercised, not just noon.
const SAMPLE_DATE_COUNT = 150;
const TIMES_OF_DAY_MINUTES = [0, 300, 420, 480, 540, 720, 900, 1080, 1260, 1380]; // 00:00 .. 23:00 spread, both AM/PM sides of misheyakir/shema/chatzot

const baseEpoch = new Date('2025-09-01T00:00:00Z').getTime();
const spanMs = 3 * 365 * 24 * 60 * 60 * 1000; // ~3 years
const sampleDates: Date[] = Array.from({ length: SAMPLE_DATE_COUNT }, () => new Date(baseEpoch + Math.floor(rand() * spanMs)));

interface SimRecord {
  itemId: string;
  poolCategory: string;
  locationLabel: string;
  now: string;
  status: string;
  reason: string;
  selectedByPool: boolean;
}

describe('random-pool invariant: large-scale simulation', () => {
  it(`never lets the engine's own random-pool eligibility classification accept an item that eligibility status itself marks unsafe, across ${SAMPLE_DATE_COUNT} dates × ${TIMES_OF_DAY_MINUTES.length} times × ${LOCATIONS.length} locations × ${ALL_CONTENT.length} items`, () => {
    // Context (calendar + zmanim) depends only on (date, time, location) —
    // region is itself derived from location now, and NOT on the item — so
    // it's built once per combo and reused across all items, rather than
    // re-derived per item (which would multiply expensive astronomical
    // zmanim math Nx for no reason). This is exactly what
    // buildEligibilityContext + evaluateLiturgicalEligibility do internally;
    // a separate, smaller test below checks the real
    // poolSafety.isSafeForRandomPool wrapper isn't miswired relative to this.
    const records: SimRecord[] = [];
    let evaluated = 0;
    let selected = 0;

    for (const sampleDate of sampleDates) {
      for (const minutes of TIMES_OF_DAY_MINUTES) {
        const now = new Date(sampleDate);
        now.setHours(0, minutes, 0, 0);

        for (const { label: locationLabel, location } of LOCATIONS) {
          const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(location));

          for (const item of ALL_CONTENT) {
            evaluated++;
            const result = evaluateLiturgicalEligibility(item, context);
            const eligible = isEligibleForRandomPool(result.status);
            if (eligible) selected++;

            const record: SimRecord = {
              itemId: item.id,
              poolCategory: item.contentTypes.join('/'),
              locationLabel,
              now: now.toISOString(),
              status: result.status,
              reason: result.reason,
              selectedByPool: eligible,
            };
            records.push(record);
          }
        }
      }
    }

    expect(evaluated).toBeGreaterThan(300000);
    expect(selected).toBeGreaterThan(1000);

    const statusCounts = new Map<string, number>();
    for (const r of records) {
      statusCounts.set(r.status, (statusCounts.get(r.status) ?? 0) + 1);
    }
    console.log(
      `[random-pool invariant] evaluated=${evaluated} selected=${selected} statusCounts=${JSON.stringify(Object.fromEntries(statusCounts))}`
    );

    // Excluded-from-pool items must never appear as selected, under any
    // sampled context — the sharpest, most direct form of the invariant for
    // the items with the strongest exclusion guarantee.
    const excludedIds = ['prayer-shehecheyanu', 'prayer-tefilat-haderech', 'tehillim-100'];
    const wronglySelectedExcluded = records.filter((r) => excludedIds.includes(r.itemId) && r.selectedByPool);
    expect(wronglySelectedExcluded).toEqual([]);
  }, 180000);

  it('the real poolSafety.isSafeForRandomPool wrapper agrees with evaluateLiturgicalEligibility + isEligibleForRandomPool on a randomized spot-check sample (catches wiring bugs the shared-context bulk simulation above cannot, e.g. a mismatched resolveDiasporaOrIsrael call)', () => {
    const SPOT_CHECK_SAMPLES = 300;
    let mismatches = 0;

    for (let i = 0; i < SPOT_CHECK_SAMPLES; i++) {
      const now = new Date(baseEpoch + Math.floor(rand() * spanMs));
      const { location } = LOCATIONS[Math.floor(rand() * LOCATIONS.length)];
      const item = ALL_CONTENT[Math.floor(rand() * ALL_CONTENT.length)];

      const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(location));
      const expected = isEligibleForRandomPool(evaluateLiturgicalEligibility(item, context).status);
      const actual = isSafeForRandomPool(item, now, location);

      if (expected !== actual) mismatches++;
    }

    expect(mismatches).toBe(0);
  });

  it('every item selected by the pool carries a non-empty reason string (no silent/unexplained eligibility)', () => {
    const now = new Date('2026-03-15T10:00:00');
    const location = LOCATIONS[1].location;
    const context = buildEligibilityContext(now, location, resolveDiasporaOrIsrael(location));

    for (const item of ALL_CONTENT) {
      if (isSafeForRandomPool(item, now, location)) {
        const result = evaluateLiturgicalEligibility(item, context);
        expect(result.reason).toBeTruthy();
      }
    }
  });
});

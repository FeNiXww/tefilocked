import * as SQLite from 'expo-sqlite';
import { resolveDiasporaOrIsrael } from '../../content/liturgicalEligibility';
import { isProtectedStreakDayAt } from '../../content/shabbatWindow';
import type { Mood } from '../../content/types';
import { MOOD_VALENCE } from '../moodValence';
import { getStoredZmanimLocation, isStreakProtectionEnabled, setPendingHanukkiahCompletionCelebration } from './mmkv';

export type Platform = 'ios' | 'android';

interface StoredRow {
  occurredAt: number;
  day: string;
  mood: Mood;
  contentId: string;
  lockedAppPackage?: string;
  platform: Platform;
  connectionRating: number | null;
}

// Falls back to an in-memory array when the native SQLite module isn't
// linked (Expo Go) so the app is still previewable there — a real
// dev/production build always has the native module and never hits this.
let db: SQLite.SQLiteDatabase | null = null;
const mockRows: StoredRow[] = [];

try {
  db = SQLite.openDatabaseSync('tefillok.db');
} catch {
  console.warn('[tefillok] expo-sqlite unavailable (Expo Go?) — using in-memory storage fallback.');
}

export function initDatabase(): void {
  if (!db) return; // mockRows needs no schema setup
  db.execSync(`
    CREATE TABLE IF NOT EXISTS unlock_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      occurred_at INTEGER NOT NULL,
      day TEXT NOT NULL,
      mood TEXT NOT NULL,
      content_id TEXT NOT NULL,
      locked_app_package TEXT,
      platform TEXT NOT NULL,
      connection_rating INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_unlock_events_day ON unlock_events(day);
  `);
  // Cheap insurance for any dev-build DB created before connection_rating existed.
  try {
    db.execSync(`ALTER TABLE unlock_events ADD COLUMN connection_rating INTEGER`);
  } catch {
    // Column already exists — expected on a fresh DB created by the statement above.
  }
}

function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD, UTC-based
}

export interface UnlockEventInput {
  occurredAt: Date;
  mood: Mood;
  connectionRating: number;
  contentId: string;
  lockedAppPackage?: string;
  platform: Platform;
}

/**
 * Records the unlock event and, atomically alongside it, detects the
 * false→true "the חנוכייה just became fully lit" transition — the ONE place
 * this is ever computed, since this is the ONE place that ever changes the
 * data that decides it (see isHanukkiahFullyLit). This runs identically
 * whether the prayer came from the normal Home flow or from an app-lock
 * interception (App.tsx renders the same LockContentFlow either way), so a
 * completion reached via TikTok/Instagram/etc.'s lock screen is captured
 * exactly the same as one reached from inside Tefillok itself — see
 * setPendingHanukkiahCompletionCelebration for why that matters and how it's
 * consumed.
 */
export function recordUnlockEvent(event: UnlockEventInput): void {
  const wasFullyLit = isHanukkiahFullyLit(event.occurredAt);

  if (!db) {
    mockRows.push({
      occurredAt: event.occurredAt.getTime(),
      day: toDayString(event.occurredAt),
      mood: event.mood,
      contentId: event.contentId,
      lockedAppPackage: event.lockedAppPackage,
      platform: event.platform,
      connectionRating: event.connectionRating,
    });
  } else {
    db.runSync(
      `INSERT INTO unlock_events (occurred_at, day, mood, content_id, locked_app_package, platform, connection_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        event.occurredAt.getTime(),
        toDayString(event.occurredAt),
        event.mood,
        event.contentId,
        event.lockedAppPackage ?? null,
        event.platform,
        event.connectionRating,
      ]
    );
  }

  if (!wasFullyLit && isHanukkiahFullyLit(event.occurredAt)) {
    setPendingHanukkiahCompletionCelebration(true);
  }
}

/**
 * Wipes every recorded unlock event — used only by the Settings screen's
 * `__DEV__`-gated streak-loss simulator, to make `getCurrentStreak()`
 * compute back to 0 on demand without waiting on real elapsed days.
 */
export function devDeleteAllUnlockEvents(): void {
  if (!db) {
    mockRows.length = 0;
    return;
  }
  db.runSync(`DELETE FROM unlock_events`);
}

function getDistinctDays(): string[] {
  if (!db) return [...new Set(mockRows.map((r) => r.day))];
  return db.getAllSync<{ day: string }>(`SELECT DISTINCT day FROM unlock_events`).map((r) => r.day);
}

function getRowsSince(sinceMs: number): Array<{ occurredAt: number; mood: Mood; connectionRating: number | null }> {
  if (!db) {
    return mockRows
      .filter((r) => r.occurredAt >= sinceMs)
      .map((r) => ({ occurredAt: r.occurredAt, mood: r.mood, connectionRating: r.connectionRating }));
  }
  return db
    .getAllSync<{ occurred_at: number; mood: Mood; connection_rating: number | null }>(
      `SELECT occurred_at, mood, connection_rating FROM unlock_events WHERE occurred_at >= ? ORDER BY occurred_at ASC`,
      [sinceMs]
    )
    .map((r) => ({ occurredAt: r.occurred_at, mood: r.mood, connectionRating: r.connection_rating }));
}

// Safety bound on the backward walk in getCurrentStreak — protected days
// (see below) don't stop the loop on their own, so this guarantees
// termination regardless of how many consecutive protected days exist.
const MAX_STREAK_LOOKBACK_DAYS = 3650;

/**
 * Whether `dayStr` ("YYYY-MM-DD", the same UTC calendar day recorded in
 * `unlock_events.day`) is a day a missed prayer shouldn't count against the
 * streak — Shabbat or a work-prohibited Yom Tov, when phone use is
 * halachically restricted — unless the user has turned this protection off
 * in Settings. Uses real sunset/tzeit times when the user has granted
 * zmanim location (see shabbatWindow.ts); falls back to the calendar-day
 * check otherwise.
 */
function isProtectedStreakDay(dayStr: string): boolean {
  if (!isStreakProtectionEnabled()) return false;
  const location = getStoredZmanimLocation();
  return isProtectedStreakDayAt(dayStr, location, resolveDiasporaOrIsrael(location));
}

/**
 * Consecutive-day streak of at least one unlock event, counting back from
 * today. A gap of a full day with zero events breaks the streak, unless that
 * day is Shabbat or a Yom Tov (see isProtectedStreakDay) — those are skipped
 * over rather than counted or treated as a break. If there's no event yet
 * today, the streak still counts as "alive" through yesterday.
 */
export function getCurrentStreak(referenceDate: Date = new Date()): number {
  const activeDays = new Set(getDistinctDays());

  let streak = 0;
  const cursor = new Date(referenceDate);
  // Allow "today has no entry yet" without zeroing the streak.
  if (!activeDays.has(toDayString(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const dayStr = toDayString(cursor);
    if (activeDays.has(dayStr)) {
      streak += 1;
    } else if (!isProtectedStreakDay(dayStr)) {
      break;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Whether a prayer was already logged today — drives the streak visual's lit/dormant state. */
export function hasCompletedToday(referenceDate: Date = new Date()): boolean {
  return getDistinctDays().includes(toDayString(referenceDate));
}

export const MAX_HANUKKIAH_CANDLES = 9;

export interface StreakCandle {
  /** 1-based day-of-streak number this candle represents (not its slot position). */
  dayNumber: number;
  completed: boolean;
  isToday: boolean;
}

/**
 * Up to the most recent 9 days of the current streak, for the home screen's
 * חנוכייה streak row: one candle per day, oldest first, always ending on
 * today (lit once today's prayer is logged, otherwise the pending/tappable
 * candle). The row grows by one candle per day as the streak builds and caps
 * at 9 — once the streak reaches 9, every earlier candle shown is guaranteed
 * lit (they're real history), so the menorah reads as "fully lit" from then
 * on every day today is completed, same as reaching the last night of
 * Hanukkah.
 */
export function getStreakCandles(referenceDate: Date = new Date()): StreakCandle[] {
  const streak = getCurrentStreak(referenceDate);
  const litToday = hasCompletedToday(referenceDate);
  const todayDayNumber = litToday ? streak : streak + 1;
  const historyLit = Math.max(litToday ? streak - 1 : streak, 0);
  const historyCount = Math.min(historyLit, MAX_HANUKKIAH_CANDLES - 1);

  const history: StreakCandle[] = Array.from({ length: historyCount }, (_, i) => ({
    dayNumber: todayDayNumber - historyCount + i,
    completed: true,
    isToday: false,
  }));

  return [...history, { dayNumber: todayDayNumber, completed: litToday, isToday: true }];
}

/**
 * Whether every one of the חנוכייה's 9 branches is currently lit — the exact
 * same definition HanukkiahStreakRow/Home render from, kept in one place so
 * the completion-transition check in recordUnlockEvent can never drift from
 * what the UI actually considers "complete".
 */
export function isHanukkiahFullyLit(referenceDate: Date = new Date()): boolean {
  const candles = getStreakCandles(referenceDate);
  return candles.length === MAX_HANUKKIAH_CANDLES && candles.every((c) => c.completed);
}

export interface AnalyticsSummary {
  totalUnlocks: number;
  activeDays: number;
  byMood: Partial<Record<Mood, number>>;
  avgConnection: number | null;
  avgMood: number | null;
}

export function getAnalyticsSummary(sinceDaysAgo: number): AnalyticsSummary {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - sinceDaysAgo);

  const rows = getRowsSince(since.getTime());

  const byMood: Partial<Record<Mood, number>> = {};
  const days = new Set<string>();
  let connectionSum = 0;
  let connectionCount = 0;
  let moodSum = 0;

  for (const row of rows) {
    byMood[row.mood] = (byMood[row.mood] ?? 0) + 1;
    days.add(toDayString(new Date(row.occurredAt)));
    moodSum += MOOD_VALENCE[row.mood];
    if (row.connectionRating != null) {
      connectionSum += row.connectionRating;
      connectionCount += 1;
    }
  }

  return {
    totalUnlocks: rows.length,
    activeDays: days.size,
    byMood,
    avgConnection: connectionCount > 0 ? connectionSum / connectionCount : null,
    avgMood: rows.length > 0 ? moodSum / rows.length : null,
  };
}

export type TrendRange = '7D' | '30D' | '3M' | '1Y';

const RANGE_DAYS: Record<TrendRange, number> = { '7D': 7, '30D': 30, '3M': 90, '1Y': 365 };
const RANGE_GRANULARITY: Record<TrendRange, 'day' | 'week' | 'month'> = {
  '7D': 'day',
  '30D': 'day',
  '3M': 'week',
  '1Y': 'month',
};

const HEBREW_MONTH_LABELS = [
  'ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ',
];

function startOfWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d;
}

function bucketKeyForDate(date: Date, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'day') return toDayString(date);
  if (granularity === 'week') return toDayString(startOfWeek(date));
  return date.toISOString().slice(0, 7); // YYYY-MM
}

function formatBucketLabel(key: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') {
    const monthIndex = Number(key.slice(5, 7)) - 1;
    return HEBREW_MONTH_LABELS[monthIndex];
  }
  return `${key.slice(5, 7)}/${key.slice(8, 10)}`; // MM/DD
}

function advanceBucket(date: Date, granularity: 'day' | 'week' | 'month'): void {
  if (granularity === 'day') date.setUTCDate(date.getUTCDate() + 1);
  else if (granularity === 'week') date.setUTCDate(date.getUTCDate() + 7);
  else date.setUTCMonth(date.getUTCMonth() + 1);
}

export interface TrendBucket {
  bucketLabel: string;
  avgConnection: number | null;
  avgMood: number | null;
  unlockCount: number;
}

export function getUnlockTrend(range: TrendRange): TrendBucket[] {
  const granularity = RANGE_GRANULARITY[range];
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - RANGE_DAYS[range]);
  since.setUTCHours(0, 0, 0, 0);

  const rows = getRowsSince(since.getTime());

  const buckets = new Map<
    string,
    { connectionSum: number; connectionCount: number; moodSum: number; moodCount: number; unlockCount: number }
  >();

  // Seed every bucket in range so the chart has no gaps, even with zero events.
  const cursor = new Date(since);
  const now = new Date();
  while (cursor.getTime() <= now.getTime()) {
    const key = bucketKeyForDate(cursor, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, { connectionSum: 0, connectionCount: 0, moodSum: 0, moodCount: 0, unlockCount: 0 });
    }
    advanceBucket(cursor, granularity);
  }

  for (const row of rows) {
    const key = bucketKeyForDate(new Date(row.occurredAt), granularity);
    const bucket = buckets.get(key) ?? {
      connectionSum: 0,
      connectionCount: 0,
      moodSum: 0,
      moodCount: 0,
      unlockCount: 0,
    };
    bucket.unlockCount += 1;
    bucket.moodSum += MOOD_VALENCE[row.mood];
    bucket.moodCount += 1;
    if (row.connectionRating != null) {
      bucket.connectionSum += row.connectionRating;
      bucket.connectionCount += 1;
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, b]) => ({
      bucketLabel: formatBucketLabel(key, granularity),
      avgConnection: b.connectionCount > 0 ? b.connectionSum / b.connectionCount : null,
      avgMood: b.moodCount > 0 ? b.moodSum / b.moodCount : null,
      unlockCount: b.unlockCount,
    }));
}
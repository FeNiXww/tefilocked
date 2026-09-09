import type { DayPart } from './types';

/**
 * Device-local clock time bucket, no location/timezone lookup — three coarse
 * windows loosely mirroring Shacharit/Mincha/Maariv without claiming to be
 * real halachic zmanim.
 */
export function getCurrentDayPart(date: Date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night'; // 18:00–4:59
}

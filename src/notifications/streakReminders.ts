import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'streak-reminders';
const DAILY_REMINDER_ID = 'streak-daily-reminder';
const MOTIVATIONAL_ID_PREFIX = 'streak-motivation-';

// If today's Magen David isn't lit by the evening, nudge once; if it's
// already past that, one last streak-saving nudge before the day is gone.
const REMINDER_HOUR = 20;
const LAST_CALL_HOUR = 22;

type StreakNotificationType = 'reminder' | 'motivation';

interface StreakNotificationData extends Record<string, unknown> {
  type: StreakNotificationType;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'תזכורות רצף תפילה',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** SDK 57 hides foreground notification banners unless a handler is set — call once at startup. */
export function configureStreakNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function requestPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

function todayAt(hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Re-run this every time the Home screen gains focus and right after a
 * prayer completes. It always cancels the standing reminder first, so the
 * moment the Magen David is lit the pending nudge disappears with it;
 * otherwise it (re)schedules for whichever nudge time is still ahead today.
 */
export async function syncDailyReminder(litToday: boolean): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
  if (litToday) return;

  const granted = await requestPermission();
  if (!granted) return;
  await ensureAndroidChannel();

  const now = new Date();
  const evening = todayAt(REMINDER_HOUR);
  const lastCall = todayAt(LAST_CALL_HOUR);
  const fireDate = now < evening ? evening : now < lastCall ? lastCall : null;
  if (!fireDate) return; // Too late for today — tomorrow's focus/unlock cycle reschedules fresh.

  const data: StreakNotificationData = { type: 'reminder' };
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'המגן דוד שלך מחכה 🌟',
      body: 'עוד לא התפללת היום — רגע קצר מספיק כדי להדליק אותו ולשמור על הרצף.',
      data,
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}

const MOTIVATIONAL_MESSAGES: Array<{ weekday: number; hour: number; body: string }> = [
  // expo-notifications weekday: 1 = Sunday … 7 = Saturday.
  { weekday: 1, hour: 9, body: 'שבוע חדש, הזדמנות חדשה להדליק את המגן דוד כל יום 🔥' },
  { weekday: 4, hour: 18, body: 'הרצף שלך שווה לשמור עליו — רגע של תפילה, וזהו.' },
];

/**
 * Next date/time this weekly message should fire. A plain WEEKLY-repeating
 * trigger has no way to skip a single occurrence, so this computes one-shot
 * DATE triggers instead and gets rescheduled on the same cadence as the daily
 * reminder (see syncDailyReminder) — which lets it skip today's occurrence
 * when today's prayer is already logged, same as the daily reminder does,
 * instead of nagging a user who already prayed.
 */
function nextOccurrence(weekday: number, hour: number, skipIfCompletedToday: boolean): Date {
  // expo-notifications weekday: 1=Sunday…7=Saturday; JS Date#getDay(): 0=Sunday…6=Saturday.
  const jsWeekday = weekday - 1;
  const now = new Date();
  const daysAhead = (jsWeekday - now.getDay() + 7) % 7;
  const candidate = todayAt(hour);
  candidate.setDate(now.getDate() + daysAhead);
  const isToday = daysAhead === 0;
  if (isToday && (candidate <= now || skipIfCompletedToday)) {
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate;
}

/**
 * Re-run alongside syncDailyReminder (same call sites: Home focus + right
 * after a prayer completes) so each occurrence is rescheduled with current
 * information — in particular, so a Sunday/Wednesday where today's prayer is
 * already logged doesn't also fire this on top of it.
 */
export async function scheduleMotivationalMessages(litToday: boolean): Promise<void> {
  const granted = await requestPermission();
  if (!granted) return;
  await ensureAndroidChannel();

  for (let i = 0; i < MOTIVATIONAL_MESSAGES.length; i++) {
    const { weekday, hour, body } = MOTIVATIONAL_MESSAGES[i];
    const identifier = `${MOTIVATIONAL_ID_PREFIX}${i}`;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    const data: StreakNotificationData = { type: 'motivation' };
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { title: 'תזכורת מהמגן דוד שלך', body, data },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: nextOccurrence(weekday, hour, litToday),
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
      },
    });
  }
}

function isStreakNotificationData(data: unknown): data is StreakNotificationData {
  return typeof data === 'object' && data !== null && (data as StreakNotificationData).type !== undefined;
}

/**
 * Bridges a tapped reminder/motivational notification into the same
 * "show the prayer flow" trigger App.tsx already uses for locked-app taps
 * (see usePendingLockTrigger) — both a cold start (tapped while the app was
 * closed) and a tap while already running are covered.
 */
export function useStreakNotificationTrigger(onTriggered: () => void): void {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (isStreakNotificationData(response.notification.request.content.data)) {
        onTriggered();
      }
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response && isStreakNotificationData(response.notification.request.content.data)) {
          onTriggered();
        }
      })
      .catch(() => {});

    return () => subscription.remove();
  }, [onTriggered]);
}

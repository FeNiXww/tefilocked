import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { getTrialEndsAt, isTrialReminderScheduled, markTrialReminderScheduled } from './subscriptionState';
import { TRIAL_REMINDER_LEAD_MS } from './trialConfig';

const TRIAL_REMINDER_ID = 'trial-ending-reminder';
const ANDROID_CHANNEL_ID = 'subscription-reminders';

/**
 * Schedules the local "trial ends tomorrow" notification, timed
 * TRIAL_REMINDER_LEAD_MS before the trial's actual end (one day, in
 * production) — before the user is ever charged, matching Play/App Store
 * trial-to-paid expectations. Purely local (expo-notifications); no server
 * involved, and nothing here claims a charge has already happened.
 *
 * Guarded by trialReminderScheduled so it's only ever scheduled once per
 * trial (startTrial resets the flag when a new trial begins) — repeated
 * calls, e.g. from Home regaining focus, are safe no-ops.
 */
export async function scheduleTrialEndingReminder(): Promise<void> {
  if (isTrialReminderScheduled()) return;

  const trialEndsAt = getTrialEndsAt();
  if (trialEndsAt === null) return;

  const fireDate = new Date(trialEndsAt - TRIAL_REMINDER_LEAD_MS);
  if (fireDate.getTime() <= Date.now()) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'תזכורות מנוי',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_REMINDER_ID,
    content: {
      title: 'תזכורת מתפילוק',
      body: 'תקופת הניסיון החינמית שלך מסתיימת מחר. נשאר לך יום אחד ליהנות מתפילוק.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });

  markTrialReminderScheduled();
}

export async function cancelTrialEndingReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID).catch(() => {});
}

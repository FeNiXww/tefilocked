import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

const TRIAL_REMINDER_ID = 'trial-ending-reminder';
const ANDROID_CHANNEL_ID = 'subscription-reminders';

/**
 * Schedules a local notification 24h before the trial's last day (day
 * `trialLengthDays - 1`), so the user is warned before the real charge
 * happens — matches App Store/Play Store expectations for trial-to-paid
 * subscriptions. Purely local (expo-notifications), no server involved.
 */
export async function scheduleTrialEndingReminder(trialLengthDays = 7): Promise<void> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'תזכורות מנוי',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID).catch(() => {});

  const fireDate = new Date();
  fireDate.setDate(fireDate.getDate() + trialLengthDays - 1);

  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_REMINDER_ID,
    content: {
      title: 'תזכורת: החיוב על המנוי מתחיל מחר',
      body: 'תקופת הניסיון החינמית מסתיימת מחר. ניתן לבטל בכל עת דרך ההגדרות.',
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: fireDate,
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
}

export async function cancelTrialEndingReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(TRIAL_REMINDER_ID).catch(() => {});
}
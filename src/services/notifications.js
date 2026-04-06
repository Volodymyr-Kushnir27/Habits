import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function isWebPlatform() {
  return Platform.OS === 'web';
}

export async function requestNotificationPermission() {
  if (isWebPlatform()) return true;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  return !!requested.granted;
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('habit-reminders', {
    name: 'Habit reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#2563EB',
    sound: 'default',
  });
}

function parseTimeString(time) {
  const [hh, mm] = String(time).split(':').map(Number);

  if (
    Number.isNaN(hh) ||
    Number.isNaN(mm) ||
    hh < 0 ||
    hh > 23 ||
    mm < 0 ||
    mm > 59
  ) {
    throw new Error('Невірний формат часу');
  }

  return { hour: hh, minute: mm };
}

export async function scheduleHabitReminder({ title, time, body }) {
  if (isWebPlatform()) {
    return `web-${title}-${time}`;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Немає дозволу на повідомлення');
  }

  await ensureAndroidNotificationChannel();

  const { hour, minute } = parseTimeString(time);

  const trigger =
    Platform.OS === 'android'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'habit-reminders',
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        };

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Нагадування про звичку',
      body: body || `Час виконати звичку: ${title}`,
      sound: true,
    },
    trigger,
  });

  return notificationId;
}

export async function cancelHabitReminder(notificationId) {
  if (!notificationId) return;
  if (isWebPlatform()) return;

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function replaceHabitReminder({
  oldNotificationId,
  title,
  time,
  body,
}) {
  if (oldNotificationId) {
    await cancelHabitReminder(oldNotificationId);
  }

  const newNotificationId = await scheduleHabitReminder({
    title,
    time,
    body,
  });

  return newNotificationId;
}
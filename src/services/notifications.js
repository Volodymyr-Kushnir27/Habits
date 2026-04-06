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

export async function requestNotificationPermission() {
  if (Platform.OS === 'web') return true;

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
  if (Platform.OS === 'web') {
    return `web-${title}-${time}`;
  }

  const granted = await requestNotificationPermission();
  if (!granted) {
    throw new Error('Немає дозволу на повідомлення');
  }

  const { hour, minute } = parseTimeString(time);

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Нагадування про звичку',
      body: body || `Час виконати: ${title}`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelHabitReminder(notificationId) {
  if (!notificationId) return;
  if (Platform.OS === 'web') return;

  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
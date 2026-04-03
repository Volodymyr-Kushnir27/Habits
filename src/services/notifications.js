import * as Notifications from 'expo-notifications';

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
  const settings = await Notifications.getPermissionsAsync();

  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const request = await Notifications.requestPermissionsAsync();
  return !!request.granted;
}

export async function scheduleHabitReminder({ habitId, title, reminderTime }) {
  if (!reminderTime) return null;

  const [hourStr, minuteStr] = reminderTime.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Invalid reminder time');
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Нагадування про звичку',
      body: title || 'Час виконати звичку',
      data: { habitId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
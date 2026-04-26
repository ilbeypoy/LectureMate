import * as Notifications from 'expo-notifications';
import type { LMClass, LMScheduleEntry } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleClassReminders(
  entries: LMScheduleEntry[],
  classes: LMClass[]
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  for (const entry of entries) {
    const cls = classes.find((c) => c.id === entry.classId);
    if (!cls) continue;

    let reminderHour = entry.startHour;
    let reminderMinute = entry.startMinute - 5;
    if (reminderMinute < 0) {
      reminderMinute += 60;
      reminderHour -= 1;
    }
    if (reminderHour < 0) continue;

    // Expo getDay: 0=Sun..6=Sat -> bizim 1=Pazar..7=Cumartesi
    // Notification trigger weekday: 1=Sun..7=Sat (Expo SDK 54)
    const weekday = entry.dayOfWeek;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Ders Hatirlatici',
        body: `${cls.name} dersi 5 dakika sonra basliyor. Kayit icin hazir misin?`,
        data: { classId: cls.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour: reminderHour,
        minute: reminderMinute,
      },
    });
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

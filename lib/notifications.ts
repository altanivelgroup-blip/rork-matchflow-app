import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { enqueueNotification, NotificationCategory, QueuedNotificationPayload } from '@/lib/notificationQueue';

export async function sendImmediate(category: NotificationCategory, title: string, body: string, data?: Record<string, unknown>): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof Notification !== 'undefined') {
        if (Notification.permission === 'granted') {
          // eslint-disable-next-line no-new
          new Notification(title, { body });
          return 'web';
        }
        await enqueueNotification({ category, title, body, data });
        return null;
      }
      return null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: 'default', badge: 1 },
      trigger: null,
    });
    return id;
  } catch (e) {
    console.log('[notifications] immediate error, enqueue', e);
    await enqueueNotification({ category, title, body, data });
    return null;
  }
}

export async function badge(count: number): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Notifications.setBadgeCountAsync(count);
    } else {
      console.log('[badge]', count);
    }
  } catch (e) {
    console.log('[notifications] badge error', e);
  }
}

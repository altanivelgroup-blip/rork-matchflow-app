import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotificationCategory = 'mutualMatch' | 'newChat' | 'dreamDate' | 'dailyReminder';

export interface QueuedNotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface QueuedNotification extends QueuedNotificationPayload {
  id: string;
  createdAt: number;
}

const STORAGE_KEY_QUEUE = 'notifications:queue:v1';

export async function enqueueNotification(n: QueuedNotificationPayload): Promise<void> {
  const item: QueuedNotification = { ...n, id: `${Date.now()}-${Math.random()}`, createdAt: Date.now() };
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
    const arr = raw ? (JSON.parse(raw) as QueuedNotification[]) : [];
    arr.push(item);
    await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(arr));
  } catch (e) {
    console.log('[notificationQueue] enqueue error', e);
  }
}

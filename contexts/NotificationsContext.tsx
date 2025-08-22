import createContextHook from '@nkzw/create-context-hook';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { showToast } from '@/lib/toast';

export type NotificationCategory = 'mutualMatch' | 'newChat' | 'dreamDate' | 'dailyReminder';

export interface NotificationPrefs {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  premiumCustomTimes?: string[];
  internationalAlertsEnabled?: boolean;
}

export interface QueuedNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: number;
}

interface NotificationsContextType {
  permissionStatus: Notifications.PermissionStatus | 'undetermined';
  expoPushToken: string | null;
  prefs: NotificationPrefs;
  setPrefs: (next: Partial<NotificationPrefs>) => Promise<void>;
  requestPermission: () => Promise<void>;
  sendLocal: (n: Omit<QueuedNotification, 'id' | 'createdAt'>) => Promise<string | null>;
  scheduleDailyReminders: () => Promise<void>;
  clearAllScheduled: () => Promise<void>;
  setBadge: (count: number) => Promise<void>;
}

const STORAGE_KEY_PREFS = 'notifications:prefs:v1';
const STORAGE_KEY_QUEUE = 'notifications:queue:v1';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export const [NotificationsProvider, useNotifications] = createContextHook<NotificationsContextType>(() => {
  const { t } = useI18n();
  const { user } = useAuth();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | 'undetermined'>('undetermined');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [prefs, setPrefsState] = useState<NotificationPrefs>({
    enabled: true,
    categories: { mutualMatch: true, newChat: true, dreamDate: true, dailyReminder: true },
    internationalAlertsEnabled: false,
  });
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const prev = appState.current;
      appState.current = next;
      if (prev.match(/inactive|background/) && next === 'active') {
        flushQueue();
      }
    });
    return () => sub.remove();
  }, []);

  const loadPrefs = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_PREFS);
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationPrefs;
        setPrefsState({
          enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : true,
          categories: {
            mutualMatch: parsed.categories?.mutualMatch ?? true,
            newChat: parsed.categories?.newChat ?? true,
            dreamDate: parsed.categories?.dreamDate ?? true,
            dailyReminder: parsed.categories?.dailyReminder ?? true,
          },
          premiumCustomTimes: parsed.premiumCustomTimes ?? [],
          internationalAlertsEnabled: parsed.internationalAlertsEnabled ?? false,
        });
      }
    } catch (e) {
      console.log('[Notifications] load prefs error', e);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  const persistPrefs = useCallback(async (next: NotificationPrefs) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(next));
    } catch (e) {
      console.log('[Notifications] persist prefs error', e);
    }
  }, []);

  const setPrefs = useCallback(async (next: Partial<NotificationPrefs>) => {
    const mergedCategories = { ...prefs.categories, ...(next.categories ?? {}) } as Record<NotificationCategory, boolean>;
    const merged: NotificationPrefs = {
      enabled: typeof next.enabled === 'boolean' ? next.enabled : prefs.enabled,
      categories: mergedCategories,
      premiumCustomTimes: next.premiumCustomTimes ?? prefs.premiumCustomTimes ?? [],
      internationalAlertsEnabled: typeof next.internationalAlertsEnabled === 'boolean' ? next.internationalAlertsEnabled : (prefs.internationalAlertsEnabled ?? false),
    };
    setPrefsState(merged);
    await persistPrefs(merged);
  }, [prefs, persistPrefs]);

  const register = useCallback(async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPermissionStatus(status);
      if (status !== 'granted') return;
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
    } catch (e) {
      console.log('[Notifications] register error', e);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      if (status === 'granted') {
        await register();
        showToast(t('notifications.enabled') ?? 'Notifications enabled');
      } else {
        showToast(t('notifications.denied') ?? 'Notifications denied');
      }
    } catch (e) {
      console.log('[Notifications] request permission error', e);
    }
  }, [register, t]);

  useEffect(() => {
    register();
  }, [register]);

  const enqueue = useCallback(async (n: Omit<QueuedNotification, 'id' | 'createdAt'>) => {
    const item: QueuedNotification = { ...n, id: `${Date.now()}-${Math.random()}`, createdAt: Date.now() };
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
      const arr = raw ? (JSON.parse(raw) as QueuedNotification[]) : [];
      arr.push(item);
      await AsyncStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(arr));
    } catch (e) {
      console.log('[Notifications] enqueue error', e);
    }
  }, []);

  const flushQueue = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY_QUEUE);
      const arr = raw ? (JSON.parse(raw) as QueuedNotification[]) : [];
      if (!arr.length) return;
      for (const n of arr) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: { title: n.title, body: n.body, data: n.data ?? {}, sound: 'default', badge: 1 },
            trigger: null,
          });
        } catch (e) {
          console.log('[Notifications] flush one error', e);
        }
      }
      await AsyncStorage.removeItem(STORAGE_KEY_QUEUE);
    } catch (e) {
      console.log('[Notifications] flush error', e);
    }
  }, []);

  const sendLocal = useCallback(async (n: Omit<QueuedNotification, 'id' | 'createdAt'>) => {
    if (!prefs.enabled || !prefs.categories[n.category]) {
      return null;
    }
    try {
      if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        return await enqueue(n), null;
      }
      const id = await Notifications.scheduleNotificationAsync({
        content: { title: n.title, body: n.body, data: n.data ?? {}, sound: 'default', badge: 1 },
        trigger: null,
      });
      return id;
    } catch (e) {
      await enqueue(n);
      return null;
    }
  }, [enqueue, prefs.categories, prefs.enabled]);

  const parseTime = (tstr: string): { hour: number; minute: number } | null => {
    const m = tstr.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
    const mi = Math.max(0, Math.min(59, parseInt(m[2], 10)));
    return { hour: h, minute: mi };
  };

  const scheduleDailyReminders = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!prefs.enabled || !prefs.categories.dailyReminder) return;
      const times = (prefs.premiumCustomTimes && prefs.premiumCustomTimes.length > 0)
        ? prefs.premiumCustomTimes
        : ['09:00'];
      for (const tstr of times) {
        const tm = parseTime(tstr);
        if (!tm) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('notifications.reminderTitle') ?? 'MatchFlow',
            body: t('notifications.reminderBody') ?? 'New international match waiting!',
            sound: 'default',
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: tm.hour, minute: tm.minute, repeats: true },
        });
      }
      showToast(t('notifications.remindersScheduled') ?? 'Reminders scheduled');
    } catch (e) {
      console.log('[Notifications] schedule error', e);
    }
  }, [prefs.categories.dailyReminder, prefs.enabled, prefs.premiumCustomTimes, t]);

  const clearAllScheduled = useCallback(async () => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.log('[Notifications] clear scheduled error', e);
    }
  }, []);

  const setBadge = useCallback(async (count: number) => {
    try {
      if (Platform.OS === 'web') {
        console.log('[badge]', count);
        return;
      }
      await Notifications.setBadgeCountAsync(count);
    } catch (e) {
      console.log('[Notifications] setBadge error', e);
    }
  }, []);

  const value: NotificationsContextType = useMemo(() => ({
    permissionStatus,
    expoPushToken,
    prefs,
    setPrefs,
    requestPermission,
    sendLocal,
    scheduleDailyReminders,
    clearAllScheduled,
    setBadge,
  }), [permissionStatus, expoPushToken, prefs, setPrefs, requestPermission, sendLocal, scheduleDailyReminders, clearAllScheduled, setBadge]);

  return value;
});

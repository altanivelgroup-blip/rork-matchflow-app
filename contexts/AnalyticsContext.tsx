import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { getFirebase } from '@/lib/firebase';

export type AnalyticsEventName =
  | 'sign_up'
  | 'legal_accept'
  | 'verification_started'
  | 'verification_passed'
  | 'verification_failed'
  | 'verification_skipped'
  | 'permissions_granted'
  | 'permissions_denied'
  | 'ai_sim_opened'
  | 'ai_sim_completed'
  | 'premium_upgrade'
  | 'premium_cancel'
  | 'promo_applied'
  | 'match_like'
  | 'match_mutual'
  | 'chat_message'
  | 'churn_marked';

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  params?: Record<string, string | number | boolean | null>;
  at: number;
}

interface AnalyticsContextType {
  optOut: boolean;
  setOptOut: (v: boolean) => Promise<void>;
  identify: (id: string | null, traits?: Record<string, string | number | boolean>) => Promise<void>;
  track: (name: AnalyticsEventName, params?: AnalyticsEvent['params']) => Promise<void>;
  recent: AnalyticsEvent[];
  userId: string | null;
}

const STORAGE_OPTOUT = 'analytics:optout:v1';
const STORAGE_USERID = 'analytics:userid:v1';

async function initWebFirebaseAnalytics() {
  if (Platform.OS !== 'web') return null;
  try {
    const { app } = getFirebase();
    const analyticsMod = await import('firebase/analytics');
    const supported = await analyticsMod.isSupported();
    if (!supported) return null;
    const analytics = analyticsMod.getAnalytics(app);
    return { analytics, mod: analyticsMod } as const;
  } catch (e) {
    console.log('[Analytics] Web Firebase init failed', e);
    return null;
  }
}

export const [AnalyticsProvider, useAnalytics] = createContextHook<AnalyticsContextType>(() => {
  const [optOut, setOptOutState] = useState<boolean>(false);
  const [recent, setRecent] = useState<AnalyticsEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const webRef = useRef<null | { analytics: any; mod: any }>(null);

  useEffect(() => {
    (async () => {
      try {
        const [storedOpt, storedId] = await Promise.all([
          AsyncStorage.getItem(STORAGE_OPTOUT),
          AsyncStorage.getItem(STORAGE_USERID),
        ]);
        setOptOutState(storedOpt === '1');
        setUserId(storedId ?? null);
      } catch (e) {
        console.log('[Analytics] load settings error', e);
      }
      if (Platform.OS === 'web') {
        const inited = await initWebFirebaseAnalytics();
        if (inited) webRef.current = inited;
      }
    })();
  }, []);

  const setOptOut = useCallback(async (v: boolean) => {
    setOptOutState(v);
    try {
      await AsyncStorage.setItem(STORAGE_OPTOUT, v ? '1' : '0');
    } catch (e) {
      console.log('[Analytics] save optOut error', e);
    }
  }, []);

  const identify = useCallback(async (id: string | null, traits?: Record<string, string | number | boolean>) => {
    setUserId(id);
    try {
      await AsyncStorage.setItem(STORAGE_USERID, id ?? '');
    } catch (e) {
      console.log('[Analytics] save userId error', e);
    }
    if (Platform.OS === 'web' && webRef.current) {
      try {
        const { analytics, mod } = webRef.current;
        mod.setUserId(analytics, id ?? undefined);
        if (traits) {
          const mapped: Record<string, string> = {};
          Object.entries(traits).forEach(([k, v]) => {
            mapped[k] = String(v);
          });
          mod.setUserProperties(analytics, mapped);
        }
      } catch (e) {
        console.log('[Analytics] web identify error', e);
      }
    }
  }, []);

  const track = useCallback(async (name: AnalyticsEventName, params?: AnalyticsEvent['params']) => {
    const event: AnalyticsEvent = { name, params, at: Date.now() };
    setRecent((prev) => [event, ...prev].slice(0, 200));
    if (optOut) {
      console.log('[Analytics] opt-out active, event suppressed', event);
      return;
    }
    try {
      if (Platform.OS === 'web' && webRef.current) {
        const { analytics, mod } = webRef.current;
        mod.logEvent(analytics, name, params ?? {});
      } else {
        console.log('[Analytics] event', event);
      }
    } catch (e) {
      console.log('[Analytics] track error', e);
    }
  }, [optOut]);

  const value: AnalyticsContextType = useMemo(() => ({
    optOut,
    setOptOut,
    identify,
    track,
    recent,
    userId,
  }), [optOut, setOptOut, identify, track, recent, userId]);

  return value;
});

import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type MembershipTier = 'free' | 'plus';

interface SwipeState {
  dateISO: string;
  count: number;
}

interface Limits {
  dailySwipes: number | null;
  maxPhotos: number | null;
  maxVideos: number | null;
  aiRecommendations: boolean;
  adsEnabled: boolean;
}

interface MembershipContextType {
  tier: MembershipTier;
  setTier: (t: MembershipTier) => Promise<void>;
  limits: Limits;
  swipeState: SwipeState;
  canSwipe: boolean;
  incSwipe: () => Promise<void>;
  resetSwipeIfNewDay: () => Promise<void>;
}

const STORAGE_TIER = 'membership:tier:v1';
const STORAGE_SWIPE = 'membership:swipes:v1';

function limitsFor(tier: MembershipTier): Limits {
  if (tier === 'free') {
    return {
      dailySwipes: 50,
      maxPhotos: 3,
      maxVideos: 0,
      aiRecommendations: false,
      adsEnabled: true,
    };
  }
  return {
    dailySwipes: null,
    maxPhotos: 12,
    maxVideos: 6,
    aiRecommendations: true,
    adsEnabled: false,
  };
}

export const [MembershipProvider, useMembership] = createContextHook<MembershipContextType>(() => {
  const [tier, setTierState] = useState<MembershipTier>('free');
  const [swipeState, setSwipeState] = useState<SwipeState>({ dateISO: new Date().toISOString().slice(0, 10), count: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [t, s] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TIER),
          AsyncStorage.getItem(STORAGE_SWIPE),
        ]);
        if (t === 'free' || t === 'plus') setTierState(t);
        if (s) {
          const parsed = JSON.parse(s) as SwipeState;
          setSwipeState(parsed);
        }
      } catch (e) {
        console.log('[Membership] load error', e);
      }
    })();
  }, []);

  const saveTier = useCallback(async (t: MembershipTier) => {
    try {
      await AsyncStorage.setItem(STORAGE_TIER, t);
    } catch (e) {
      console.log('[Membership] save tier error', e);
    }
  }, []);

  const setTier = useCallback(async (t: MembershipTier) => {
    setTierState(t);
    await saveTier(t);
  }, [saveTier]);

  const resetSwipeIfNewDay = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (swipeState.dateISO !== today) {
      const next: SwipeState = { dateISO: today, count: 0 };
      setSwipeState(next);
      try {
        await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(next));
      } catch (e) {
        console.log('[Membership] reset swipe persist error', e);
      }
    }
  }, [swipeState.dateISO]);

  useEffect(() => {
    resetSwipeIfNewDay();
  }, [resetSwipeIfNewDay]);

  const incSwipe = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sameDay = swipeState.dateISO === today;
    const base = sameDay ? swipeState : { dateISO: today, count: 0 };
    const next: SwipeState = { dateISO: today, count: base.count + 1 };
    setSwipeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(next));
    } catch (e) {
      console.log('[Membership] inc swipe persist error', e);
    }
  }, [swipeState]);

  const limits = limitsFor(tier);
  const canSwipe = limits.dailySwipes == null || swipeState.count < (limits.dailySwipes ?? 0);

  const value: MembershipContextType = useMemo(() => ({
    tier,
    setTier,
    limits,
    swipeState,
    canSwipe,
    incSwipe,
    resetSwipeIfNewDay,
  }), [tier, setTier, limits, swipeState, canSwipe, incSwipe, resetSwipeIfNewDay]);

  return value;
});

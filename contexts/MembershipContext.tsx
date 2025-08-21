import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { backend } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [tier, setTierState] = useState<MembershipTier>('free');
  const [swipeState, setSwipeState] = useState<SwipeState>({ dateISO: new Date().toISOString().slice(0, 10), count: 0 });

  useEffect(() => {
    (async () => {
      try {
        const uid = user?.email ?? 'guest';
        const snap = await backend.fetchMembership(uid);
        setTierState(snap.tier);
        setSwipeState(snap.swipeState);
        await AsyncStorage.setItem(STORAGE_TIER, snap.tier);
        await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(snap.swipeState));
      } catch (e) {
        console.log('[Membership] load error', e);
      }
    })();
  }, [user?.email]);

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
    try {
      const uid = user?.email ?? 'guest';
      const snap = await backend.setTier(uid, t);
      setSwipeState(snap.swipeState);
      await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(snap.swipeState));
    } catch (e) {
      console.log('[Membership] backend setTier error', e);
    }
  }, [saveTier, user?.email]);

  const resetSwipeIfNewDay = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (swipeState.dateISO !== today) {
      const uid = user?.email ?? 'guest';
      try {
        const snap = await backend.resetDaily(uid);
        setSwipeState(snap.swipeState);
        await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(snap.swipeState));
      } catch (e) {
        console.log('[Membership] reset swipe persist error', e);
      }
    }
  }, [swipeState.dateISO, user?.email]);

  useEffect(() => {
    resetSwipeIfNewDay();
  }, [resetSwipeIfNewDay]);

  const incSwipe = useCallback(async () => {
    try {
      const uid = user?.email ?? 'guest';
      const snap = await backend.recordSwipe(uid);
      setSwipeState(snap.swipeState);
      await AsyncStorage.setItem(STORAGE_SWIPE, JSON.stringify(snap.swipeState));
    } catch (e) {
      console.log('[Membership] inc swipe persist error', e);
    }
  }, [user?.email]);

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

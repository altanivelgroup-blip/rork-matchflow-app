import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserId = string;
export type MembershipTier = 'free' | 'plus';

export interface SwipeState {
  dateISO: string;
  count: number;
}

export interface Limits {
  dailySwipes: number | null;
  maxPhotos: number | null;
  maxVideos: number | null;
  aiRecommendations: boolean;
  adsEnabled: boolean;
}

export interface MembershipSnapshot {
  userId: UserId;
  tier: MembershipTier;
  swipeState: SwipeState;
  limits: Limits;
}

export interface BackendAPI {
  fetchMembership(userId: UserId): Promise<MembershipSnapshot>;
  setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot>;
  recordSwipe(userId: UserId): Promise<MembershipSnapshot>;
  resetDaily(userId: UserId): Promise<MembershipSnapshot>;
}

const STORAGE_PREFIX = 'mock-backend:v1';

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
    maxPhotos: null,
    maxVideos: null,
    aiRecommendations: true,
    adsEnabled: false,
  };
}

export class MockBackend implements BackendAPI {
  async fetchMembership(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const today = new Date().toISOString().slice(0, 10);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      const tier: MembershipTier = userId.endsWith('+') ? 'plus' : 'free';
      const snapshot: MembershipSnapshot = {
        userId,
        tier,
        swipeState: { dateISO: today, count: 0 },
        limits: limitsFor(tier),
      };
      await AsyncStorage.setItem(key, JSON.stringify(snapshot));
      return snapshot;
    }
    const parsed = JSON.parse(raw) as MembershipSnapshot;
    if (parsed.swipeState.dateISO !== today) {
      parsed.swipeState = { dateISO: today, count: 0 };
      await AsyncStorage.setItem(key, JSON.stringify(parsed));
    }
    parsed.limits = limitsFor(parsed.tier);
    return parsed;
  }

  async setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const next: MembershipSnapshot = {
      ...current,
      tier,
      limits: limitsFor(tier),
    };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  }

  async recordSwipe(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const today = new Date().toISOString().slice(0, 10);
    const base = current.swipeState.dateISO === today ? current.swipeState : { dateISO: today, count: 0 };
    const nextState: SwipeState = { dateISO: today, count: base.count + 1 };
    const next: MembershipSnapshot = { ...current, swipeState: nextState };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  }

  async resetDaily(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const today = new Date().toISOString().slice(0, 10);
    const next: MembershipSnapshot = { ...current, swipeState: { dateISO: today, count: 0 } };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  }
}

export const backend: BackendAPI = new MockBackend();

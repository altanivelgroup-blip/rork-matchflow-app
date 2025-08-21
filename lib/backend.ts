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

export type SubscriptionStatus = 'none' | 'active' | 'canceled' | 'expired';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  renewsAtISO: string | null;
}

export interface MembershipSnapshot {
  userId: UserId;
  tier: MembershipTier;
  swipeState: SwipeState;
  limits: Limits;
  subscription: SubscriptionInfo;
}

export interface QuestionnaireAnswers {
  hobbies: string[];
  preferredAgeRange: { min: number; max: number };
  dealBreakers: string[];
  bio: string;
  interests: string[];
  loveLanguages?: string[];
  personalityTraits?: string[];
  lifestyle?: { alcohol?: string; smoking?: string; fitness?: string };
  lookingFor?: string;
  musicGenres?: string[];
  cuisine?: string[];
}

export interface BackendAPI {
  fetchMembership(userId: UserId): Promise<MembershipSnapshot>;
  setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot>;
  recordSwipe(userId: UserId): Promise<MembershipSnapshot>;
  resetDaily(userId: UserId): Promise<MembershipSnapshot>;
  cancelSubscription(userId: UserId): Promise<MembershipSnapshot>;
  restoreSubscription(userId: UserId): Promise<MembershipSnapshot>;
  fetchQuestionnaire(userId: UserId): Promise<QuestionnaireAnswers | null>;
  saveQuestionnaire(userId: UserId, answers: QuestionnaireAnswers): Promise<QuestionnaireAnswers>;
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

function computeExpired(sub: SubscriptionInfo): SubscriptionStatus {
  if (sub.status === 'active' && sub.renewsAtISO) {
    const now = Date.now();
    const renew = new Date(sub.renewsAtISO).getTime();
    if (isFinite(renew) && renew < now) return 'expired';
  }
  return sub.status;
}

export class MockBackend implements BackendAPI {
  async fetchMembership(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const today = new Date().toISOString().slice(0, 10);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      const tier: MembershipTier = userId.endsWith('+') ? 'plus' : 'free';
      const subscription: SubscriptionInfo = tier === 'plus'
        ? { status: 'active', renewsAtISO: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() }
        : { status: 'none', renewsAtISO: null };
      const snapshot: MembershipSnapshot = {
        userId,
        tier,
        swipeState: { dateISO: today, count: 0 },
        limits: limitsFor(tier),
        subscription,
      };
      await AsyncStorage.setItem(key, JSON.stringify(snapshot));
      return snapshot;
    }
    const parsed = JSON.parse(raw) as MembershipSnapshot;
    if (parsed.swipeState.dateISO !== today) {
      parsed.swipeState = { dateISO: today, count: 0 };
    }
    // Check subscription expiration and downgrade if needed
    const status = computeExpired(parsed.subscription);
    if (status === 'expired' || status === 'canceled') {
      parsed.tier = 'free';
      parsed.subscription.status = status === 'expired' ? 'expired' : 'canceled';
    }
    parsed.limits = limitsFor(parsed.tier);
    await AsyncStorage.setItem(key, JSON.stringify(parsed));
    return parsed;
  }

  async fetchQuestionnaire(userId: UserId): Promise<QuestionnaireAnswers | null> {
    const key = `${STORAGE_PREFIX}:q:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as QuestionnaireAnswers;
    } catch {
      return null;
    }
  }

  async saveQuestionnaire(userId: UserId, answers: QuestionnaireAnswers): Promise<QuestionnaireAnswers> {
    const key = `${STORAGE_PREFIX}:q:${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(answers));
    return answers;
  }

  async setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const next: MembershipSnapshot = {
      ...current,
      tier,
      limits: limitsFor(tier),
      subscription: tier === 'plus'
        ? { status: 'active', renewsAtISO: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() }
        : { status: 'none', renewsAtISO: null },
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

  async cancelSubscription(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const next: MembershipSnapshot = {
      ...current,
      subscription: { status: 'canceled', renewsAtISO: current.subscription.renewsAtISO },
      tier: 'free',
      limits: limitsFor('free'),
    };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  }

  async restoreSubscription(userId: UserId): Promise<MembershipSnapshot> {
    const key = `${STORAGE_PREFIX}:user:${userId}`;
    const current = await this.fetchMembership(userId);
    const next: MembershipSnapshot = {
      ...current,
      tier: 'plus',
      limits: limitsFor('plus'),
      subscription: { status: 'active', renewsAtISO: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
    };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
  }
}

export const backend: BackendAPI = new MockBackend();

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

export type VerificationModePref = 'auto' | 'manual' | 'both';
export type CaptureChoice = 'live' | 'static';

export type PreferredGateway = 'paypal' | 'stripe';

export interface UserSettings {
  preferredLanguage?: string;
  translateTarget?: string;
  translateEnabled?: boolean;
  verificationMode?: VerificationModePref;
  captureChoice?: CaptureChoice;
  matchAnimationsEnabled?: boolean;
  matchAnimationIntensity?: number; // 1-10
  preferredGateway?: PreferredGateway;
}

export interface LikesState {
  liked: string[];
  likedBy: string[];
}

export interface LikeResult { mutual: boolean }

export interface BackendAPI {
  fetchMembership(userId: UserId): Promise<MembershipSnapshot>;
  setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot>;
  recordSwipe(userId: UserId): Promise<MembershipSnapshot>;
  resetDaily(userId: UserId): Promise<MembershipSnapshot>;
  cancelSubscription(userId: UserId): Promise<MembershipSnapshot>;
  restoreSubscription(userId: UserId): Promise<MembershipSnapshot>;
  fetchQuestionnaire(userId: UserId): Promise<QuestionnaireAnswers | null>;
  saveQuestionnaire(userId: UserId, answers: QuestionnaireAnswers): Promise<QuestionnaireAnswers>;
  fetchUserSettings(userId: UserId): Promise<UserSettings | null>;
  saveUserSettings(userId: UserId, settings: Partial<UserSettings>): Promise<UserSettings>;
  recordLike(userId: UserId, targetUserId: string): Promise<LikeResult>;
  recordPass(userId: UserId, targetUserId: string): Promise<void>;
  getLikes(userId: UserId): Promise<LikesState>;
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

async function getLikesKey(userId: UserId): Promise<string> {
  return `${STORAGE_PREFIX}:likes:${userId}`;
}

async function readLikes(userId: UserId): Promise<LikesState> {
  const key = await getLikesKey(userId);
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return { liked: [], likedBy: [] };
  try {
    const parsed = JSON.parse(raw) as LikesState;
    return { liked: parsed.liked ?? [], likedBy: parsed.likedBy ?? [] };
  } catch {
    return { liked: [], likedBy: [] };
  }
}

async function writeLikes(userId: UserId, state: LikesState): Promise<void> {
  const key = await getLikesKey(userId);
  await AsyncStorage.setItem(key, JSON.stringify(state));
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

  async fetchUserSettings(userId: UserId): Promise<UserSettings | null> {
    const key = `${STORAGE_PREFIX}:settings:${userId}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserSettings;
    } catch {
      return null;
    }
  }

  async saveUserSettings(userId: UserId, settings: Partial<UserSettings>): Promise<UserSettings> {
    const key = `${STORAGE_PREFIX}:settings:${userId}`;
    const currentRaw = await AsyncStorage.getItem(key);
    const current = currentRaw ? (JSON.parse(currentRaw) as UserSettings) : {};
    const next: UserSettings = { 
      preferredLanguage: current.preferredLanguage,
      translateTarget: current.translateTarget,
      translateEnabled: current.translateEnabled,
      verificationMode: current.verificationMode ?? 'auto',
      captureChoice: current.captureChoice ?? 'static',
      matchAnimationsEnabled: typeof current.matchAnimationsEnabled === 'boolean' ? current.matchAnimationsEnabled : true,
      matchAnimationIntensity: typeof current.matchAnimationIntensity === 'number' ? current.matchAnimationIntensity : 7,
      preferredGateway: (current.preferredGateway as PreferredGateway) ?? 'paypal',
      ...settings,
    };
    await AsyncStorage.setItem(key, JSON.stringify(next));
    return next;
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

  async getLikes(userId: UserId): Promise<LikesState> {
    const current = await readLikes(userId);
    return current;
  }

  async recordLike(userId: UserId, targetUserId: string): Promise<LikeResult> {
    const myLikes = await readLikes(userId);
    const already = new Set(myLikes.liked);
    already.add(targetUserId);
    const nextMine: LikesState = { liked: Array.from(already), likedBy: myLikes.likedBy };
    await writeLikes(userId, nextMine);

    const targetLikes = await readLikes(targetUserId);
    const targetLikedMe = new Set(targetLikes.liked).has(userId);

    // Seed some simulated incoming likes for demo (IDs 1,3,5,8)
    const simulatedLikedBy = ['1','3','5','8'];
    const isSimulated = simulatedLikedBy.includes(userId);
    const mutual = targetLikedMe || isSimulated;

    if (mutual) {
      // reflect mutual by adding to likedBy lists
      const nextTarget = { liked: targetLikes.liked, likedBy: Array.from(new Set([...(targetLikes.likedBy ?? []), userId])) } as LikesState;
      await writeLikes(targetUserId, nextTarget);
      const nextMineFinal = { ...nextMine, likedBy: Array.from(new Set([...(nextMine.likedBy ?? []), targetUserId])) } as LikesState;
      await writeLikes(userId, nextMineFinal);
    }
    return { mutual };
  }

  async recordPass(userId: UserId, targetUserId: string): Promise<void> {
    const myLikes = await readLikes(userId);
    const next: LikesState = { liked: myLikes.liked.filter(id => id !== targetUserId), likedBy: myLikes.likedBy };
    await writeLikes(userId, next);
  }
}

class RestBackend implements BackendAPI {
  baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }
  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
  async fetchMembership(userId: UserId): Promise<MembershipSnapshot> {
    return this.get<MembershipSnapshot>(`/api/membership?userId=${encodeURIComponent(userId)}`);
  }
  async setTier(userId: UserId, tier: MembershipTier): Promise<MembershipSnapshot> {
    return this.post<MembershipSnapshot>(`/api/membership/set-tier`, { userId, tier });
  }
  async recordSwipe(userId: UserId): Promise<MembershipSnapshot> {
    return this.post<MembershipSnapshot>(`/api/membership/record-swipe`, { userId });
  }
  async resetDaily(userId: UserId): Promise<MembershipSnapshot> {
    return this.post<MembershipSnapshot>(`/api/membership/reset-daily`, { userId });
  }
  async cancelSubscription(userId: UserId): Promise<MembershipSnapshot> {
    return this.post<MembershipSnapshot>(`/api/membership/cancel`, { userId });
  }
  async restoreSubscription(userId: UserId): Promise<MembershipSnapshot> {
    return this.post<MembershipSnapshot>(`/api/membership/restore`, { userId });
  }
  async fetchQuestionnaire(userId: UserId): Promise<QuestionnaireAnswers | null> {
    try {
      return await this.get<QuestionnaireAnswers | null>(`/api/profile/questionnaire?userId=${encodeURIComponent(userId)}`);
    } catch (e) {
      return null;
    }
  }
  async saveQuestionnaire(userId: UserId, answers: QuestionnaireAnswers): Promise<QuestionnaireAnswers> {
    return this.post<QuestionnaireAnswers>(`/api/profile/questionnaire`, { userId, answers });
  }
  async fetchUserSettings(userId: UserId): Promise<UserSettings | null> {
    try {
      return await this.get<UserSettings | null>(`/api/user/settings?userId=${encodeURIComponent(userId)}`);
    } catch (e) {
      return null;
    }
  }
  async saveUserSettings(userId: UserId, settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.post<UserSettings>(`/api/user/settings`, { userId, settings });
  }
  async recordLike(userId: UserId, targetUserId: string): Promise<LikeResult> {
    return this.post<LikeResult>(`/api/likes/like`, { userId, targetUserId });
  }
  async recordPass(userId: UserId, targetUserId: string): Promise<void> {
    await this.post<void>(`/api/likes/pass`, { userId, targetUserId });
  }
  async getLikes(userId: UserId): Promise<LikesState> {
    return this.get<LikesState>(`/api/likes?userId=${encodeURIComponent(userId)}`);
  }
}

export const BACKEND_URL = 'https://YOUR_BACKEND_URL';
const hasBackend = BACKEND_URL.startsWith('https://') && !BACKEND_URL.includes('YOUR_BACKEND_URL');
export const backend: BackendAPI = hasBackend ? new RestBackend(BACKEND_URL) : new MockBackend();

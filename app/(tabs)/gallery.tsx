import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  RefreshControl,
  ScrollView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, X, Filter, Star, MessageCircle, Verified, Sparkles, MapPin, Shield, Moon, Sun, Sparkle } from 'lucide-react-native';
import { mockProfiles, type MockProfile } from '@/mocks/profiles';
import { router } from 'expo-router';
import MatchCelebration from '@/components/MatchCelebration';
import { useMatches } from '@/contexts/MatchContext';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { scoreProfilesAgainstUser } from '@/lib/aiMatch';
import { useTranslate } from '@/contexts/TranslateContext';
import { useMembership } from '@/contexts/MembershipContext';
import UpgradeModal from '@/components/UpgradeModal';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { backend } from '@/lib/backend';
import { PROMO_GRAPHICS } from '@/constants/promoGraphics';

interface FilterOptions {
  verifiedOnly: boolean;
  minAge: number;
  maxAge: number;
  minCompatibility: number;
  countries?: string[];
  internationalOnly?: boolean;
}

interface HexProfileCardProps {
  profile: MockProfile;
  aiScore?: number;
  onLike: (profile: MockProfile) => void;
  onPass: (profile: MockProfile) => void;
  size: number;
  translatedBio?: string;
  translatedInterests?: string[];
  showTranslatedNote?: boolean;
  index: number;
  isProcessing?: boolean;
}

// Helper function to format distance
const formatDistance = (miles: number): string => {
  if (miles < 1) return '<1 mi';
  if (miles < 10) return `${Math.round(miles)} mi`;
  if (miles < 100) return `${Math.round(miles / 10) * 10} mi`;
  return `${Math.round(miles / 100) * 100}+ mi`;
};

// Helper function to get compatibility color
const getCompatibilityColor = (score: number): { bg: string; text: string; border: string } => {
  if (score >= 90) return { bg: 'rgba(239,68,68,0.95)', text: '#FFF', border: '#DC2626' };
  if (score >= 80) return { bg: 'rgba(245,158,11,0.9)', text: '#FFF', border: '#F59E0B' };
  if (score >= 70) return { bg: 'rgba(16,185,129,0.9)', text: '#FFF', border: '#10B981' };
  return { bg: 'rgba(0,0,0,0.8)', text: '#FFF', border: '#374151' };
};

interface HexGridRowProps {
  profiles: MockProfile[];
  aiScores: Record<string, number>;
  onLike: (profile: MockProfile) => void;
  onPass: (profile: MockProfile) => void;
  hexSize: number;
  tMap: Record<string, { bio?: string; interests?: string[]; bioTranslated: boolean; interestsTranslated: boolean }>;
  tEnabled: boolean;
  rowIndex: number;
  processingIds: Set<string>;
}

const HexProfileCard: React.FC<HexProfileCardProps> = ({
  profile,
  aiScore,
  onLike,
  onPass,
  size,
  translatedBio,
  translatedInterests,
  showTranslatedNote,
  index,
  isProcessing = false,
}) => {
  const displayBio = translatedBio || profile.bio;
  const displayInterests = translatedInterests || profile.interests;
  const bioSnippet = displayBio.length > 40 ? `${displayBio.substring(0, 40)}...` : displayBio;

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const likeButtonScale = useRef(new Animated.Value(1)).current;
  const passButtonScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  // Animate card interactions
  const animateCardPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const animateButtonPress = useCallback((buttonAnim: Animated.Value, callback: () => void) => {
    Animated.sequence([
      Animated.timing(buttonAnim, {
        toValue: 0.8,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1.1,
        duration: 150,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => callback());
  }, []);

  const showSparkles = useCallback(() => {
    Animated.sequence([
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [sparkleOpacity]);

  // Pulse animation for high compatibility
  useEffect(() => {
    if (aiScore && aiScore >= 85) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { iterations: -1 }
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [aiScore, pulseAnim]);

  const handleLike = useCallback(() => {
    if (isProcessing) return;
    showSparkles();
    animateButtonPress(likeButtonScale, () => onLike(profile));
  }, [isProcessing, showSparkles, animateButtonPress, likeButtonScale, onLike, profile]);

  const handlePass = useCallback(() => {
    if (isProcessing) return;
    animateButtonPress(passButtonScale, () => onPass(profile));
  }, [isProcessing, animateButtonPress, passButtonScale, onPass, profile]);

  const handleCardPress = useCallback(() => {
    animateCardPress();
    router.push(`/profile/${profile.id}` as any);
  }, [animateCardPress, profile.id]);

  // Create hexagon path
  const hexPath = `M${size * 0.5},${size * 0.067} L${size * 0.933},${size * 0.25} L${size * 0.933},${size * 0.75} L${size * 0.5},${size * 0.933} L${size * 0.067},${size * 0.75} L${size * 0.067},${size * 0.25} Z`;

  return (
    <Animated.View 
      style={[
        styles.hexContainer, 
        { 
          width: size, 
          height: size,
          marginBottom: index % 2 === 0 ? -size * 0.25 : 0,
          transform: [{ scale: scaleAnim }, { scale: pulseAnim }],
          opacity: isProcessing ? 0.6 : 1,
        }
      ]} 
      testID={`hex-card-${profile.id}`}
    >
      <TouchableOpacity
        style={[styles.hexagonCard, { width: size, height: size }]}
        onPress={handleCardPress}
        disabled={isProcessing}
        testID={`hex-profile-${profile.id}`}
        activeOpacity={0.9}
      >
        {/* Hexagon Background */}
        <View style={[styles.hexagonBackground, { width: size, height: size }]}>
          <Image 
            source={{ uri: profile.image }} 
            style={[styles.hexImage, { width: size * 0.9, height: size * 0.9 }]} 
          />
          
          {/* Processing Overlay */}
          {isProcessing && (
            <View style={[styles.processingOverlay, { width: size * 0.9, height: size * 0.9 }]}>
              <ActivityIndicator size="small" color="#EF4444" />
            </View>
          )}
        </View>
        
        {/* Overlay Content */}
        <View style={styles.hexOverlay}>
          {/* Top Row Badges */}
          <View style={styles.hexTopBadges}>
            {/* AI Recommendation Badge */}
            {(aiScore ?? profile.aiCompatibilityScore) && (aiScore ?? profile.aiCompatibilityScore)! >= 70 && (
              <View style={[styles.hexAiBadge, (aiScore ?? profile.aiCompatibilityScore)! >= 85 && styles.hexAiBadgeHot]} testID={`hex-ai-badge-${profile.id}`}>
                <Star size={8} color={(aiScore ?? profile.aiCompatibilityScore)! >= 85 ? "#DC2626" : "#065F46"} fill={(aiScore ?? profile.aiCompatibilityScore)! >= 85 ? "#DC2626" : "#065F46"} />
              </View>
            )}
            
            {/* Facial Verification Badge */}
            {(profile.isVerified || (profile.faceScoreFromVerification && profile.faceScoreFromVerification > 0.8)) && (
              <View style={styles.hexVerifiedBadge} testID={`hex-verified-${profile.id}`}>
                <Shield size={10} color="#2563EB" fill="#2563EB" />
              </View>
            )}
          </View>
          
          {/* Sparkles for high compatibility */}
          {(aiScore ?? profile.aiCompatibilityScore) && (aiScore ?? profile.aiCompatibilityScore)! >= 85 && (
            <Animated.View style={[styles.hexSparkles, { opacity: sparkleOpacity }]} testID={`hex-sparkles-${profile.id}`}>
              <Sparkles size={12} color="#F59E0B" />
            </Animated.View>
          )}
          
          {/* Bottom Row Labels */}
          <View style={styles.hexBottomLabels}>
            {/* Distance Label */}
            {profile.distanceFromUser != null && (
              <View style={styles.hexDistanceBadge} testID={`hex-distance-${profile.id}`}>
                <MapPin size={8} color="#FFF" />
                <Text style={styles.hexDistanceText}>{formatDistance(profile.distanceFromUser)}</Text>
              </View>
            )}
            
            {/* AI Compatibility Score */}
            {(aiScore ?? profile.aiCompatibilityScore) && (
              <View 
                style={[
                  styles.hexCompatibilityBadge, 
                  { backgroundColor: getCompatibilityColor(aiScore ?? profile.aiCompatibilityScore!).bg }
                ]} 
                testID={`hex-compatibility-${profile.id}`}
              >
                <Text style={[styles.hexCompatibilityText, { color: getCompatibilityColor(aiScore ?? profile.aiCompatibilityScore!).text }]}>
                  {Math.round(aiScore ?? profile.aiCompatibilityScore!)}%
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Bottom Info */}
        <View style={styles.hexInfo}>
          <Text style={styles.hexName} numberOfLines={1}>
            {profile.name}, {profile.age}
          </Text>
          <Text style={styles.hexBio} numberOfLines={1}>
            {bioSnippet}
          </Text>
          
          {showTranslatedNote && (
            <Text style={styles.hexTranslatedNote} testID={`hex-translated-${profile.id}`}>
              AI
            </Text>
          )}
        </View>
      </TouchableOpacity>
      
      {/* Action Buttons */}
      <View style={styles.hexActions}>
        <Animated.View style={{ transform: [{ scale: passButtonScale }] }}>
          <TouchableOpacity
            style={[styles.hexActionButton, styles.hexPassButton, isProcessing && styles.hexActionButtonDisabled]}
            onPress={handlePass}
            disabled={isProcessing}
            testID={`hex-pass-${profile.id}`}
            activeOpacity={0.7}
          >
            <X size={14} color={isProcessing ? "#9CA3AF" : "#EF4444"} />
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={{ transform: [{ scale: likeButtonScale }] }}>
          <TouchableOpacity
            style={[styles.hexActionButton, styles.hexLikeButton, isProcessing && styles.hexActionButtonDisabled]}
            onPress={handleLike}
            disabled={isProcessing}
            testID={`hex-like-${profile.id}`}
            activeOpacity={0.7}
          >
            <Heart size={14} color={isProcessing ? "#9CA3AF" : "#EF4444"} fill={isProcessing ? "transparent" : "#EF4444"} />
          </TouchableOpacity>
        </Animated.View>
      </View>
      
      {/* Sparkle Animation Overlay */}
      <Animated.View 
        style={[styles.sparkleOverlay, { opacity: sparkleOpacity }]} 
        pointerEvents="none"
        testID={`hex-sparkle-overlay-${profile.id}`}
      >
        <Text style={styles.sparkleEmoji}>✨</Text>
        <Text style={[styles.sparkleEmoji, { top: 20, left: 30 }]}>💖</Text>
        <Text style={[styles.sparkleEmoji, { top: 40, right: 20 }]}>✨</Text>
      </Animated.View>
    </Animated.View>
  );
};

const HexGridRow: React.FC<HexGridRowProps> = ({
  profiles,
  aiScores,
  onLike,
  onPass,
  hexSize,
  tMap,
  tEnabled,
  rowIndex,
  processingIds,
}) => {
  const isEvenRow = rowIndex % 2 === 0;
  const offset = isEvenRow ? 0 : hexSize * 0.433;
  
  return (
    <View style={[styles.hexRow, { marginLeft: offset }]}>
      {profiles.map((profile, index) => {
        const t = tMap[profile.id];
        const showTranslatedNote = tEnabled && ((t?.bioTranslated ?? false) || (t?.interestsTranslated ?? false));
        
        return (
          <HexProfileCard
            key={profile.id}
            profile={profile}
            aiScore={aiScores[profile.id]}
            onLike={onLike}
            onPass={onPass}
            size={hexSize}
            translatedBio={tEnabled && t?.bio ? t.bio : undefined}
            translatedInterests={tEnabled && t?.interests ? t.interests : undefined}
            showTranslatedNote={showTranslatedNote}
            index={index}
            isProcessing={processingIds.has(profile.id)}
          />
        );
      })}
    </View>
  );
};

export default function GalleryScreen() {
  const { width } = useWindowDimensions();
  const isTablet = Math.min(width, 768) >= 768;
  const hexesPerRow = isTablet ? 3 : 2;
  const hexSize = Math.min((width - 40) / hexesPerRow * 0.9, 140);
  
  const [filters, setFilters] = useState<FilterOptions>({
    verifiedOnly: false,
    minAge: 18,
    maxAge: 50,
    minCompatibility: 0,
    countries: [],
    internationalOnly: false,
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [tMap, setTMap] = useState<Record<string, { bio?: string; interests?: string[]; bioTranslated: boolean; interestsTranslated: boolean }>>({});
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: MockProfile | null }>({ visible: false, profile: null });
  const [celebration, setCelebration] = useState<{ visible: boolean; intensity: number; theme: 'confetti' | 'hearts' | 'fireworks'; message: string }>({ visible: false, intensity: 0.7, theme: 'hearts', message: "Boom! It's a Match!" });
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const { addMatch } = useMatches();
  const analytics = useAnalytics();
  const { user } = useAuth();
  const { enabled: tEnabled, translate, targetLang } = useTranslate();
  const { limits, canSwipe, swipeState, incSwipe } = useMembership();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  
  // AI compatibility scoring (fallback to mock data if AI service unavailable)
  const aiQuery = useQuery<{ scores: { id: string; score: number; reason: string }[] }, Error>({
    queryKey: ["aiMatch", user?.email ?? "guest"],
    queryFn: async () => {
      try {
        const data = await scoreProfilesAgainstUser(
          {
            id: user?.email ?? "guest",
            name: user?.name ?? "Guest",
            age: user?.age,
            bio: user?.bio,
            interests: user?.interests,
          },
          mockProfiles.map((p) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            bio: p.bio,
            interests: [...p.interests],
            location: p.location ? { lat: p.location.lat, lon: p.location.lon, city: p.location.city } : undefined,
            faceVector: p.faceVector,
            faceScoreFromVerification: p.faceScoreFromVerification,
          })),
        );
        return data;
      } catch (error) {
        // Fallback to mock compatibility scores
        console.log('[Gallery] AI scoring unavailable, using mock scores');
        return {
          scores: mockProfiles.map(p => ({
            id: p.id,
            score: p.aiCompatibilityScore ?? Math.floor(Math.random() * 40) + 60,
            reason: 'Mock compatibility score'
          }))
        };
      }
    },
    staleTime: 1000 * 60 * 10,
  });
  
  // Load persisted data
  useEffect(() => {
    (async () => {
      try {
        const [likedRaw, passedRaw] = await Promise.all([
          AsyncStorage.getItem('mf:likedIds'),
          AsyncStorage.getItem('mf:passedIds'),
        ]);
        
        if (likedRaw) {
          const arr = JSON.parse(likedRaw) as string[];
          setLikedIds(new Set(arr));
        }
        
        if (passedRaw) {
          const arr = JSON.parse(passedRaw) as string[];
          setPassedIds(new Set(arr));
        }
        
        const uid = user?.email ?? 'guest';
        const s = await backend.fetchUserSettings(uid);
        if (s && typeof s.matchAnimationsEnabled === 'boolean') {
          setAnimationsEnabled(s.matchAnimationsEnabled);
        }
      } catch (e) {
        console.log('[Gallery] load error', e);
      }
    })();
  }, [user?.email]);
  
  // Filter and sort profiles
  const filteredProfiles = useMemo(() => {
    const scores = aiQuery.data?.scores ?? [];
    const scoreMap: Record<string, number> = {};
    scores.forEach(s => scoreMap[s.id] = s.score);
    
    let filtered = mockProfiles.filter(profile => {
      if (likedIds.has(profile.id) || passedIds.has(profile.id)) return false;
      if (profile.age < filters.minAge || profile.age > filters.maxAge) return false;
      if (filters.verifiedOnly && (!profile.faceScoreFromVerification || profile.faceScoreFromVerification <= 0.8)) {
        return false;
      }
      const score = scoreMap[profile.id] ?? 0;
      if (score < filters.minCompatibility) return false;
      // International filter: treat any non-local country selection; using city heuristic for mock
      if (filters.internationalOnly) {
        const city = profile.location?.city ?? '';
        const isInternational = !/(San Francisco|Los Angeles|San Jose|Las Vegas|Oakland|Seattle|San Diego|New York)/i.test(city);
        if (!isInternational) return false;
      }
      if (filters.countries && filters.countries.length) {
        const city = (profile.location?.city ?? '').toLowerCase();
        const match = filters.countries.some(c => city.includes(c.toLowerCase()));
        if (!match) return false;
      }
      return true;
    });
    
    filtered.sort((a, b) => {
      const scoreA = scoreMap[a.id] ?? 0;
      const scoreB = scoreMap[b.id] ?? 0;
      return scoreB - scoreA;
    });
    
    return filtered;
  }, [mockProfiles, aiQuery.data, filters, likedIds, passedIds]);
  
  // Paginated profiles for infinite scroll with hexagon rows
  const displayedProfiles = useMemo(() => {
    const itemsPerPage = hexesPerRow * 4; // 4 rows at a time
    return filteredProfiles.slice(0, page * itemsPerPage);
  }, [filteredProfiles, page, hexesPerRow]);
  
  // Group profiles into rows for hexagon grid
  const hexRows = useMemo(() => {
    const rows: MockProfile[][] = [];
    for (let i = 0; i < displayedProfiles.length; i += hexesPerRow) {
      rows.push(displayedProfiles.slice(i, i + hexesPerRow));
    }
    return rows;
  }, [displayedProfiles, hexesPerRow]);
  
  // AI scores map for performance (with fallback to profile data)
  const aiScoresMap = useMemo(() => {
    const scores = aiQuery.data?.scores ?? [];
    const scoreMap: Record<string, number> = {};
    
    // Use AI scores if available, otherwise fallback to profile mock scores
    mockProfiles.forEach(profile => {
      const aiScore = scores.find(s => s.id === profile.id)?.score;
      scoreMap[profile.id] = aiScore ?? profile.aiCompatibilityScore ?? 0;
    });
    
    return scoreMap;
  }, [aiQuery.data]);
  
  // Translation preloading
  useEffect(() => {
    const preloadTranslations = async () => {
      if (!tEnabled) return;
      
      const targets = displayedProfiles.slice(0, 6); // Preload first 6 profiles
      
      for (const profile of targets) {
        const existing = tMap[profile.id];
        
        if (!existing?.bio) {
          try {
            const res = await translate(profile.bio);
            setTMap(prev => ({
              ...prev,
              [profile.id]: {
                bio: res.translated,
                interests: prev[profile.id]?.interests,
                bioTranslated: res.translated !== profile.bio,
                interestsTranslated: prev[profile.id]?.interestsTranslated ?? false,
              },
            }));
          } catch (e) {
            console.log('[Gallery] bio translation error', e);
          }
        }
        
        if (!existing?.interests) {
          try {
            const joined = profile.interests.join(' • ');
            const res = await translate(joined);
            const items = res.translated.split(' • ').map(s => s.trim()).filter(Boolean);
            setTMap(prev => ({
              ...prev,
              [profile.id]: {
                bio: prev[profile.id]?.bio,
                interests: items.length ? items : profile.interests,
                bioTranslated: prev[profile.id]?.bioTranslated ?? false,
                interestsTranslated: res.translated !== joined,
              },
            }));
          } catch (e) {
            console.log('[Gallery] interests translation error', e);
          }
        }
      }
    };
    
    preloadTranslations();
  }, [displayedProfiles, tEnabled, translate]);
  
  const persistLiked = async (setVal: Set<string>) => {
    try {
      await AsyncStorage.setItem('mf:likedIds', JSON.stringify(Array.from(setVal)));
    } catch (e) {
      console.log('[Gallery] liked persist error', e);
    }
  };
  
  const persistPassed = async (setVal: Set<string>) => {
    try {
      await AsyncStorage.setItem('mf:passedIds', JSON.stringify(Array.from(setVal)));
    } catch (e) {
      console.log('[Gallery] passed persist error', e);
    }
  };
  
  const openCelebration = (score: number, name: string) => {
    const intensity = Math.max(0.3, Math.min(1, score / 100));
    const theme: 'confetti' | 'hearts' | 'fireworks' = score >= 80 ? 'fireworks' : score >= 60 ? 'hearts' : 'confetti';
    const msg = `Boom! It's a Match${name ? ` with ${name}` : ''}!`;
    setCelebration({ visible: true, intensity, theme, message: msg });
    setTimeout(() => setCelebration(c => ({ ...c, visible: false })), 2000 + Math.floor(800 * intensity));
  };
  
  const handleLike = useCallback(async (profile: MockProfile) => {
    if (!canSwipe) {
      setShowUpgrade(true);
      return;
    }
    
    if (processingIds.has(profile.id)) {
      return;
    }
    
    // Add to processing set
    setProcessingIds(prev => new Set([...prev, profile.id]));
    
    try {
      await incSwipe();
      
      const uid = user?.email ?? 'guest';
      const res = await backend.recordLike(uid, profile.id);
      await analytics.track('match_like', { profileId: profile.id, country: profile.location?.city ?? 'unknown' });
      
      const newLiked = new Set(likedIds);
      newLiked.add(profile.id);
      setLikedIds(newLiked);
      await persistLiked(newLiked);
      
      if (res.mutual) {
        addMatch({
          id: profile.id,
          name: profile.name,
          age: profile.age,
          bio: profile.bio,
          image: profile.image,
          interests: [...profile.interests],
        });
        
        if (animationsEnabled) {
          const score = aiQuery.data?.scores?.find(s => s.id === profile.id)?.score ?? 65;
          // Use fireworks for high compatibility matches
          const theme = score >= 80 ? 'fireworks' : score >= 60 ? 'hearts' : 'confetti';
          setCelebration({ 
            visible: true, 
            intensity: Math.max(0.5, Math.min(1, score / 100)), 
            theme, 
            message: `🎉 Perfect Match with ${profile.name}!` 
          });
          setTimeout(() => setCelebration(c => ({ ...c, visible: false })), 3000);
        }
        
        setMatchModal({ visible: true, profile });
        await analytics.track('match_mutual', { profileId: profile.id, country: profile.location?.city ?? 'unknown' });
      }
    } catch (e) {
      console.log('[Gallery] like error', e);
    } finally {
      // Remove from processing set after a delay to show the animation
      setTimeout(() => {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(profile.id);
          return newSet;
        });
      }, 500);
    }
  }, [canSwipe, incSwipe, user?.email, likedIds, addMatch, animationsEnabled, aiQuery.data, processingIds]);
  
  const handlePass = useCallback(async (profile: MockProfile) => {
    if (!canSwipe) {
      setShowUpgrade(true);
      return;
    }
    
    if (processingIds.has(profile.id)) {
      return;
    }
    
    // Add to processing set
    setProcessingIds(prev => new Set([...prev, profile.id]));
    
    try {
      await incSwipe();
      
      const uid = user?.email ?? 'guest';
      await backend.recordPass(uid, profile.id);
      
      const newPassed = new Set(passedIds);
      newPassed.add(profile.id);
      setPassedIds(newPassed);
      await persistPassed(newPassed);
    } catch (e) {
      console.log('[Gallery] pass error', e);
    } finally {
      // Remove from processing set after a delay
      setTimeout(() => {
        setProcessingIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(profile.id);
          return newSet;
        });
      }, 300);
    }
  }, [canSwipe, incSwipe, user?.email, passedIds, processingIds]);
  
  const handleLoadMore = useCallback(() => {
    if (displayedProfiles.length < filteredProfiles.length) {
      setPage(prev => prev + 1);
    }
  }, [displayedProfiles.length, filteredProfiles.length]);
  
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    await aiQuery.refetch();
    setRefreshing(false);
  }, [aiQuery]);
  
  const renderHexRow = ({ item, index }: { item: MockProfile[]; index: number }) => {
    return (
      <HexGridRow
        profiles={item}
        aiScores={aiScoresMap}
        onLike={handleLike}
        onPass={handlePass}
        hexSize={hexSize}
        tMap={tMap}
        tEnabled={tEnabled}
        rowIndex={index}
        processingIds={processingIds}
      />
    );
  };
  
  const renderFooter = () => {
    if (displayedProfiles.length >= filteredProfiles.length) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>You've seen all available profiles!</Text>
          <Text style={styles.footerSubtext}>Check back later for more matches</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.footerContainer}>
        <ActivityIndicator size="small" color="#EF4444" />
        <Text style={styles.footerText}>Loading more profiles...</Text>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <Text style={[styles.headerTitle, darkMode && styles.headerTitleDark]}>Gallery</Text>
        <View style={styles.headerRight}>
          {limits.dailySwipes != null ? (
            <View style={styles.swipePill} testID="swipe-counter">
              <Text style={styles.swipePillText}>
                {Math.max((limits.dailySwipes ?? 0) - swipeState.count, 0)} left
              </Text>
            </View>
          ) : (
            <View style={[styles.swipePill, styles.unlimitedPill]} testID="swipe-counter-unlimited">
              <Text style={[styles.swipePillText, styles.unlimitedText]}>Unlimited</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(true)}
            testID="filter-button"
          >
            <Filter size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { marginLeft: 8 }]
            }
            onPress={() => setDarkMode(v => !v)}
            testID="toggle-dark"
          >
            {darkMode ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#111827" />}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* AI Loading Overlay */}
      {aiQuery.isLoading && (
        <View style={[styles.aiLoadingOverlay, darkMode && styles.aiLoadingOverlayDark]}>
          <ActivityIndicator color="#EF4444" />
          <Text style={[styles.aiLoadingText, darkMode && styles.aiLoadingTextDark]}>Personalizing your gallery...</Text>
        </View>
      )}
      
      {/* Gallery Header with Promo Graphic */}
      {displayedProfiles.length === 0 && !aiQuery.isLoading && (
        <View style={[styles.emptyGallery, darkMode && styles.emptyGalleryDark]}>
          <Image source={{ uri: PROMO_GRAPHICS.gallery.collage }} style={styles.promoImage} />
          <Text style={[styles.emptyTitle, darkMode && styles.emptyTitleDark]}>Discover Amazing People</Text>
          <Text style={[styles.emptySubtitle, darkMode && styles.emptySubtitleDark]}>Your perfect matches are waiting to be found</Text>
        </View>
      )}
      
      {/* Premium Promo Banner */}
      <View style={[styles.promoBanner, darkMode && styles.promoBannerDark]} testID="promo-banner">
        <Sparkle size={16} color={darkMode ? '#FDE68A' : '#F59E0B'} />
        <Text style={[styles.promoText, darkMode && styles.promoTextDark]}>First 90 days $5 — unlock AI Dream Dates!</Text>
        <TouchableOpacity style={[styles.promoCta, darkMode && styles.promoCtaDark]} onPress={() => setShowUpgrade(true)} testID="promo-cta">
          <Text style={styles.promoCtaText}>Upgrade</Text>
        </TouchableOpacity>
      </View>

      {/* Hexagon Profiles Grid */}
      <FlatList
        data={hexRows}
        renderItem={renderHexRow}
        keyExtractor={(item, index) => `row-${index}`}
        contentContainerStyle={styles.hexGridContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={4}
        windowSize={10}
        initialNumToRender={6}
        getItemLayout={(data, index) => ({
          length: hexSize * 0.75,
          offset: hexSize * 0.75 * index,
          index,
        })}
        testID="hex-profiles-grid"
      />
      
      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.filterModal}>
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)} testID="close-filters">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.filterContent}>
            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setFilters(prev => ({ ...prev, verifiedOnly: !prev.verifiedOnly }))}
              testID="verified-filter"
            >
              <View style={styles.filterOptionLeft}>
                <Verified size={20} color="#2563EB" />
                <Text style={styles.filterOptionText}>Verified profiles only</Text>
              </View>
              <View style={[styles.checkbox, filters.verifiedOnly && styles.checkboxActive]}>
                {filters.verifiedOnly && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Age Range</Text>
              <View style={styles.ageRange}>
                <Text style={styles.ageText}>{filters.minAge} - {filters.maxAge} years</Text>
              </View>
            </View>
            
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Minimum Compatibility</Text>
              <View style={styles.compatRange}>
                <Text style={styles.compatText}>{filters.minCompatibility}%+</Text>
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Countries</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['USA','Mexico','Colombia','China','Japan','Brazil'].map((c) => {
                  const active = (filters.countries ?? []).includes(c);
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setFilters(prev => {
                        const set = new Set(prev.countries ?? []);
                        if (set.has(c)) set.delete(c); else set.add(c);
                        return { ...prev, countries: Array.from(set) };
                      })}
                      style={[styles.countryPill, active && styles.countryPillActive]}
                      testID={`country-${c}`}
                    >
                      <Text style={[styles.countryPillText, active && styles.countryPillTextActive]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              style={styles.filterOption}
              onPress={() => setFilters(prev => ({ ...prev, internationalOnly: !prev.internationalOnly }))}
              testID="international-only"
            >
              <View style={styles.filterOptionLeft}>
                <Verified size={20} color="#16A34A" />
                <Text style={styles.filterOptionText}>International only</Text>
              </View>
              <View style={[styles.checkbox, filters.internationalOnly && styles.checkboxActive]}>
                {filters.internationalOnly && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Match Modal */}
      <Modal
        transparent
        visible={matchModal.visible}
        animationType="fade"
        onRequestClose={() => setMatchModal({ visible: false, profile: null })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.matchCard} testID="match-modal">
            <Text style={styles.matchTitle}>It's a match!</Text>
            {matchModal.profile && (
              <View style={styles.matchRow}>
                <Image source={{ uri: matchModal.profile.image }} style={styles.matchAvatar} />
                <Text style={styles.matchName}>{matchModal.profile.name}</Text>
              </View>
            )}
            <View style={styles.matchButtons}>
              <TouchableOpacity
                style={[styles.ctaButton, styles.keepSwipingButton]}
                onPress={() => setMatchModal({ visible: false, profile: null })}
                testID="keep-swiping"
              >
                <Text style={styles.ctaText}>Keep browsing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, styles.chatButton]}
                onPress={() => {
                  const id = matchModal.profile?.id;
                  setMatchModal({ visible: false, profile: null });
                  if (id) router.push(`/chat/${id}` as any);
                }}
                testID="open-chat"
              >
                <MessageCircle color="#fff" size={18} />
                <Text style={[styles.ctaText, { marginLeft: 8 }]}>Chat now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Match Celebration */}
      {animationsEnabled && (
        <MatchCelebration
          visible={celebration.visible}
          intensity={celebration.intensity}
          theme={celebration.theme}
          message={celebration.message}
          onDone={() => setCelebration(c => ({ ...c, visible: false }))}
        />
      )}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        testID="upgrade-modal"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  containerDark: {
    backgroundColor: '#0B1220',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDark: {
    backgroundColor: '#111827',
    borderBottomColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerTitleDark: {
    color: '#F9FAFB',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swipePill: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  swipePillText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  unlimitedPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  unlimitedText: {
    color: '#065F46',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  aiLoadingOverlay: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  aiLoadingOverlayDark: {
    backgroundColor: '#111827',
    borderBottomColor: '#1F2937',
  },
  aiLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  aiLoadingTextDark: {
    color: '#FCA5A5',
  },
  hexGridContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  hexRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: -20,
  },
  hexContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  hexagonCard: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexagonBackground: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ rotate: '30deg' }],
  },
  hexImage: {
    borderRadius: 18,
    resizeMode: 'cover',
  },
  hexOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  hexAiBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 4,
    borderRadius: 8,
  },
  hexAiBadgeHot: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  hexSparkles: {
    position: 'absolute',
    top: 8,
    right: 30,
    zIndex: 10,
  },
  hexTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  hexVerifiedBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 4,
    borderRadius: 8,
  },
  hexBottomLabels: {
    position: 'absolute',
    bottom: 40,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 3,
  },
  hexDistanceBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hexDistanceText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  hexCompatibilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hexCompatibilityBadgeHot: {
    backgroundColor: 'rgba(239,68,68,0.9)',
  },
  hexCompatibilityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  hexCompatibilityTextHot: {
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hexInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    alignItems: 'center',
    zIndex: 3,
  },
  hexName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hexBio: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hexTranslatedNote: {
    fontSize: 8,
    color: '#10B981',
    fontWeight: '700',
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hexActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  hexActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hexPassButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  hexLikeButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  hexActionButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  sparkleEmoji: {
    position: 'absolute',
    fontSize: 16,
    top: 10,
    left: 10,
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  filterModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  countryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  countryPillActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  countryPillText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  countryPillTextActive: {
    color: '#DC2626',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  filterSection: {
    marginTop: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  ageRange: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ageText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  compatRange: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compatText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  matchCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  matchTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    alignSelf: 'center',
    marginBottom: 20,
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  matchName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  matchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  keepSwipingButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  chatButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  emptyGallery: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyGalleryDark: {
    backgroundColor: '#111827',
  },
  promoImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  promoBanner: {
    marginTop: 8,
    marginHorizontal: 16,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  promoBannerDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  promoText: { color: '#9A3412', fontSize: 13, fontWeight: '800', flex: 1 },
  promoTextDark: { color: '#FDE68A' },
  promoCta: { backgroundColor: '#EF4444', borderColor: '#EF4444', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  promoCtaDark: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  promoCtaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTitleDark: { color: '#F9FAFB' },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtitleDark: { color: '#94A3B8' },
});
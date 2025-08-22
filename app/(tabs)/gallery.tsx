import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, X, Filter, Star, MessageCircle, Verified } from 'lucide-react-native';
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
}

interface ProfileCardProps {
  profile: MockProfile;
  aiScore?: number;
  onLike: (profile: MockProfile) => void;
  onPass: (profile: MockProfile) => void;
  isTablet: boolean;
  translatedBio?: string;
  translatedInterests?: string[];
  showTranslatedNote?: boolean;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  aiScore,
  onLike,
  onPass,
  isTablet,
  translatedBio,
  translatedInterests,
  showTranslatedNote,
}) => {
  const cardWidth = isTablet ? 280 : '48%';
  const cardHeight = isTablet ? 380 : 320;
  
  const displayBio = translatedBio || profile.bio;
  const displayInterests = translatedInterests || profile.interests;
  const bioSnippet = displayBio.length > 60 ? `${displayBio.substring(0, 60)}...` : displayBio;

  return (
    <View style={[styles.profileCard, { width: cardWidth, height: cardHeight }]} testID={`profile-card-${profile.id}`}>
      <TouchableOpacity
        style={styles.cardImageContainer}
        onPress={() => router.push(`/profile/${profile.id}` as any)}
        testID={`profile-image-${profile.id}`}
      >
        <Image source={{ uri: profile.image }} style={styles.cardImage} />
        
        {/* AI Recommendation Badge */}
        {aiScore && aiScore >= 70 && (
          <View style={styles.aiRecommendationBadge} testID={`ai-badge-${profile.id}`}>
            <Star size={12} color="#065F46" fill="#065F46" />
            <Text style={styles.aiRecommendationText}>AI Match</Text>
          </View>
        )}
        
        {/* Verified Badge */}
        {profile.faceScoreFromVerification && profile.faceScoreFromVerification > 0.8 && (
          <View style={styles.verifiedBadge} testID={`verified-${profile.id}`}>
            <Verified size={16} color="#2563EB" fill="#2563EB" />
          </View>
        )}
        
        {/* Compatibility Score */}
        {aiScore && (
          <View style={styles.compatibilityBadge} testID={`compatibility-${profile.id}`}>
            <Text style={styles.compatibilityText}>{Math.round(aiScore)}%</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {profile.name}, {profile.age}
        </Text>
        <Text style={styles.cardBio} numberOfLines={2}>
          {bioSnippet}
        </Text>
        
        {showTranslatedNote && (
          <Text style={styles.translatedNote} testID={`translated-${profile.id}`}>
            Translated by AI
          </Text>
        )}
        
        <View style={styles.interestsContainer}>
          {displayInterests.slice(0, 2).map((interest, index) => (
            <View key={index} style={styles.interestTag}>
              <Text style={styles.interestText} numberOfLines={1}>{interest}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={() => onPass(profile)}
            testID={`pass-${profile.id}`}
          >
            <X size={20} color="#EF4444" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={() => onLike(profile)}
            testID={`like-${profile.id}`}
          >
            <Heart size={20} color="#EF4444" fill="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function GalleryScreen() {
  const { width } = useWindowDimensions();
  const isTablet = Math.min(width, 768) >= 768;
  const numColumns = isTablet ? 3 : 2;
  
  const [filters, setFilters] = useState<FilterOptions>({
    verifiedOnly: false,
    minAge: 18,
    maxAge: 50,
    minCompatibility: 0,
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
  
  const { addMatch } = useMatches();
  const analytics = useAnalytics();
  const { user } = useAuth();
  const { enabled: tEnabled, translate, targetLang } = useTranslate();
  const { limits, canSwipe, swipeState, incSwipe } = useMembership();
  
  // AI compatibility scoring
  const aiQuery = useQuery<{ scores: { id: string; score: number; reason: string }[] }, Error>({
    queryKey: ["aiMatch", user?.email ?? "guest"],
    queryFn: async () => {
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
      // Skip already liked/passed profiles
      if (likedIds.has(profile.id) || passedIds.has(profile.id)) return false;
      
      // Age filter
      if (profile.age < filters.minAge || profile.age > filters.maxAge) return false;
      
      // Verified filter
      if (filters.verifiedOnly && (!profile.faceScoreFromVerification || profile.faceScoreFromVerification <= 0.8)) {
        return false;
      }
      
      // Compatibility filter
      const score = scoreMap[profile.id] ?? 0;
      if (score < filters.minCompatibility) return false;
      
      return true;
    });
    
    // Sort by AI compatibility score (highest first)
    filtered.sort((a, b) => {
      const scoreA = scoreMap[a.id] ?? 0;
      const scoreB = scoreMap[b.id] ?? 0;
      return scoreB - scoreA;
    });
    
    return filtered;
  }, [mockProfiles, aiQuery.data, filters, likedIds, passedIds]);
  
  // Paginated profiles for infinite scroll
  const displayedProfiles = useMemo(() => {
    const itemsPerPage = 10;
    return filteredProfiles.slice(0, page * itemsPerPage);
  }, [filteredProfiles, page]);
  
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
          openCelebration(score, profile.name);
        }
        
        setMatchModal({ visible: true, profile });
        await analytics.track('match_mutual', { profileId: profile.id, country: profile.location?.city ?? 'unknown' });
      }
    } catch (e) {
      console.log('[Gallery] like error', e);
    }
  }, [canSwipe, incSwipe, user?.email, likedIds, addMatch, animationsEnabled, aiQuery.data]);
  
  const handlePass = useCallback(async (profile: MockProfile) => {
    if (!canSwipe) {
      setShowUpgrade(true);
      return;
    }
    
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
    }
  }, [canSwipe, incSwipe, user?.email, passedIds]);
  
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
  
  const renderProfile = ({ item }: { item: MockProfile }) => {
    const aiScore = aiQuery.data?.scores?.find(s => s.id === item.id)?.score;
    const t = tMap[item.id];
    const showTranslatedNote = tEnabled && ((t?.bioTranslated ?? false) || (t?.interestsTranslated ?? false));
    
    return (
      <ProfileCard
        profile={item}
        aiScore={aiScore}
        onLike={handleLike}
        onPass={handlePass}
        isTablet={isTablet}
        translatedBio={tEnabled && t?.bio ? t.bio : undefined}
        translatedInterests={tEnabled && t?.interests ? t.interests : undefined}
        showTranslatedNote={showTranslatedNote}
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gallery</Text>
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
        </View>
      </View>
      
      {/* AI Loading Overlay */}
      {aiQuery.isLoading && (
        <View style={styles.aiLoadingOverlay}>
          <ActivityIndicator color="#EF4444" />
          <Text style={styles.aiLoadingText}>Personalizing your gallery...</Text>
        </View>
      )}
      
      {/* Gallery Header with Promo Graphic */}
      {displayedProfiles.length === 0 && !aiQuery.isLoading && (
        <View style={styles.emptyGallery}>
          <Image source={{ uri: PROMO_GRAPHICS.gallery.collage }} style={styles.promoImage} />
          <Text style={styles.emptyTitle}>Discover Amazing People</Text>
          <Text style={styles.emptySubtitle}>Your perfect matches are waiting to be found</Text>
        </View>
      )}
      
      {/* Profiles Grid */}
      <FlatList
        data={displayedProfiles}
        renderItem={renderProfile}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListFooterComponent={renderFooter}
        testID="profiles-grid"
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
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
  aiLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },
  gridContainer: {
    padding: 16,
    gap: 16,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    flex: 1,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  aiRecommendationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiRecommendationText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 4,
    borderRadius: 8,
  },
  compatibilityBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compatibilityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardBio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  translatedNote: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  interestTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: '48%',
  },
  interestText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  passButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  likeButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
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
  promoImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
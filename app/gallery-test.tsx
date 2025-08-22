import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, X, Star, Verified, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';

// Extended mock profiles for testing
const testProfiles = [
  {
    id: "test1",
    name: "Emma",
    age: 28,
    bio: "Yoga enthusiast, foodie, and sunset chaser. Looking for someone to explore the city with!",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800",
    interests: ["Yoga", "Travel", "Photography", "Cooking"],
    aiScore: 92,
    verified: true,
  },
  {
    id: "test2",
    name: "Michael",
    age: 32,
    bio: "Adventure seeker and coffee addict. Let's grab a drink and see where it goes!",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
    interests: ["Hiking", "Coffee", "Music", "Reading"],
    aiScore: 78,
    verified: false,
  },
  {
    id: "test3",
    name: "Sophia",
    age: 26,
    bio: "Artist by day, Netflix binger by night. Looking for my partner in crime!",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800",
    interests: ["Art", "Movies", "Wine", "Dancing"],
    aiScore: 85,
    verified: true,
  },
  {
    id: "test4",
    name: "James",
    age: 29,
    bio: "Fitness enthusiast and dog lover. Swipe right if you love adventures!",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800",
    interests: ["Fitness", "Dogs", "Traveling", "Sports"],
    aiScore: 71,
    verified: false,
  },
  {
    id: "test5",
    name: "Olivia",
    age: 31,
    bio: "Bookworm, wine enthusiast, and aspiring chef. Let's cook together!",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800",
    interests: ["Reading", "Cooking", "Wine Tasting", "Gardening"],
    aiScore: 88,
    verified: true,
  },
  {
    id: "test6",
    name: "Daniel",
    age: 27,
    bio: "Tech geek with a passion for music. Looking for someone who gets my nerdy jokes!",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800",
    interests: ["Technology", "Gaming", "Music", "Podcasts"],
    aiScore: 65,
    verified: false,
  },
  {
    id: "test7",
    name: "Isabella",
    age: 25,
    bio: "Beach lover and sunset photographer. Life&apos;s too short for boring dates!",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800",
    interests: ["Beach", "Photography", "Surfing", "Yoga"],
    aiScore: 79,
    verified: false,
  },
  {
    id: "test8",
    name: "Alexander",
    age: 30,
    bio: "World traveler and food explorer. 20 countries and counting!",
    image: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800",
    interests: ["Travel", "Food", "Languages", "History"],
    aiScore: 83,
    verified: true,
  },
  {
    id: "test9",
    name: "Ava",
    age: 24,
    bio: "Dance instructor and music lover. Let's dance through life together!",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800",
    interests: ["Dancing", "Music", "Teaching", "Fitness"],
    aiScore: 91,
    verified: true,
  },
  {
    id: "test10",
    name: "Ethan",
    age: 33,
    bio: "Chef and wine connoisseur. Let me cook you the perfect dinner!",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800",
    interests: ["Cooking", "Wine", "Travel", "Art"],
    aiScore: 76,
    verified: false,
  },
  {
    id: "test11",
    name: "Mia",
    age: 27,
    bio: "Photographer capturing life's beautiful moments. Adventure awaits!",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800",
    interests: ["Photography", "Travel", "Nature", "Art"],
    aiScore: 87,
    verified: true,
  },
  {
    id: "test12",
    name: "Noah",
    age: 29,
    bio: "Musician and coffee shop owner. Let's create beautiful melodies together!",
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=800",
    interests: ["Music", "Coffee", "Business", "Art"],
    aiScore: 74,
    verified: false,
  },
];

interface TestProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  interests: string[];
  aiScore: number;
  verified: boolean;
}

interface HexProfileCardProps {
  profile: TestProfile;
  size: number;
  onLike: (profile: TestProfile) => void;
  onPass: (profile: TestProfile) => void;
  index: number;
}

interface HexGridRowProps {
  profiles: TestProfile[];
  hexSize: number;
  onLike: (profile: TestProfile) => void;
  onPass: (profile: TestProfile) => void;
  rowIndex: number;
}

const HexProfileCard: React.FC<HexProfileCardProps> = ({
  profile,
  size,
  onLike,
  onPass,
  index,
}) => {
  const bioSnippet = profile.bio.length > 40 ? `${profile.bio.substring(0, 40)}...` : profile.bio;

  return (
    <View 
      style={[
        styles.hexContainer, 
        { 
          width: size, 
          height: size,
          marginBottom: index % 2 === 0 ? -size * 0.25 : 0,
        }
      ]} 
      testID={`hex-card-${profile.id}`}
    >
      <TouchableOpacity
        style={[styles.hexagonCard, { width: size, height: size }]}
        onPress={() => Alert.alert('Profile Tap', `Tapped on ${profile.name}&apos;s profile`)}
        testID={`hex-profile-${profile.id}`}
      >
        {/* Hexagon Background */}
        <View style={[styles.hexagonBackground, { width: size, height: size }]}>
          <Image 
            source={{ uri: profile.image }} 
            style={[styles.hexImage, { width: size * 0.9, height: size * 0.9 }]} 
          />
        </View>
        
        {/* Overlay Content */}
        <View style={styles.hexOverlay}>
          {/* AI Recommendation Badge */}
          {profile.aiScore >= 70 && (
            <View style={styles.hexAiBadge} testID={`hex-ai-badge-${profile.id}`}>
              <Star size={8} color="#065F46" fill="#065F46" />
            </View>
          )}
          
          {/* Verified Badge */}
          {profile.verified && (
            <View style={styles.hexVerifiedBadge} testID={`hex-verified-${profile.id}`}>
              <Verified size={10} color="#2563EB" fill="#2563EB" />
            </View>
          )}
          
          {/* Compatibility Score */}
          <View style={styles.hexCompatibilityBadge} testID={`hex-compatibility-${profile.id}`}>
            <Text style={styles.hexCompatibilityText}>{profile.aiScore}%</Text>
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
        </View>
      </TouchableOpacity>
      
      {/* Action Buttons */}
      <View style={styles.hexActions}>
        <TouchableOpacity
          style={[styles.hexActionButton, styles.hexPassButton]}
          onPress={() => onPass(profile)}
          testID={`hex-pass-${profile.id}`}
        >
          <X size={14} color="#EF4444" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.hexActionButton, styles.hexLikeButton]}
          onPress={() => onLike(profile)}
          testID={`hex-like-${profile.id}`}
        >
          <Heart size={14} color="#EF4444" fill="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const HexGridRow: React.FC<HexGridRowProps> = ({
  profiles,
  hexSize,
  onLike,
  onPass,
  rowIndex,
}) => {
  const isEvenRow = rowIndex % 2 === 0;
  const offset = isEvenRow ? 0 : hexSize * 0.433;
  
  return (
    <View style={[styles.hexRow, { marginLeft: offset }]}>
      {profiles.map((profile, index) => (
        <HexProfileCard
          key={profile.id}
          profile={profile}
          size={hexSize}
          onLike={onLike}
          onPass={onPass}
          index={index}
        />
      ))}
    </View>
  );
};

export default function GalleryTestScreen() {
  const { width } = useWindowDimensions();
  const isTablet = Math.min(width, 768) >= 768;
  const hexesPerRow = isTablet ? 3 : 2;
  const hexSize = Math.min((width - 40) / hexesPerRow * 0.9, 140);
  
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState<number>(1);
  
  // Filter out liked/passed profiles
  const availableProfiles = useMemo(() => {
    return testProfiles.filter(profile => 
      !likedIds.has(profile.id) && !passedIds.has(profile.id)
    );
  }, [likedIds, passedIds]);
  
  // Paginated profiles for lazy loading
  const displayedProfiles = useMemo(() => {
    const itemsPerPage = hexesPerRow * 4; // 4 rows at a time
    return availableProfiles.slice(0, page * itemsPerPage);
  }, [availableProfiles, page, hexesPerRow]);
  
  // Group profiles into rows for hexagon grid
  const hexRows = useMemo(() => {
    const rows: TestProfile[][] = [];
    for (let i = 0; i < displayedProfiles.length; i += hexesPerRow) {
      rows.push(displayedProfiles.slice(i, i + hexesPerRow));
    }
    return rows;
  }, [displayedProfiles, hexesPerRow]);
  
  const handleLike = (profile: TestProfile) => {
    const newLiked = new Set(likedIds);
    newLiked.add(profile.id);
    setLikedIds(newLiked);
    
    Alert.alert(
      '💖 Liked!', 
      `You liked ${profile.name}! AI Compatibility: ${profile.aiScore}%`,
      [{ text: 'OK' }]
    );
  };
  
  const handlePass = (profile: TestProfile) => {
    const newPassed = new Set(passedIds);
    newPassed.add(profile.id);
    setPassedIds(newPassed);
    
    Alert.alert(
      '👋 Passed', 
      `You passed on ${profile.name}`,
      [{ text: 'OK' }]
    );
  };
  
  const handleLoadMore = () => {
    if (displayedProfiles.length < availableProfiles.length) {
      setPage(prev => prev + 1);
    }
  };
  
  const resetTest = () => {
    setLikedIds(new Set());
    setPassedIds(new Set());
    setPage(1);
    Alert.alert('Reset Complete', 'All profiles are available again!');
  };
  
  const renderHexRow = ({ item, index }: { item: TestProfile[]; index: number }) => {
    return (
      <HexGridRow
        profiles={item}
        hexSize={hexSize}
        onLike={handleLike}
        onPass={handlePass}
        rowIndex={index}
      />
    );
  };
  
  const renderFooter = () => {
    if (displayedProfiles.length >= availableProfiles.length) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>You&apos;ve seen all test profiles!</Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetTest}>
            <Text style={styles.resetButtonText}>Reset Test</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.footerContainer}>
        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
          <Text style={styles.loadMoreText}>Load More Profiles</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hexagon Gallery Test</Text>
        <View style={styles.headerRight}>
          <View style={styles.statsPill}>
            <Text style={styles.statsText}>
              {displayedProfiles.length}/{availableProfiles.length}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Test Info */}
      <View style={styles.testInfo}>
        <Text style={styles.testInfoText}>
          Testing hexagon grid with {hexesPerRow} columns • Liked: {likedIds.size} • Passed: {passedIds.size}
        </Text>
      </View>
      
      {/* Hexagon Profiles Grid */}
      <FlatList
        data={hexRows}
        renderItem={renderHexRow}
        keyExtractor={(item, index) => `row-${index}`}
        contentContainerStyle={styles.hexGridContainer}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
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
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statsText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  testInfo: {
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  testInfoText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '600',
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
  hexVerifiedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 4,
    borderRadius: 8,
  },
  hexCompatibilityBadge: {
    position: 'absolute',
    bottom: 40,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hexCompatibilityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
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
  footerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadMoreButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
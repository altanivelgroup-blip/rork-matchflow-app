import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, Heart, Star, MessageCircle } from "lucide-react-native";
import { mockProfiles, type MockProfile } from "@/mocks/profiles";
import { router } from "expo-router";
import { useMatches } from "@/contexts/MatchContext";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { scoreProfilesAgainstUser } from "@/lib/aiMatch";
import { useTranslate } from "@/contexts/TranslateContext";
import { useMembership } from "@/contexts/MembershipContext";
import UpgradeModal from "@/components/UpgradeModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { backend } from "@/lib/backend";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.25;

export default function DiscoverScreen() {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const position = useRef(new Animated.ValueXY()).current;
  const { addMatch } = useMatches();
  const { user } = useAuth();
  const { enabled: tEnabled, translate, targetLang } = useTranslate();
  const { limits, canSwipe, swipeState, incSwipe } = useMembership();
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);
  const [upsellChecked, setUpsellChecked] = useState<boolean>(false);
  const [tMap, setTMap] = useState<Record<string, { bio?: string; interests?: string[]; bioTranslated: boolean; interestsTranslated: boolean }>>({});
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: MockProfile | null }>({ visible: false, profile: null });

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

  useEffect(() => {
    (async () => {
      try {
        const shown = await AsyncStorage.getItem('postsignup:upsell_shown_v1');
        if (!shown && limits.dailySwipes != null) {
          setShowUpgrade(true);
        }
        const likedRaw = await AsyncStorage.getItem('mf:likedIds');
        if (likedRaw) {
          const arr = JSON.parse(likedRaw) as string[];
          setLikedIds(new Set(arr));
        }
      } catch (e) {
        console.log('[Discover] upsell/liked load error', e);
      } finally {
        setUpsellChecked(true);
      }
    })();
  }, [limits.dailySwipes]);

  const orderedProfiles: MockProfile[] = useMemo(() => {
    const scores = aiQuery.data?.scores ?? [];
    const base: MockProfile[] = (mockProfiles as unknown as MockProfile[]).slice();
    if (!scores.length) return base;
    const byId: Record<string, number> = {};
    for (const s of scores) byId[s.id] = s.score;
    return base.sort((a, b) => (byId[b.id] ?? -1) - (byId[a.id] ?? -1));
  }, [aiQuery.data]);

  useEffect(() => {
    const preload = async () => {
      if (!tEnabled) return;
      const targets = [orderedProfiles[currentIndex], orderedProfiles[currentIndex + 1]].filter(Boolean) as MockProfile[];
      for (const p of targets) {
        if (!p) continue;
        const existing = tMap[p.id];
        if (!existing?.bio) {
          try {
            const res = await translate(p.bio);
            setTMap((prev) => ({
              ...prev,
              [p.id]: {
                bio: res.translated,
                interests: prev[p.id]?.interests,
                bioTranslated: res.translated !== p.bio,
                interestsTranslated: prev[p.id]?.interestsTranslated ?? false,
              },
            }));
          } catch (e) {}
        }
        if (!existing?.interests) {
          try {
            const joined = p.interests.join(' • ');
            const res = await translate(joined);
            const items = res.translated.split(' • ').map((s) => s.trim()).filter(Boolean);
            setTMap((prev) => ({
              ...prev,
              [p.id]: {
                bio: prev[p.id]?.bio,
                interests: items.length ? items : p.interests,
                bioTranslated: prev[p.id]?.bioTranslated ?? false,
                interestsTranslated: res.translated !== joined,
              },
            }));
          } catch (e) {}
        }
      }
    };
    preload();
  }, [currentIndex, orderedProfiles, tEnabled, translate]);

  const rotate = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ["-10deg", "0deg", "10deg"],
    extrapolate: "clamp",
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, screenWidth / 4],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-screenWidth / 4, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const nextCardScale = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: [1, 0.95, 1],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const onBlocked = useCallback((): void => {
    setShowUpgrade(true);
  }, []);

  const swipeLeft = () => {
    if (!canSwipe) { onBlocked(); return; }
    incSwipe().catch(() => {});
    const profile = orderedProfiles[currentIndex] as MockProfile | undefined;
    if (profile) {
      const uid = user?.email ?? 'guest';
      backend.recordPass(uid, profile.id).catch((e) => console.log('[Discover] pass error', e));
    }
    Animated.timing(position, {
      toValue: { x: -screenWidth * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());
  };


  const persistLiked = async (setVal: Set<string>) => {
    try {
      await AsyncStorage.setItem('mf:likedIds', JSON.stringify(Array.from(setVal)));
    } catch (e) {
      console.log('[Discover] liked persist error', e);
    }
  };

  const swipeRight = () => {
    if (!canSwipe) { onBlocked(); return; }
    incSwipe().catch(() => {});
    const deck = orderedProfiles;
    const profile = deck[currentIndex] as MockProfile | undefined;
    if (profile) {
      const uid = user?.email ?? 'guest';
      backend.recordLike(uid, profile.id)
        .then((res) => {
          const next = new Set(likedIds);
          next.add(profile.id);
          setLikedIds(next);
          persistLiked(next);
          if (res.mutual) {
            addMatch({
              id: profile.id,
              name: profile.name,
              age: profile.age,
              bio: profile.bio,
              image: profile.image,
              interests: [...profile.interests],
            });
            setMatchModal({ visible: true, profile });
          }
        })
        .catch((e) => {
          console.log('[Discover] like error', e);
        });
    }

    Animated.timing(position, {
      toValue: { x: screenWidth * 1.5, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => nextCard());
  };


  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const nextCard = () => {
    setCurrentIndex((prevIndex) => prevIndex + 1);
    position.setValue({ x: 0, y: 0 });
  };

  const handleLike = () => {
    swipeRight();
  };

  const handlePass = () => {
    swipeLeft();
  };

  const renderCard = (profile: MockProfile, index: number) => {
    const t = tMap[profile.id];
    const bioText = tEnabled && t?.bio ? t.bio : profile.bio;
    const interestsText = tEnabled && t?.interests ? t.interests : profile.interests;
    const showTranslatedNote = tEnabled && ((t?.bioTranslated ?? false) || (t?.interestsTranslated ?? false));
    if (index < currentIndex) {
      return null;
    }

    if (index === currentIndex) {
      return (
        <Animated.View
          key={profile.id}
          style={[
            styles.card,
            {
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { rotate },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Image source={{ uri: profile.image }} style={styles.cardImage} />
          {(() => {
            const val = aiQuery.data?.scores?.find((s) => s.id === profile.id)?.score;
            if (typeof val === "number" && val >= 70) {
              return (
                <View style={styles.aiRibbon} pointerEvents="none" testID={`ai-ribbon-${profile.id}`}>
                  <Star size={14} color="#111927" />
                  <Text style={styles.aiRibbonText}>AI Recommended</Text>
                </View>
              );
            }
            return null;
          })()}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.cardGradient}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.cardName}>
                {profile.name}, {profile.age}
              </Text>
              <Text style={styles.cardBio}>{bioText}</Text>
              {showTranslatedNote ? (
                <View style={styles.translatedNote} testID={`translated-note-${profile.id}`}>
                  <Text style={styles.translatedNoteText}>Translated by AI → {targetLang}</Text>
                </View>
              ) : null}
              <View style={styles.cardInterests}>
                {interestsText.slice(0, 3).map((interest, i) => (
                  <View key={i} style={styles.interestTag}>
                    <Text style={styles.interestText}>{interest}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.compatRow}>
                {(() => {
                  const val = aiQuery.data?.scores?.find((s) => s.id === profile.id)?.score;
                  if (typeof val === "number") {
                    return (
                      <View style={styles.compatBadge} testID={`compat-${profile.id}`}>
                        <Text style={styles.compatText}>{Math.round(val)}% compatible</Text>
                      </View>
                    );
                  }
                  return null;
                })()}
                {(() => {
                  const val = aiQuery.data?.scores?.find((s) => s.id === profile.id)?.score;
                  if (typeof val === "number" && val >= 70) {
                    return (
                      <View style={styles.aiBadge} testID={`ai-rec-${profile.id}`}>
                        <Star size={12} color="#111927" />
                        <Text style={styles.aiBadgeText}>AI Recommended</Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
            </View>
          </LinearGradient>

          <Animated.View
            style={[styles.likeLabel, { opacity: likeOpacity }]}
          >
            <Text style={styles.likeLabelText}>LIKE</Text>
          </Animated.View>

          <Animated.View
            style={[styles.nopeLabel, { opacity: nopeOpacity }]}
          >
            <Text style={styles.nopeLabelText}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        key={profile.id}
        style={[
          styles.card,
          {
            transform: [{ scale: nextCardScale }],
          },
        ]}
      >
        <Image source={{ uri: profile.image }} style={styles.cardImage} />
        {(() => {
          const val = aiQuery.data?.scores?.find((s) => s.id === profile.id)?.score;
          if (typeof val === "number" && val >= 70) {
            return (
              <View style={styles.aiRibbon} pointerEvents="none" testID={`ai-ribbon-${profile.id}`}>
                <Star size={14} color="#111927" />
                <Text style={styles.aiRibbonText}>AI Recommended</Text>
              </View>
            );
          }
          return null;
        })()}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.8)"]}
          style={styles.cardGradient}
        >
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>
              {profile.name}, {profile.age}
            </Text>
            <Text style={styles.cardBio}>{tEnabled && tMap[profile.id]?.bio ? tMap[profile.id]?.bio : profile.bio}</Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const deck = orderedProfiles;

  if (currentIndex >= deck.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No more profiles!</Text>
          <Text style={styles.emptySubtext}>Check back later for more matches</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MatchFlow</Text>
        {limits.dailySwipes != null ? (
          <View style={styles.swipePill} testID="swipe-counter">
            <Text style={styles.swipePillText}>{Math.max((limits.dailySwipes ?? 0) - swipeState.count, 0)} left today</Text>
          </View>
        ) : (
          <View style={[styles.swipePill, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]} testID="swipe-counter-unlimited">
            <Text style={[styles.swipePillText, { color: '#065F46' }]}>Unlimited swipes</Text>
          </View>
        )}
      </View>

      {(!canSwipe && limits.dailySwipes != null) ? (
        <View style={styles.upgradeNotice} testID="upgrade-notice">
          <Text style={styles.upgradeNoticeText}>Upgrade to see more matches!</Text>
        </View>
      ) : null}

      {(() => {
        const scores = aiQuery.data?.scores ?? [];
        const byId: Record<string, number> = {};
        for (const s of scores) byId[s.id] = s.score;
        const recs = limits.aiRecommendations ? orderedProfiles.filter((p) => (byId[p.id] ?? 0) >= 70).slice(0, 10) : [];
        if (!recs.length) return null;
        return (
          <View style={styles.recsBar} testID="ai-recommended-bar">
            <Text style={styles.recsTitle}>AI Recommended</Text>
            <View style={styles.recsList}>
              {recs.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.recItem}
                  onPress={() => {
                    const idx = orderedProfiles.findIndex((x) => x.id === p.id);
                    if (idx >= 0) setCurrentIndex(idx);
                  }}
                  testID={`ai-rec-chip-${p.id}`}
                >
                  <Image source={{ uri: p.image }} style={styles.recAvatar} />
                  <Text style={styles.recName}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })()}

      <View style={styles.cardsContainer}>
        {deck
          .slice(currentIndex, currentIndex + 2)
          .reverse()
          .map((profile, index) => renderCard(profile, currentIndex + (1 - index)))}
      </View>

      {aiQuery.isLoading ? (
        <View style={styles.aiOverlay} pointerEvents="none">
          <ActivityIndicator color="#fff" />
          <Text style={styles.aiOverlayText}>Personalizing deck…</Text>
        </View>
      ) : null}

      {aiQuery.isError ? (
        <View style={styles.aiError} testID="ai-error">
          <Text style={styles.aiErrorText}>AI match ordering unavailable. Using default order.</Text>
        </View>
      ) : null}

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.passButton]}
          onPress={handlePass}
          testID="pass-button"
        >
          <X color="#FF4458" size={30} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.superLikeButton]}
          onPress={handleLike}
          testID="super-like-button"
        >
          <Star color="#44D884" size={25} fill="#44D884" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.likeButton]}
          onPress={handleLike}
          testID="like-button"
        >
          <Heart color="#4FC3F7" size={30} fill="#4FC3F7" />
        </TouchableOpacity>
      </View>

      <Modal
        transparent
        visible={matchModal.visible}
        animationType="fade"
        onRequestClose={() => setMatchModal({ visible: false, profile: null })}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.matchCard} testID="match-modal">
            <Text style={styles.matchTitle}>It’s a match!</Text>
            {matchModal.profile ? (
              <View style={styles.matchRow}>
                <Image source={{ uri: matchModal.profile.image }} style={styles.matchAvatar} />
                <Text style={styles.matchName}>{matchModal.profile.name}</Text>
              </View>
            ) : null}
            <View style={styles.matchButtons}>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#111827', borderColor: '#1F2937' }]}
                onPress={() => setMatchModal({ visible: false, profile: null })}
                testID="keep-swiping"
              >
                <Text style={styles.ctaText}>Keep swiping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#FF6B6B', borderColor: '#FCA5A5' }]}
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

      <UpgradeModal
        visible={showUpgrade}
        onClose={async () => {
          setShowUpgrade(false);
          try { await AsyncStorage.setItem('postsignup:upsell_shown_v1', 'true'); } catch (e) { console.log('[Discover] upsell save error', e); }
        }}
        testID="upgrade-modal"
      />

      {limits.adsEnabled ? (
        <View style={styles.adBanner} testID="ad-banner">
          <Text style={styles.adText}>Ad — Upgrade to Plus to remove ads</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6B6B",
  },
  recsBar: {
    paddingTop: 10,
    paddingBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  recsTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 8,
  },
  recsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  recItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  recName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  cardsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    position: "absolute",
    width: screenWidth - 40,
    height: screenHeight * 0.65,
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    justifyContent: "flex-end",
    padding: 20,
  },
  cardInfo: {
    marginBottom: 10,
  },
  cardName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  cardBio: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 10,
  },
  cardInterests: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  interestTag: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  interestText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  likeLabel: {
    position: "absolute",
    top: 50,
    left: 40,
    borderWidth: 4,
    borderColor: "#4FC3F7",
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: "-30deg" }],
  },
  likeLabelText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4FC3F7",
  },
  nopeLabel: {
    position: "absolute",
    top: 50,
    right: 40,
    borderWidth: 4,
    borderColor: "#FF4458",
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: "30deg" }],
  },
  nopeLabelText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FF4458",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 20,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passButton: {
    borderWidth: 2,
    borderColor: "#FF4458",
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: "#44D884",
  },
  likeButton: {
    borderWidth: 2,
    borderColor: "#4FC3F7",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  compatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  compatBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  compatText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A7F3D0",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  aiBadgeText: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "800",
  },
  aiRibbon: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#A7F3D0",
    borderWidth: 1,
    borderColor: "#6EE7B7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiRibbonText: {
    color: "#065F46",
    fontSize: 12,
    fontWeight: "900",
  },
  aiOverlay: {
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  aiOverlayText: {
    color: "#fff",
    marginTop: 6,
    fontSize: 12,
  },
  aiError: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#fffbe6",
    borderWidth: 1,
    borderColor: "#ffe58f",
    borderRadius: 10,
  },
  aiErrorText: {
    color: "#8d6d00",
    fontSize: 12,
    textAlign: "center",
  },
  swipePill: {
    marginTop: 6,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  swipePillText: {
    color: '#BE123C',
    fontSize: 12,
    fontWeight: '800',
  },
  adBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  adText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  upgradeNotice: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  upgradeNoticeText: { color: '#B91C1C', fontSize: 12, fontWeight: '900' },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  matchCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  matchTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, alignSelf: 'center' },
  matchAvatar: { width: 56, height: 56, borderRadius: 28 },
  matchName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  matchButtons: { flexDirection: 'row', gap: 10, marginTop: 18, justifyContent: 'center' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  translatedNote: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(167,243,208,0.25)',
    borderWidth: 1,
    borderColor: '#6EE7B7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 4,
  },
  translatedNoteText: {
    color: '#D1FAE5',
    fontSize: 10,
    fontWeight: '700',
  },
});

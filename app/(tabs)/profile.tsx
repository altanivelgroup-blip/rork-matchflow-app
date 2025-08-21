import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Settings, Edit, LogOut, Heart, Star, Eye, Camera, Image as ImageIcon, Upload, Trash, Crown, Languages } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import { useMedia } from "@/contexts/MediaContext";
import PrivacyNote from "@/components/PrivacyNote";
import { useTranslate } from "@/contexts/TranslateContext";

const { width } = Dimensions.get('window');
const GAP = 8;
const NUM_COLUMNS = 3;
const TILE = Math.floor((width - 20 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS);

function TrianglePlayIcon() {
  return (
    <View style={{
      width: 0,
      height: 0,
      borderLeftWidth: 0,
      borderRightWidth: 12,
      borderBottomWidth: 8,
      borderTopWidth: 8,
      borderStyle: 'solid',
      borderLeftColor: 'transparent',
      borderRightColor: '#fff',
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      marginLeft: 4,
    }} />
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { media, pickFromLibrary, capturePhoto, captureVideo, removeItem, setPrimary } = useMedia();
  const { translate, targetLang } = useTranslate();
  const [bioTranslated, setBioTranslated] = useState<string | undefined>(undefined);
  const [bioDetected, setBioDetected] = useState<string>("");
  const [showTranslated, setShowTranslated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleTranslateBio = useCallback(async () => {
    const bio = user?.bio ?? '';
    if (!bio) return;
    if (bioTranslated) {
      setShowTranslated(v => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await translate(bio);
      setBioTranslated(res.translated);
      setBioDetected(String(res.detectedLang));
      setShowTranslated(true);
    } catch (e) {
      console.log('[Profile] translate bio error', e);
    } finally {
      setLoading(false);
    }
  }, [translate, user?.bio, bioTranslated]);

  const handleLogout = () => {
    logout();
    router.replace("/login" as any);
  };

  const stats = [
    { icon: Heart, label: "Likes", value: "127", color: "#FF6B6B" },
    { icon: Star, label: "Super Likes", value: "23", color: "#44D884" },
    { icon: Eye, label: "Views", value: "892", color: "#4FC3F7" },
  ];

  const sorted = useMemo(() => {
    return [...media].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.createdAt - a.createdAt);
  }, [media]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/(tabs)/settings" as any)} testID="open-settings">
          <Settings color="#333" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: sorted.find(m => m.isPrimary)?.localUri || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400" }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editButton} onPress={() => pickFromLibrary('image')} testID="edit-avatar">
              <Edit color="#fff" size={16} />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name || "User"}, 25</Text>
          <Text style={styles.userBio}>
            {showTranslated && bioTranslated && bioTranslated !== (user?.bio ?? '') ? bioTranslated : (user?.bio || "Adventure seeker, coffee lover, and dog enthusiast")}
          </Text>
          <View style={styles.translateRow}>
            <TouchableOpacity style={styles.translatePill} onPress={handleTranslateBio} testID="translate-bio">
              <Languages color={showTranslated ? '#10B981' : '#2563EB'} size={16} />
              <Text style={[styles.translateText, { color: showTranslated ? '#10B981' : '#2563EB' }]}>{loading ? 'Translating…' : showTranslated ? 'Show original' : 'AI Translate'}</Text>
            </TouchableOpacity>
            {bioTranslated && bioTranslated !== (user?.bio ?? '') ? (
              <Text style={styles.translateMeta}>{`AI (${bioDetected}) → ${targetLang}`}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statsContainer}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <View key={index} style={styles.statItem}>
                <Icon color={stat.color} size={24} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.mediaActions}>
          <TouchableOpacity style={[styles.actionButton, styles.actionPrimary]} onPress={() => capturePhoto()} testID="capture-photo">
            <Camera color="#fff" size={18} />
            <Text style={styles.actionText}>Capture Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => pickFromLibrary('image')} testID="pick-image">
            <ImageIcon color="#333" size={18} />
            <Text style={styles.actionTextDark}>Add Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => captureVideo()} testID="capture-video">
            <Camera color="#333" size={18} />
            <Text style={styles.actionTextDark}>Capture Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => pickFromLibrary('video')} testID="pick-video">
            <ImageIcon color="#333" size={18} />
            <Text style={styles.actionTextDark}>Add Video</Text>
          </TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 10, marginBottom: 12 }}>
          <PrivacyNote testID="privacy-note-profile" />
        </View>

        <Text style={styles.galleryHeader}>Gallery</Text>
        <FlatList
          data={sorted}
          numColumns={NUM_COLUMNS}
          keyExtractor={(item) => item.id}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: 10 }}
          contentContainerStyle={{ gap: GAP, paddingBottom: 30 }}
          renderItem={({ item }) => {
            return (
              <View style={{ width: TILE, height: TILE, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eee' }}>
                {item.type === 'image' ? (
                  <Image source={{ uri: item.localUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <TrianglePlayIcon />
                    </View>
                    <Text style={{ color: '#fff', marginTop: 6, fontSize: 12 }}>Video</Text>
                  </View>
                )}
                <View style={styles.tileOverlay}>
                  {item.isPrimary ? (
                    <View style={styles.primaryBadge}>
                      <Crown color="#fff" size={14} />
                    </View>
                  ) : null}
                  <View style={styles.tileActions}>
                    <TouchableOpacity style={styles.tileBtn} onPress={() => setPrimary(item.id)} testID={`make-primary-${item.id}`}>
                      <Upload color="#fff" size={14} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.tileBtn} onPress={() => removeItem(item.id)} testID={`remove-${item.id}`}>
                      <Trash color="#fff" size={14} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          testID="logout-button"
        >
          <LogOut color="#FF4458" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  settingsButton: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "#FF6B6B",
  },
  editButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#FF6B6B",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  userBio: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  translateRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  translatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  translateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  translateMeta: {
    fontSize: 10,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    paddingVertical: 20,
    marginBottom: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionPrimary: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionTextDark: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  galleryHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    gap: 10,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF4458",
    fontWeight: "600",
  },
  tileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
  },
  tileActions: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    flexDirection: 'row',
    gap: 6,
  },
  tileBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MessageCircle, Languages, Sparkles } from "lucide-react-native";
import { useMatches } from "@/contexts/MatchContext";
import { useTranslate } from "@/contexts/TranslateContext";
import { useMembership } from "@/contexts/MembershipContext";

export default function MatchesScreen() {
  const { matches } = useMatches();
  const { translate, targetLang, enabled } = useTranslate();
  const { tier } = useMembership();
  const [translatedMap, setTranslatedMap] = useState<Record<string, { text: string; detected: string }>>({});
  const [showTranslated, setShowTranslated] = useState<Record<string, boolean>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const handleChatPress = (matchId: string) => {
    router.push(`/chat/${matchId}` as any);
  };

  const handleDreamDatePress = (matchId: string) => {
    router.push(`/dream-date/${matchId}` as any);
  };

  const onTranslatePress = useCallback(async (id: string, bio: string) => {
    if (!bio) return;
    if (translatedMap[id]) {
      setShowTranslated((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
      return;
    }
    setLoadingMap((p) => ({ ...p, [id]: true }));
    try {
      const res = await translate(bio);
      setTranslatedMap((p) => ({ ...p, [id]: { text: res.translated, detected: String(res.detectedLang) } }));
      setShowTranslated((p) => ({ ...p, [id]: true }));
    } catch (e) {
      console.log('[Matches] translate error', e);
    } finally {
      setLoadingMap((p) => ({ ...p, [id]: false }));
    }
  }, [translate, translatedMap]);

  const listData = useMemo(() => matches, [matches]);

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      try {
        const toProcess = listData.filter((m) => {
          const existing = translatedMap[m.id]?.text;
          return !!m.bio && !existing;
        });
        for (const m of toProcess) {
          try {
            const res = await translate(m.bio);
            setTranslatedMap((p) => ({ ...p, [m.id]: { text: res.translated, detected: String(res.detectedLang) } }));
            setShowTranslated((p) => ({ ...p, [m.id]: true }));
          } catch (e) {
            console.log('[Matches] auto translate error', e);
          }
        }
      } catch (e) {
        console.log('[Matches] auto translate loop error', e);
      }
    };
    run();
  }, [enabled, listData, translate]);

  const renderMatch = ({ item }: { item: typeof matches[0] }) => {
    const t = translatedMap[item.id]?.text;
    const detected = translatedMap[item.id]?.detected ?? '';
    const showing = showTranslated[item.id] ?? false;
    const loading = loadingMap[item.id] ?? false;
    const bioToShow = showing && t && t !== item.bio ? t : item.bio;
    return (
      <View
        style={styles.matchCard}
        testID={`match-${item.id}`}
      >
        <Image source={{ uri: item.image }} style={styles.matchImage} />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{item.name}</Text>
          <Text style={styles.matchMessage} numberOfLines={2}>{bioToShow}</Text>
          <View style={styles.translateRow}>
            <TouchableOpacity
              onPress={() => onTranslatePress(item.id, item.bio)}
              style={styles.translatePill}
              testID={`translate-${item.id}`}
            >
              <Languages color={showing ? '#44D884' : '#2563EB'} size={14} />
              <Text style={[styles.translateText, { color: showing ? '#10B981' : '#2563EB' }]}>
                {loading ? 'Translating…' : showing ? 'Show original' : (enabled ? 'Show translation' : 'AI Translate')}
              </Text>
            </TouchableOpacity>
            {t && t !== item.bio ? (
              <Text style={styles.translateMeta} numberOfLines={1}>{`AI (${detected}) → ${targetLang}`}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actionButtons}>
          {tier === 'plus' && (
            <TouchableOpacity
              onPress={() => handleDreamDatePress(item.id)}
              style={styles.dreamDateButton}
              testID={`dream-date-${item.id}`}
            >
              <Sparkles color="#8B5CF6" size={16} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => handleChatPress(item.id)}>
            <MessageCircle color="#FF6B6B" size={20} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      {listData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle color="#DDD" size={60} />
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubtext}>
            Start swiping to find your perfect match!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  listContent: {
    padding: 20,
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  matchMessage: {
    fontSize: 14,
    color: "#666",
  },
  translateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  translatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dreamDateButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
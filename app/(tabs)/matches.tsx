import React from "react";
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
import { MessageCircle } from "lucide-react-native";
import { useMatches } from "@/contexts/MatchContext";

export default function MatchesScreen() {
  const { matches } = useMatches();

  const handleChatPress = (matchId: string) => {
    router.push(`/chat/${matchId}` as any);
  };

  const renderMatch = ({ item }: { item: typeof matches[0] }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => handleChatPress(item.id)}
      testID={`match-${item.id}`}
    >
      <Image source={{ uri: item.image }} style={styles.matchImage} />
      <View style={styles.matchInfo}>
        <Text style={styles.matchName}>{item.name}</Text>
        <Text style={styles.matchMessage}>Start a conversation!</Text>
      </View>
      <MessageCircle color="#FF6B6B" size={20} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Matches</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageCircle color="#DDD" size={60} />
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubtext}>
            Start swiping to find your perfect match!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
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
    color: "#999",
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
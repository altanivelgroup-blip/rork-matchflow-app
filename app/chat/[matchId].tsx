import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Image as ExpoImage } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Image as RNImage, Send, ImageIcon, Video as VideoIcon, Languages, Shield } from "lucide-react-native";
import { useMatches } from "@/contexts/MatchContext";
import { useChat } from "@/contexts/ChatContext";
import { useTranslate } from "@/contexts/TranslateContext";

interface MessageUI {
  id: string;
  type: 'text' | 'image' | 'video';
  text?: string;
  mediaUri?: string;
  sender: 'user' | 'match';
  createdAt: number;
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams();
  const { matches } = useMatches();
  const { getMessages, sendText, sendImage, sendVideo, subscribe } = useChat();
  const { enabled: tEnabled, setEnabled: setTEnabled, translate, targetLang } = useTranslate();
  const [inputText, setInputText] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const [translatedMap, setTranslatedMap] = useState<Record<string, { translated: string; detected: string }>>({});
  const [showTranslated, setShowTranslated] = useState<boolean>(true);

  const match = matches.find(m => String(m.id) === String(matchId));

  const messages: MessageUI[] = useMemo(() => {
    if (!matchId) return [] as MessageUI[];
    return getMessages(String(matchId)) as unknown as MessageUI[];
  }, [getMessages, matchId]);

  useEffect(() => {
    if (!matchId) return;
    const unsub = subscribe(String(matchId), () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    });
    return unsub;
  }, [matchId, subscribe]);

  useEffect(() => {
    const run = async () => {
      if (!tEnabled) return;
      const texts = messages.filter(m => m.type === 'text' && typeof m.text === 'string');
      for (const m of texts) {
        if (!m.text) continue;
        if (translatedMap[m.id]) continue;
        try {
          const res = await translate(m.text);
          setTranslatedMap((prev) => ({ ...prev, [m.id]: { translated: res.translated, detected: res.detectedLang } }));
        } catch (e) {
          console.log('[Chat] translate error', e);
        }
      }
    };
    run();
  }, [messages, tEnabled, translate]);

  const handleSend = async () => {
    if (!matchId) return;
    await sendText(String(matchId), inputText);
    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleAttachImage = async () => {
    if (!matchId) return;
    await sendImage(String(matchId));
  };

  const handleAttachVideo = async () => {
    if (!matchId) return;
    await sendVideo(String(matchId));
  };

  const renderMessage = ({ item }: { item: MessageUI }) => {
    if (item.type === 'image' && item.mediaUri) {
      return (
        <View style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.matchMessage]}>
          <ExpoImage
            source={{ uri: item.mediaUri }}
            style={styles.imageAttachment}
            contentFit="cover"
          />
        </View>
      );
    }
    if (item.type === 'video' && item.mediaUri) {
      return (
        <TouchableOpacity
          onPress={async () => {
            try {
              await WebBrowser.openBrowserAsync(item.mediaUri ?? '');
            } catch (e) {
              console.log('[Chat] open video error', e);
            }
          }}
          style={[styles.messageContainer, item.sender === 'user' ? styles.userMessage : styles.matchMessage]}
        >
          <View style={styles.videoPlaceholder}>
            <VideoIcon color="#fff" size={28} />
            <Text style={styles.videoText}>Open video</Text>
          </View>
        </TouchableOpacity>
      );
    }
    const translated = translatedMap[item.id]?.translated;
    const detected = translatedMap[item.id]?.detected ?? '';
    const shouldShowTranslation = tEnabled && translated && translated !== item.text;
    const displayText = shouldShowTranslation && showTranslated ? translated : (item.text ?? '');
    return (
      <View
        style={[
          styles.messageContainer,
          item.sender === 'user' ? styles.userMessage : styles.matchMessage,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            item.sender === 'user' ? styles.userMessageText : styles.matchMessageText,
          ]}
          numberOfLines={0}
        >
          {displayText}
        </Text>
        {shouldShowTranslation ? (
          <View style={styles.translationMeta}>
            <Text style={styles.translationMetaText}>
              {showTranslated ? `Translated by AI (${String(detected)}) → ${targetLang}` : 'Showing original'}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={styles.inputContainer}>
        <View style={styles.privacyRow}>
          <Shield color="#2563EB" size={14} />
          <Text style={styles.privacyText}>We use AI to verify photos for your safety.</Text>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          testID="message-input"
        />
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachImage}
          testID="attach-image"
        >
          <ImageIcon color="#FF6B6B" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachVideo}
          testID="attach-video"
        >
          <VideoIcon color="#FF6B6B" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setTEnabled(!tEnabled)}
          onLongPress={() => {
            try {
              router.push('/(tabs)/settings' as any);
            } catch (e) {
              console.log('[Chat] open settings error', e);
            }
          }}
          testID="toggle-translate"
        >
          <Languages color={tEnabled ? "#44D884" : "#999"} size={20} />
        </TouchableOpacity>
        {tEnabled ? (
          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => setShowTranslated((v) => !v)}
            testID="toggle-translate-mode"
          >
            <Text style={styles.toggleModeText}>{showTranslated ? 'Show original' : 'Show translated'}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          testID="send-button"
        >
          <Send color={inputText.trim() ? "#FF6B6B" : "#CCC"} size={20} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: "75%",
    marginBottom: 15,
    padding: 12,
    borderRadius: 18,
    overflow: 'hidden',
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#FF6B6B",
  },
  matchMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  translationMeta: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  translationMetaText: {
    fontSize: 10,
    color: '#EEE',
  },
  userMessageText: {
    color: "#fff",
  },
  matchMessageText: {
    color: "#333",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    color: "#333",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FF6B6B",
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  toggleMode: {
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  toggleModeText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  imageAttachment: {
    width: 220,
    height: 160,
    borderRadius: 12,
  },
  videoPlaceholder: {
    width: 220,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoText: {
    color: '#fff',
    fontSize: 12,
  },
  sendButtonDisabled: {
    borderColor: "#CCC",
  },
  privacyRow: {
    position: 'absolute',
    left: 20,
    right: 120,
    bottom: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  privacyText: {
    fontSize: 10,
    color: '#1F2937',
  },
});

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Image as ExpoImage } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { Send, ImageIcon, Video as VideoIcon, Languages, Shield, ChevronDown, RefreshCw, Flag, Ban } from "lucide-react-native";
import { useMatches } from "@/contexts/MatchContext";
import { useChat } from "@/contexts/ChatContext";
import { useTranslate } from "@/contexts/TranslateContext";
import { SupportedLocale, supportedLocales } from "@/lib/i18n";
import { showToast } from "@/lib/toast";
import { useDreamDate } from "@/contexts/DreamDateContext";

interface MessageUI {
  id: string;
  type: 'text' | 'image' | 'video';
  text?: string;
  mediaUri?: string;
  sender: 'user' | 'match';
  createdAt: number;
  status?: 'sent' | 'delivered' | 'read';
}

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams();
  const { matches, getPreferredLang, setPreferredLang } = useMatches();
  const { getMessages, sendText, sendImage, sendVideo, subscribe, isTyping, setTyping, reportUser, blockUser, usingFirebase } = useChat();
  const { enabled: tEnabled, setEnabled: setTEnabled, translate, targetLang } = useTranslate();
  const { sessions } = useDreamDate();
  const [inputText, setInputText] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const [translatedMap, setTranslatedMap] = useState<Record<string, { translated: string; detected: string }>>({});
  const [failedMap, setFailedMap] = useState<Record<string, boolean>>({});
  const [showTranslated, setShowTranslated] = useState<boolean>(true);
  const [showLangPicker, setShowLangPicker] = useState<boolean>(false);

  const match = matches.find(m => String(m.id) === String(matchId));

  const messages: MessageUI[] = useMemo(() => {
    if (!matchId) return [] as MessageUI[];
    return getMessages(String(matchId)) as unknown as MessageUI[];
  }, [getMessages, matchId]);

  const lastUserMessageId = useMemo(() => {
    const list = messages.filter(m => m.sender === 'user');
    return list.length ? list[list.length - 1]?.id : undefined;
  }, [messages]);

  const showTyping = useMemo(() => {
    if (!matchId) return false;
    return isTyping(String(matchId));
  }, [isTyping, matchId]);

  const recipientLang: SupportedLocale | undefined = useMemo(() => {
    if (!matchId) return undefined;
    return getPreferredLang(String(matchId));
  }, [getPreferredLang, matchId]);

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
          setTranslatedMap((prev) => ({ ...prev, [m.id]: { translated: res.translated, detected: String(res.detectedLang) } }));
          setFailedMap((prev) => ({ ...prev, [m.id]: false }));
        } catch (e) {
          setFailedMap((prev) => ({ ...prev, [m.id]: true }));
        }
      }
    };
    run();
  }, [messages, tEnabled, translate, translatedMap]);

  const handleSend = async () => {
    if (!matchId) return;
    await sendText(String(matchId), inputText, recipientLang);
    setInputText("");
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const handleSetLang = useCallback(async (lang: SupportedLocale) => {
    if (!matchId) return;
    await setPreferredLang(String(matchId), lang);
    setShowLangPicker(false);
  }, [matchId, setPreferredLang]);

  const handleAttachImage = async () => {
    if (!matchId) return;
    await sendImage(String(matchId));
  };

  const handleAttachVideo = async () => {
    if (!matchId) return;
    await sendVideo(String(matchId));
  };

  const handleReport = useCallback(() => {
    if (!matchId) return;
    reportUser(String(matchId), 'Inappropriate content');
  }, [matchId, reportUser]);

  const handleBlock = useCallback(() => {
    if (!matchId) return;
    blockUser(String(matchId));
  }, [matchId, blockUser]);

  const onChangeInput = (val: string) => {
    setInputText(val);
    if (!matchId) return;
    setTyping(String(matchId), val.trim().length > 0);
  };

  const dreamInsights = useMemo(() => {
    if (!matchId) return null as null | { score?: number; tips: string[] };
    const related = sessions.filter(s => s.matchId === String(matchId) && s.status === 'completed');
    if (!related.length) return null;
    const latest = related[related.length - 1];
    return { score: latest.chemistryScore, tips: latest.tips ?? [] };
  }, [sessions, matchId]);

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
            } catch (e) {}
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
    const shouldShowTranslation = tEnabled && !!translated && translated !== item.text;
    const displayText = shouldShowTranslation && showTranslated ? translated : (item.text ?? '');

    const onRetry = async () => {
      try {
        if (!item.text) return;
        const res = await translate(item.text);
        setTranslatedMap((prev) => ({ ...prev, [item.id]: { translated: res.translated, detected: String(res.detectedLang) } }));
        setFailedMap((prev) => ({ ...prev, [item.id]: false }));
      } catch (e) {
        showToast('Translation failed—retry?');
      }
    };

    const isLastUser = item.id === lastUserMessageId && item.sender === 'user';

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
        >
          {displayText}
        </Text>
        {shouldShowTranslation ? (
          <View style={styles.translationMeta}>
            <Text style={styles.translationMetaText}>
              {showTranslated ? `Translated by AI (${String(detected)}) → ${targetLang}` : 'Showing original'}
            </Text>
          </View>
        ) : tEnabled && item.type === 'text' && !translated && failedMap[item.id] ? (
          <TouchableOpacity style={[styles.translationMeta, { flexDirection: 'row', alignItems: 'center', gap: 6 }]} onPress={onRetry} testID={`retry-${item.id}`}>
            <RefreshCw color="#EEE" size={12} />
            <Text style={styles.translationMetaText}>Retry translation</Text>
          </TouchableOpacity>
        ) : null}
        {isLastUser && (
          <Text style={styles.readReceipt} testID="read-receipt">
            {item.status === 'read' ? 'Read' : item.status === 'delivered' ? 'Delivered' : usingFirebase ? 'Sent' : 'Sent'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: match?.name ? `Chat · ${match.name}` : 'Chat',
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleReport} testID="report-btn" style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                <Flag color="#EF4444" size={18} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBlock} testID="block-btn" style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                <Ban color="#111827" size={18} />
              </TouchableOpacity>
            </View>
          )
        }}
      />

      {dreamInsights ? (
        <View style={styles.insightsBanner} testID="insights-banner">
          <Text style={styles.insightsTitle}>Chemistry {typeof dreamInsights.score === 'number' ? `${dreamInsights.score}%` : ''}</Text>
          <Text style={styles.insightsTips} numberOfLines={2}>{dreamInsights.tips.slice(0,2).join(' • ')}</Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={showTyping ? (
          <View style={styles.typingRow} testID="typing-indicator">
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <Text style={styles.typingText}>Typing…</Text>
          </View>
        ) : null}
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
          onChangeText={onChangeInput}
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
        <View style={styles.langContainer}>
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setShowLangPicker((v) => !v)}
            testID="open-lang-picker"
          >
            <Languages color="#2563EB" size={18} />
            <Text style={styles.langText}>{recipientLang ? supportedLocales[recipientLang] : 'Lang'}</Text>
            <ChevronDown color="#2563EB" size={14} />
          </TouchableOpacity>
          {showLangPicker ? (
            <View style={styles.langPicker} testID="lang-picker">
              {Object.entries(supportedLocales).map(([code, label]) => (
                <TouchableOpacity
                  key={code}
                  style={[styles.langItem, recipientLang === code ? styles.langItemActive : undefined]}
                  onPress={() => handleSetLang(code as SupportedLocale)}
                  testID={`lang-${code}`}
                >
                  <Text style={[styles.langItemText, recipientLang === code ? styles.langItemTextActive : undefined]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setTEnabled(!tEnabled)}
          onLongPress={() => {
            try {
              router.push('/(tabs)/settings' as any);
            } catch (e) {}
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
  readReceipt: {
    marginTop: 4,
    fontSize: 10,
    color: '#222',
    opacity: 0.6,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
  },
  typingText: {
    fontSize: 12,
    color: '#666',
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
  langContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  langText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  langPicker: {
    position: 'absolute',
    bottom: 46,
    right: 0,
    width: 180,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  langItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  langItemActive: {
    backgroundColor: '#F3F4F6',
  },
  langItemText: {
    fontSize: 14,
    color: '#111827',
  },
  langItemTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  insightsBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  insightsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 4,
  },
  insightsTips: {
    fontSize: 12,
    color: '#065F46',
  },
});

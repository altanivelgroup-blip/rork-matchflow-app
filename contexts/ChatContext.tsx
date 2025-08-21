import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { verifySingleImage } from '@/lib/faceVerification';

export type ChatMessageType = 'text' | 'image' | 'video';

export interface ChatMessage {
  id: string;
  matchId: string;
  type: ChatMessageType;
  text?: string;
  mediaUri?: string;
  sender: 'user' | 'match';
  createdAt: number;
  translatedText?: string;
  detectedLang?: string;
}

interface ChatContextType {
  getMessages: (matchId: string) => ChatMessage[];
  sendText: (matchId: string, text: string) => Promise<void>;
  sendImage: (matchId: string) => Promise<void>;
  sendVideo: (matchId: string) => Promise<void>;
  subscribe: (matchId: string, cb: () => void) => () => void;
}

const STORAGE_KEY = 'chat_messages_v1';

class Emitter {
  private listeners: Record<string, Set<() => void>> = {};
  on(key: string, cb: () => void) {
    if (!this.listeners[key]) this.listeners[key] = new Set();
    this.listeners[key].add(cb);
    return () => this.off(key, cb);
  }
  off(key: string, cb: () => void) {
    this.listeners[key]?.delete(cb);
  }
  emit(key: string) {
    this.listeners[key]?.forEach((cb) => cb());
  }
}

export const [ChatProvider, useChat] = createContextHook<ChatContextType>(() => {
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessage[]>>({});
  const emitterRef = useRef(new Emitter());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
        setMessagesMap(parsed);
      } catch (e) {
        console.log('[Chat] load error', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messagesMap));
      } catch (e) {
        console.log('[Chat] persist error', e);
      }
    })();
  }, [messagesMap]);

  const getMessages = useCallback((matchId: string) => {
    return (messagesMap[matchId] ?? []).sort((a, b) => a.createdAt - b.createdAt);
  }, [messagesMap]);

  const appendMessage = useCallback((matchId: string, msg: ChatMessage) => {
    setMessagesMap((prev) => {
      const next = { ...prev };
      const list = next[matchId] ? [...next[matchId]] : [];
      list.push(msg);
      next[matchId] = list;
      return next;
    });
    emitterRef.current.emit(matchId);
  }, []);

  const sendText = useCallback(async (matchId: string, text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      id: String(Date.now()),
      matchId,
      type: 'text',
      text: text.trim(),
      sender: 'user',
      createdAt: Date.now(),
    };
    appendMessage(matchId, msg);
    setTimeout(() => {
      const echo: ChatMessage = {
        id: String(Date.now() + 1),
        matchId,
        type: 'text',
        text: 'Got it! 😊',
        sender: 'match',
        createdAt: Date.now() + 1,
      };
      appendMessage(matchId, echo);
    }, 600);
  }, [appendMessage]);

  const requestPerms = async () => {
    const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cam = await ImagePicker.requestCameraPermissionsAsync();
    return lib.granted && cam.granted;
  };

  const sendImage = useCallback(async (matchId: string) => {
    try {
      const ok = await requestPerms();
      if (!ok) {
        Alert.alert('Permissions required', 'Please grant camera and library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4,3],
        quality: 1,
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri ?? '';
      if (!uri) return;
      const v = await verifySingleImage(uri);
      if (!v.ok) {
        Alert.alert('Verification failed', v.reason ?? "Photo doesn't seem real—try again!");
        return;
      }
      const msg: ChatMessage = {
        id: String(Date.now()),
        matchId,
        type: 'image',
        mediaUri: uri,
        sender: 'user',
        createdAt: Date.now(),
      };
      appendMessage(matchId, msg);
    } catch (e) {
      console.log('[Chat] sendImage error', e);
      Alert.alert('Error', 'Unable to attach image.');
    }
  }, [appendMessage]);

  const sendVideo = useCallback(async (matchId: string) => {
    try {
      const ok = await requestPerms();
      if (!ok) {
        Alert.alert('Permissions required', 'Please grant camera and library access.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 30,
        quality: 1,
      });
      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri ?? '';
      if (!uri) return;
      const msg: ChatMessage = {
        id: String(Date.now()),
        matchId,
        type: 'video',
        mediaUri: uri,
        sender: 'user',
        createdAt: Date.now(),
      };
      appendMessage(matchId, msg);
    } catch (e) {
      console.log('[Chat] sendVideo error', e);
      Alert.alert('Error', 'Unable to attach video.');
    }
  }, [appendMessage]);

  const subscribe = useCallback((matchId: string, cb: () => void) => {
    return emitterRef.current.on(matchId, cb);
  }, []);

  const value: ChatContextType = useMemo(() => ({
    getMessages,
    sendText,
    sendImage,
    sendVideo,
    subscribe,
  }), [getMessages, sendText, sendImage, sendVideo, subscribe]);

  return value;
});

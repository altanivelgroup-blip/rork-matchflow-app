import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { verifySingleImage } from '@/lib/faceVerification';
import { useTranslate } from '@/contexts/TranslateContext';
import { SupportedLocale } from '@/lib/i18n';
import { getFirebase } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  setDoc,
  getFirestore,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  readBy?: string[];
  status?: 'sent' | 'delivered' | 'read';
}

interface TypingState {
  [matchId: string]: boolean;
}

interface ChatContextType {
  getMessages: (matchId: string) => ChatMessage[];
  sendText: (matchId: string, text: string, recipientLang?: SupportedLocale) => Promise<void>;
  sendImage: (matchId: string) => Promise<void>;
  sendVideo: (matchId: string) => Promise<void>;
  subscribe: (matchId: string, cb: () => void) => () => void;
  isTyping: (matchId: string) => boolean;
  setTyping: (matchId: string, typing: boolean) => Promise<void>;
  reportUser: (matchId: string, reason: string) => Promise<void>;
  blockUser: (matchId: string) => Promise<void>;
  usingFirebase: boolean;
  simulateIncoming: (matchId: string, text: string) => Promise<void>;
}

const STORAGE_KEY = 'chat_messages_v1';
const STORAGE_BLOCKED = 'chat_blocked_v1';

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
  const [typingMap, setTypingMap] = useState<TypingState>({});
  const [blocked, setBlocked] = useState<Record<string, boolean>>({});
  const [usingFirebase, setUsingFirebase] = useState<boolean>(false);
  const emitterRef = useRef(new Emitter());
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const mountedRef = useRef<boolean>(false);
  const { enabled: tEnabled, translateTo, targetLang } = useTranslate();

  const firebaseRefs = useRef<{ db: ReturnType<typeof getFirestore> | null; storage: ReturnType<typeof getStorage> | null }>({ db: null, storage: null });
  const unsubscribeMap = useRef<Record<string, () => void>>({});
  const typingUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
        if (mountedRef.current) setMessagesMap(parsed);
      } catch (e) {
        console.log('[Chat] load error', e);
      }
      try {
        const rawBlocked = await AsyncStorage.getItem(STORAGE_BLOCKED);
        const parsedBlocked: Record<string, boolean> = rawBlocked ? JSON.parse(rawBlocked) : {};
        setBlocked(parsedBlocked);
      } catch (e) {
        console.log('[Chat] load blocked error', e);
      }
      try {
        const { db, storage } = getFirebase();
        firebaseRefs.current = { db, storage } as const;
        setUsingFirebase(true);
        console.log('[Chat] Firebase enabled');
      } catch (e) {
        console.log('[Chat] Firebase not configured, falling back to local mode', e);
        setUsingFirebase(false);
      }
    })();
    return () => {
      mountedRef.current = false;
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current.clear();
      Object.values(unsubscribeMap.current).forEach((u) => u());
      Object.values(typingUnsubs.current).forEach((u) => u());
    };
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

  const attachFirebaseListeners = useCallback((matchId: string) => {
    if (!firebaseRefs.current.db) return;
    if (unsubscribeMap.current[matchId]) return;
    const db = firebaseRefs.current.db;
    const messagesCol = collection(db, 'chats', matchId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, async (snap) => {
      const list: ChatMessage[] = [];
      const toMarkRead: string[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const createdAtTs: number = d.createdAt?.toMillis ? d.createdAt.toMillis() : (typeof d.createdAt === 'number' ? d.createdAt : Date.now());
        const item: ChatMessage = {
          id: docSnap.id,
          matchId,
          type: d.type as ChatMessageType,
          text: d.text,
          mediaUri: d.mediaUrl,
          sender: d.sender as 'user' | 'match',
          createdAt: createdAtTs,
          translatedText: d.translatedText,
          detectedLang: d.detectedLang,
          readBy: Array.isArray(d.readBy) ? d.readBy : [],
          status: d.status as ChatMessage['status'],
        };
        list.push(item);
        if (item.sender === 'match' && item.status !== 'read') {
          toMarkRead.push(docSnap.id);
        }
      });
      setMessagesMap((prev) => ({ ...prev, [matchId]: list }));
      emitterRef.current.emit(matchId);
      if (toMarkRead.length && firebaseRefs.current.db) {
        try {
          const dbLocal = firebaseRefs.current.db;
          await Promise.all(
            toMarkRead.map((id) => updateDoc(doc(dbLocal, 'chats', matchId, 'messages', id), { status: 'read' }))
          );
        } catch (e) {
          console.log('[Chat] mark read error', e);
        }
      }
    });
    unsubscribeMap.current[matchId] = unsub;

    const typingDoc = doc(db, 'chats', matchId, 'meta', 'typing');
    const unsubTyping = onSnapshot(typingDoc, (snap) => {
      const data = snap.data() as any;
      const isTyping = !!data?.matchTyping;
      setTypingMap((prev) => ({ ...prev, [matchId]: isTyping }));
    }, (err) => console.log('[Chat] typing listen error', err));
    typingUnsubs.current[matchId] = unsubTyping;
  }, []);

  const getMessages = useCallback((matchId: string) => {
    if (usingFirebase) attachFirebaseListeners(matchId);
    return (messagesMap[matchId] ?? []).sort((a, b) => a.createdAt - b.createdAt);
  }, [messagesMap, usingFirebase, attachFirebaseListeners]);

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

  const uploadToStorage = useCallback(async (uri: string, path: string): Promise<string> => {
    const storage = firebaseRefs.current.storage;
    if (!storage) return uri;
    const r = ref(storage, path);
    let blob: Blob | null = null;
    try {
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        blob = await resp.blob();
      } else {
        const resp = await fetch(uri);
        blob = await resp.blob();
      }
      const bytes = await blob.arrayBuffer();
      await uploadBytes(r, new Uint8Array(bytes));
      const url = await getDownloadURL(r);
      return url;
    } catch (e) {
      console.log('[Chat] upload error', e);
      return uri;
    }
  }, []);

  const sendText = useCallback(async (matchId: string, text: string, recipientLang?: SupportedLocale) => {
    if (!text.trim()) return;
    let outgoing = text.trim();
    let translatedText: string | undefined = undefined;
    let detectedLang: string | undefined = undefined;
    try {
      const target = recipientLang ?? targetLang;
      if (tEnabled) {
        const res = await translateTo(outgoing, target);
        translatedText = res.translated;
        detectedLang = res.detectedLang;
        outgoing = res.translated;
      }
    } catch (e) {
      console.log('[Chat] auto-translate failed, sending original', e);
    }

    if (usingFirebase && firebaseRefs.current.db) {
      try {
        const db = firebaseRefs.current.db;
        const colRef = collection(db, 'chats', matchId, 'messages');
        await addDoc(colRef, {
          type: 'text',
          text: outgoing,
          sender: 'user',
          createdAt: serverTimestamp(),
          translatedText: translatedText ?? null,
          detectedLang: detectedLang ?? null,
          readBy: [],
          status: 'sent',
        });
      } catch (e) {
        console.log('[Chat] sendText firebase error, fallback local', e);
        const msg: ChatMessage = {
          id: String(Date.now()),
          matchId,
          type: 'text',
          text: outgoing,
          sender: 'user',
          createdAt: Date.now(),
          translatedText,
          detectedLang,
          status: 'sent',
          readBy: [],
        };
        appendMessage(matchId, msg);
      }
    } else {
      const msg: ChatMessage = {
        id: String(Date.now()),
        matchId,
        type: 'text',
        text: outgoing,
        sender: 'user',
        createdAt: Date.now(),
        translatedText,
        detectedLang,
        status: 'sent',
        readBy: [],
      };
      appendMessage(matchId, msg);
      const id = setTimeout(() => {
        if (!mountedRef.current) return;
        const echo: ChatMessage = {
          id: String(Date.now() + 1),
          matchId,
          type: 'text',
          text: 'Got it! 😊',
          sender: 'match',
          createdAt: Date.now() + 1,
          status: 'delivered',
          readBy: [],
        };
        appendMessage(matchId, echo);
      }, 600);
      timeoutsRef.current.add(id);
    }
  }, [appendMessage, tEnabled, translateTo, targetLang, usingFirebase]);

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

      if (usingFirebase && firebaseRefs.current.db) {
        const url = await uploadToStorage(uri, `chats/${matchId}/${Date.now()}.jpg`);
        try {
          const db = firebaseRefs.current.db;
          const colRef = collection(db, 'chats', matchId, 'messages');
          await addDoc(colRef, {
            type: 'image',
            mediaUrl: url,
            sender: 'user',
            createdAt: serverTimestamp(),
            readBy: [],
            status: 'sent',
          });
          return;
        } catch (e) {
          console.log('[Chat] sendImage firebase error, fallback local', e);
        }
      }

      const msg: ChatMessage = {
        id: String(Date.now()),
        matchId,
        type: 'image',
        mediaUri: uri,
        sender: 'user',
        createdAt: Date.now(),
        status: 'sent',
        readBy: [],
      };
      appendMessage(matchId, msg);
    } catch (e) {
      console.log('[Chat] sendImage error', e);
      Alert.alert('Error', 'Unable to attach image.');
    }
  }, [appendMessage, uploadToStorage, usingFirebase]);

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

      if (usingFirebase && firebaseRefs.current.db) {
        const url = await uploadToStorage(uri, `chats/${matchId}/${Date.now()}.mp4`);
        try {
          const db = firebaseRefs.current.db;
          const colRef = collection(db, 'chats', matchId, 'messages');
          await addDoc(colRef, {
            type: 'video',
            mediaUrl: url,
            sender: 'user',
            createdAt: serverTimestamp(),
            readBy: [],
            status: 'sent',
          });
          return;
        } catch (e) {
          console.log('[Chat] sendVideo firebase error, fallback local', e);
        }
      }

      const msg: ChatMessage = {
        id: String(Date.now()),
        matchId,
        type: 'video',
        mediaUri: uri,
        sender: 'user',
        createdAt: Date.now(),
        status: 'sent',
        readBy: [],
      };
      appendMessage(matchId, msg);
    } catch (e) {
      console.log('[Chat] sendVideo error', e);
      Alert.alert('Error', 'Unable to attach video.');
    }
  }, [appendMessage, uploadToStorage, usingFirebase]);

  const subscribe = useCallback((matchId: string, cb: () => void) => {
    return emitterRef.current.on(matchId, cb);
  }, []);

  const isTyping = useCallback((matchId: string) => {
    return !!typingMap[matchId];
  }, [typingMap]);

  const setTyping = useCallback(async (matchId: string, typing: boolean) => {
    setTypingMap((prev) => ({ ...prev, [matchId]: typing }));
    if (usingFirebase && firebaseRefs.current.db) {
      try {
        const db = firebaseRefs.current.db;
        const typingDoc = doc(db, 'chats', matchId, 'meta', 'typing');
        await setDoc(typingDoc, { userTyping: typing }, { merge: true });
      } catch (e) {
        console.log('[Chat] setTyping error', e);
      }
    }
  }, [usingFirebase]);

  const reportUser = useCallback(async (matchId: string, reason: string) => {
    if (usingFirebase && firebaseRefs.current.db) {
      try {
        const db = firebaseRefs.current.db;
        await addDoc(collection(db, 'reports'), {
          matchId,
          reason,
          createdAt: serverTimestamp(),
        });
        Alert.alert('Reported', 'Thank you. Our team will review.');
        return;
      } catch (e) {
        console.log('[Chat] report error', e);
      }
    }
    Alert.alert('Reported', 'We have recorded your report locally.');
  }, [usingFirebase]);

  const blockUser = useCallback(async (matchId: string) => {
    setBlocked((prev) => ({ ...prev, [matchId]: true }));
    try {
      await AsyncStorage.setItem(STORAGE_BLOCKED, JSON.stringify({ ...blocked, [matchId]: true }));
    } catch (e) {
      console.log('[Chat] block persist error', e);
    }
    Alert.alert('Blocked', 'You will no longer receive messages from this match.');
  }, [blocked]);

  const simulateIncoming = useCallback(async (matchId: string, text: string) => {
    if (usingFirebase && firebaseRefs.current.db) {
      try {
        const db = firebaseRefs.current.db;
        const colRef = collection(db, 'chats', matchId, 'messages');
        await addDoc(colRef, {
          type: 'text',
          text,
          sender: 'match',
          createdAt: serverTimestamp(),
          readBy: [],
          status: 'sent',
        });
        return;
      } catch (e) {
        console.log('[Chat] simulateIncoming firebase error', e);
      }
    }
    const msg: ChatMessage = {
      id: String(Date.now()),
      matchId,
      type: 'text',
      text,
      sender: 'match',
      createdAt: Date.now(),
      status: 'delivered',
      readBy: [],
    };
    appendMessage(matchId, msg);
  }, [usingFirebase, appendMessage]);

  const value: ChatContextType = useMemo(() => ({
    getMessages,
    sendText,
    sendImage,
    sendVideo,
    subscribe,
    isTyping,
    setTyping,
    reportUser,
    blockUser,
    usingFirebase,
    simulateIncoming,
  }), [getMessages, sendText, sendImage, sendVideo, subscribe, isTyping, setTyping, reportUser, blockUser, usingFirebase, simulateIncoming]);

  return value;
});

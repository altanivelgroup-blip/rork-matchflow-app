import { useCallback, useEffect, useMemo, useState } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { verifySingleImage } from '@/lib/faceVerification';

export type MediaType = 'image' | 'video';

export interface MediaItem {
  id: string;
  type: MediaType;
  localUri: string;
  remoteUrl?: string;
  createdAt: number;
  isPrimary?: boolean;
}

interface MediaContextType {
  media: MediaItem[];
  isLoading: boolean;
  pickFromLibrary: (type: MediaType) => Promise<void>;
  capturePhoto: () => Promise<void>;
  captureVideo: () => Promise<void>;
  removeItem: (id: string) => void;
  setPrimary: (id: string) => void;
  uploadPending: boolean;
  uploadItem: (id: string) => Promise<void>;
}

const STORAGE_KEY = 'profile_media_v1';

async function requestPermissions(type: MediaType) {
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const cam = await ImagePicker.requestCameraPermissionsAsync();
  const granted = lib.granted && cam.granted;
  return granted;
}

export const [MediaProvider, useMedia] = createContextHook<MediaContextType>(() => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadPending, setUploadPending] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: MediaItem[] = raw ? JSON.parse(raw) : [];
        setMedia(parsed);
      } catch (e) {
        console.log('[Media] load error', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(media));
      } catch (e) {
        console.log('[Media] persist error', e);
      }
    })();
  }, [media]);

  const addItem = useCallback((item: MediaItem) => {
    setMedia((prev) => {
      const next = [...prev];
      if (next.length === 0) {
        item.isPrimary = true;
      }
      next.unshift(item);
      return next;
    });
  }, []);

  const pickFromLibrary = useCallback(async (type: MediaType) => {
    try {
      const granted = await requestPermissions(type);
      if (!granted) {
        Alert.alert('Permissions required', 'Please grant camera and library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: type === 'image',
        aspect: type === 'image' ? [1, 1] : undefined,
        videoMaxDuration: type === 'video' ? 30 : undefined,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      if (type === 'image') {
        const v = await verifySingleImage(asset.uri);
        if (!v.ok) {
          Alert.alert('Verification failed', v.reason ?? "Photo doesn't seem real—try again!");
          return;
        }
      }
      addItem({ id: String(Date.now()), type, localUri: asset.uri, createdAt: Date.now() });
    } catch (e) {
      console.log('[Media] pickFromLibrary error', e);
      Alert.alert('Error', 'Unable to pick media.');
    }
  }, [addItem]);

  const capturePhoto = useCallback(async () => {
    try {
      const granted = await requestPermissions('image');
      if (!granted) {
        Alert.alert('Permissions required', 'Please grant camera and library access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      const v = await verifySingleImage(asset.uri);
      if (!v.ok) {
        Alert.alert('Verification failed', v.reason ?? "Photo doesn't seem real—try again!");
        return;
      }
      addItem({ id: String(Date.now()), type: 'image', localUri: asset.uri, createdAt: Date.now() });
    } catch (e) {
      console.log('[Media] capturePhoto error', e);
      Alert.alert('Error', 'Unable to capture photo.');
    }
  }, [addItem]);

  const captureVideo = useCallback(async () => {
    try {
      const granted = await requestPermissions('video');
      if (!granted) {
        Alert.alert('Permissions required', 'Please grant camera and microphone access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 30,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;
      addItem({ id: String(Date.now()), type: 'video', localUri: asset.uri, createdAt: Date.now() });
    } catch (e) {
      console.log('[Media] captureVideo error', e);
      Alert.alert('Error', 'Unable to capture video.');
    }
  }, [addItem]);

  const removeItem = useCallback((id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const setPrimary = useCallback((id: string) => {
    setMedia((prev) => prev.map((m) => ({ ...m, isPrimary: m.id === id })));
  }, []);

  const uploadItem = useCallback(async (id: string) => {
    try {
      const item = media.find((m) => m.id === id);
      if (!item) return;
      Alert.alert('Storage required', 'Enable backend and configure a signed upload URL to store media securely.');
    } catch (e) {
      console.log('[Media] uploadItem error', e);
    }
  }, [media]);

  const value: MediaContextType = useMemo(() => ({
    media,
    isLoading,
    pickFromLibrary,
    capturePhoto,
    captureVideo,
    removeItem,
    setPrimary,
    uploadPending,
    uploadItem,
  }), [media, isLoading, pickFromLibrary, capturePhoto, captureVideo, removeItem, setPrimary, uploadPending, uploadItem]);

  return value;
});

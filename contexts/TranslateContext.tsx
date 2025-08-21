import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectDeviceLocale, SupportedLocale } from '@/lib/i18n';
import { translateText } from '@/lib/translator';

export type TranslationProvider = 'ai';

export interface TranslationResult {
  input: string;
  translated: string;
  detectedLang: SupportedLocale | 'unknown';
  targetLang: SupportedLocale;
}

interface TranslateContextType {
  enabled: boolean;
  targetLang: SupportedLocale;
  setEnabled: (v: boolean) => void;
  setTargetLang: (lang: SupportedLocale) => void;
  translate: (text: string) => Promise<TranslationResult>;
  translateTo: (text: string, target: SupportedLocale) => Promise<TranslationResult>;
  warmup: () => void;
}

const defaultTarget: SupportedLocale = (() => {
  const d = detectDeviceLocale();
  return d;
})();

export const [TranslateProvider, useTranslate] = createContextHook<TranslateContextType>(() => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [targetLang, setTargetLang] = useState<SupportedLocale>(defaultTarget);

  const cacheRef = useRef<Map<string, TranslationResult>>(new Map());

  useEffect(() => {
    cacheRef.current.clear();
  }, [targetLang]);

  useEffect(() => {
    const load = async () => {
      try {
        const [e, t] = await Promise.all([
          AsyncStorage.getItem('translate:enabled'),
          AsyncStorage.getItem('translate:target'),
        ]);
        if (e != null) {
          const parsed = e === 'true';
          setEnabled(parsed);
        }
        if (t) {
          setTargetLang(t as SupportedLocale);
        }
        console.log('[Translate] loaded settings', { e, t });
      } catch (err) {
        console.log('[Translate] load settings error', err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const persist = async () => {
      try {
        await AsyncStorage.setItem('translate:enabled', String(enabled));
        await AsyncStorage.setItem('translate:target', String(targetLang));
        console.log('[Translate] saved settings', { enabled, targetLang });
      } catch (err) {
        console.log('[Translate] save settings error', err);
      }
    };
    persist();
  }, [enabled, targetLang]);

  const keyFor = (text: string, tgt: SupportedLocale) => `${tgt}::${text}`;

  const translate = useCallback(async (text: string): Promise<TranslationResult> => {
    const tgt = targetLang;
    const key = keyFor(text, tgt);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;

    try {
      const out = await translateText(text, tgt);
      cacheRef.current.set(key, out);
      return out;
    } catch (e) {
      console.log('[Translate] translate error', e);
      const fallback: TranslationResult = {
        input: text,
        translated: text,
        detectedLang: 'unknown',
        targetLang: tgt,
      };
      return fallback;
    }
  }, [targetLang]);

  const translateTo = useCallback(async (text: string, target: SupportedLocale): Promise<TranslationResult> => {
    const tgt = target;
    const key = keyFor(text, tgt);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;
    try {
      const out = await translateText(text, tgt);
      cacheRef.current.set(key, out);
      return out;
    } catch (e) {
      console.log('[Translate] translateTo error', e);
      const fallback: TranslationResult = {
        input: text,
        translated: text,
        detectedLang: 'unknown',
        targetLang: tgt,
      };
      return fallback;
    }
  }, []);

  const warmup = useCallback(() => {
    if (Platform.OS === 'web') {
      console.log('[Translate] warmup on web');
    }
  }, []);

  const value: TranslateContextType = useMemo(() => ({
    enabled,
    targetLang,
    setEnabled,
    setTargetLang,
    translate,
    translateTo,
    warmup,
  }), [enabled, targetLang, translate, translateTo, warmup]);

  return value;
});

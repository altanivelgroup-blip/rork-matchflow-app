import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
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
    warmup,
  }), [enabled, targetLang, translate, warmup]);

  return value;
});

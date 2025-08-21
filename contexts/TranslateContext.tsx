import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectDeviceLocale, SupportedLocale } from '@/lib/i18n';
import { translateText } from '@/lib/translator';
import { useMembership } from '@/contexts/MembershipContext';

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

interface TranslateUsageState { dateISO: string; count: number }
const STORAGE_USAGE = 'translate:usage:v1';

export const [TranslateProvider, useTranslate] = createContextHook<TranslateContextType>(() => {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [targetLang, setTargetLang] = useState<SupportedLocale>(defaultTarget);

  const { tier } = useMembership();
  const cacheRef = useRef<Map<string, TranslationResult>>(new Map());
  const [usage, setUsage] = useState<TranslateUsageState>({ dateISO: new Date().toISOString().slice(0, 10), count: 0 });

  useEffect(() => {
    cacheRef.current.clear();
  }, [targetLang]);

  useEffect(() => {
    const load = async () => {
      try {
        const [e, t, u] = await Promise.all([
          AsyncStorage.getItem('translate:enabled'),
          AsyncStorage.getItem('translate:target'),
          AsyncStorage.getItem(STORAGE_USAGE),
        ]);
        if (e != null) {
          const parsed = e === 'true';
          setEnabled(parsed);
        }
        if (t) {
          setTargetLang(t as SupportedLocale);
        }
        if (u) {
          try {
            const parsedU = JSON.parse(u) as TranslateUsageState;
            const today = new Date().toISOString().slice(0, 10);
            setUsage(parsedU.dateISO === today ? parsedU : { dateISO: today, count: 0 });
          } catch (e2) {
            setUsage({ dateISO: new Date().toISOString().slice(0, 10), count: 0 });
          }
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
        await AsyncStorage.setItem(STORAGE_USAGE, JSON.stringify(usage));
        console.log('[Translate] saved settings', { enabled, targetLang, usage });
      } catch (err) {
        console.log('[Translate] save settings error', err);
      }
    };
    persist();
  }, [enabled, targetLang, usage]);

  const resetIfNewDay = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (usage.dateISO !== today) {
      setUsage({ dateISO: today, count: 0 });
    }
  }, [usage.dateISO]);

  useEffect(() => {
    resetIfNewDay();
  }, [resetIfNewDay]);

  const keyFor = (text: string, tgt: SupportedLocale) => `${tgt}::${text}`;

  const getDailyCap = useCallback((): number | null => {
    if (tier === 'plus') return null;
    return 30;
  }, [tier]);

  const bumpUsage = useCallback(() => {
    setUsage((prev) => ({ dateISO: new Date().toISOString().slice(0, 10), count: prev.count + 1 }));
  }, []);

  const guardLimit = useCallback(() => {
    const cap = getDailyCap();
    if (cap == null) return { ok: true } as const;
    const remaining = cap - usage.count;
    if (remaining <= 0) {
      console.log('[Translate] daily cap reached for free tier');
      return { ok: false } as const;
    }
    return { ok: true } as const;
  }, [getDailyCap, usage.count]);

  const translate = useCallback(async (text: string): Promise<TranslationResult> => {
    resetIfNewDay();
    const lim = guardLimit();
    const tgt = targetLang;
    const key = keyFor(text, tgt);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;

    if (!lim.ok) {
      return { input: text, translated: text, detectedLang: 'unknown', targetLang: tgt };
    }

    try {
      const out = await translateText(text, tgt);
      cacheRef.current.set(key, out);
      bumpUsage();
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
  }, [targetLang, guardLimit, bumpUsage, resetIfNewDay]);

  const translateTo = useCallback(async (text: string, target: SupportedLocale): Promise<TranslationResult> => {
    resetIfNewDay();
    const lim = guardLimit();
    const tgt = target;
    const key = keyFor(text, tgt);
    const cached = cacheRef.current.get(key);
    if (cached) return cached;

    if (!lim.ok) {
      return { input: text, translated: text, detectedLang: 'unknown', targetLang: tgt };
    }

    try {
      const out = await translateText(text, tgt);
      cacheRef.current.set(key, out);
      bumpUsage();
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
  }, [guardLimit, resetIfNewDay, bumpUsage]);

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

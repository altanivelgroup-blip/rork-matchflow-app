import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, SupportedLocale, supportedLocales, detectDeviceLocale } from '@/lib/i18n';
import { showToast } from '@/lib/toast';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (l: SupportedLocale) => void;
  t: (scope: string, options?: Record<string, unknown>) => string;
  supported: Record<SupportedLocale, string>;
}

const defaultLocale: SupportedLocale = detectDeviceLocale();

const defaultValue: I18nContextType = {
  locale: defaultLocale,
  setLocale: () => {},
  t: (s: string) => s,
  supported: supportedLocales,
};

export const [I18nProvider, useI18n] = createContextHook<I18nContextType>(() => {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem('i18n:locale');
        const next = (saved as SupportedLocale) ?? defaultLocale;
        i18n.locale = next;
        if (mountedRef.current) setLocaleState(next);
      } catch (e) {
        i18n.locale = defaultLocale;
      }
    };
    load();
  }, []);

  useEffect(() => {
    const persist = async () => {
      try {
        await AsyncStorage.setItem('i18n:locale', locale);
      } catch {}
    };
    if (mountedRef.current) persist();
  }, [locale]);

  const setLocale = useCallback((l: SupportedLocale) => {
    try {
      const hasTranslations = Boolean((i18n.translations as any)?.[l]);
      if (!hasTranslations) {
        i18n.locale = 'en';
        setLocaleState('en');
        showToast('Translations not available, falling back to English');
        return;
      }
      i18n.locale = l;
      setLocaleState(l);
      const label = supportedLocales[l] ?? l;
      showToast(`Language changed to ${label}`);
    } catch (e) {
      i18n.locale = 'en';
      setLocaleState('en');
      showToast('Error switching language. Falling back to English');
    }
  }, []);

  const t = useCallback((scope: string, options?: Record<string, unknown>) => i18n.t(scope as any, options), []);

  const value: I18nContextType = useMemo(() => ({
    locale,
    setLocale,
    t,
    supported: supportedLocales,
  }), [locale, setLocale, t]);

  return value;
}, defaultValue);

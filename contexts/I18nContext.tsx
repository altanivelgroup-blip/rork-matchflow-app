import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, SupportedLocale, supportedLocales, detectDeviceLocale } from '@/lib/i18n';

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

  const setLocale = (l: SupportedLocale) => {
    i18n.locale = l;
    setLocaleState(l);
  };

  const t = (scope: string, options?: Record<string, unknown>) => i18n.t(scope as any, options);

  const value: I18nContextType = useMemo(() => ({
    locale,
    setLocale,
    t,
    supported: supportedLocales,
  }), [locale]);

  return value;
}, defaultValue);

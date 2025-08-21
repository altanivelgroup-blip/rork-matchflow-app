import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';

export type SupportedLocale = 'en' | 'es' | 'zh-Hans' | 'ja';

export const supportedLocales: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  'zh-Hans': '中文(简体)',
  ja: '日本語',
};

export const i18n = new I18n();

i18n.enableFallback = true;

i18n.defaultLocale = 'en';

i18n.translations = {
  // Will be populated dynamically by provider import side effects
} as any;

export function detectDeviceLocale(): SupportedLocale {
  try {
    const locales = getLocales();
    const primary = locales?.[0]?.languageTag || locales?.[0]?.languageCode || 'en';
    const lower = primary.toLowerCase();
    if (lower.startsWith('es')) return 'es';
    if (lower.startsWith('zh') || lower.includes('hans')) return 'zh-Hans';
    if (lower.startsWith('ja')) return 'ja';
    return 'en';
  } catch (e) {
    console.log('[i18n] detectDeviceLocale error', e);
    return 'en';
  }
}

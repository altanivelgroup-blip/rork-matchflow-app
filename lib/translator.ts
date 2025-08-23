import { SupportedLocale } from '@/lib/i18n';
import type { TranslationResult } from '@/contexts/TranslateContext';

export type TranslatorService = 'openai' | 'google';

async function postJSON<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function looksEmojiOnly(text: string): boolean {
  const stripped = text.replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}|\s/gu, '');
  return stripped.length === 0;
}

function likelySameLanguage(input: string, target: SupportedLocale): boolean {
  if (!input.trim()) return true;
  if (looksEmojiOnly(input)) return true;
  if (target === 'en') {
    const ascii = /^[\x00-\x7F\s\p{P}]+$/u;
    if (ascii.test(input)) return true;
  }
  return false;
}

function getService(): TranslatorService {
  const hasGoogle = typeof process !== 'undefined' && typeof (process as any).env !== 'undefined' && !!(process as any).env.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY;
  return hasGoogle ? 'google' : 'openai';
}

function stripCodeFences(s: string): string {
  const fenced = s.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  if (fenced && fenced[1]) return fenced[1];
  const inline = s.replace(/^```[a-zA-Z0-9_-]*\n?/, '').replace(/\n?```$/, '');
  return inline.trim();
}

function extractJSON(s: string): any | null {
  const cleaned = stripCodeFences(s);
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

function normalizeDetected(lang: string | undefined): SupportedLocale | 'unknown' {
  if (!lang) return 'unknown';
  const norm = lang.toLowerCase();
  if (norm.startsWith('es')) return 'es';
  if (norm.startsWith('zh')) return 'zh-Hans';
  if (norm.startsWith('ja')) return 'ja';
  if (norm.startsWith('en')) return 'en';
  return 'unknown';
}

async function translateWithOpenAI(input: string, targetLang: SupportedLocale, signal?: AbortSignal): Promise<TranslationResult> {
  const prompt = `Detect the input language and translate to ${targetLang}. Preserve slang, tone, hashtags, mentions, URLs, and emojis unchanged. If a phrase is culture-specific, translate meaningfully and keep the original in parentheses only when necessary. Respond strictly as JSON: { \"detectedLang\": \"en|es|zh-Hans|ja\", \"translated\": \"...\" }`;
  const messages = [
    { role: 'system', content: 'You are a fast, reliable translation engine for chat and short bios. Keep latency low and preserve formatting.' },
    { role: 'user', content: `${prompt}\n\nText: ${input}` },
  ];
  const data = await postJSON<{ completion: string }>('https://toolkit.rork.com/text/llm/', { messages }, signal);
  let detected: SupportedLocale | 'unknown' = 'unknown';
  let translated = input;
  const parsed = extractJSON(data.completion);
  if (parsed && typeof parsed === 'object') {
    detected = normalizeDetected(String(parsed.detectedLang || parsed.lang || 'unknown'));
    const t = parsed.translated ?? parsed.text;
    if (typeof t === 'string' && t.trim().length > 0) translated = t;
  } else {
    const onlyText = stripCodeFences(data.completion).trim();
    const viaRegex = /\"translated\"\s*:\s*\"([\s\S]*?)\"/.exec(onlyText);
    if (viaRegex && viaRegex[1]) {
      translated = viaRegex[1];
    } else {
      translated = input;
    }
  }
  return { input, translated, detectedLang: detected, targetLang };
}

async function translateWithGoogle(input: string, targetLang: SupportedLocale, signal?: AbortSignal): Promise<TranslationResult> {
  const key = (process as any).env?.EXPO_PUBLIC_GOOGLE_TRANSLATE_API_KEY as string | undefined;
  if (!key) return translateWithOpenAI(input, targetLang, signal);
  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const body = { q: input, target: targetLang === 'zh-Hans' ? 'zh-CN' : targetLang, format: 'text' } as const;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const json = await res.json() as any;
  const translation = json?.data?.translations?.[0];
  const translated: string = String(translation?.translatedText ?? input);
  const detectedSource: string = String(translation?.detectedSourceLanguage || 'en');
  let detected: SupportedLocale | 'unknown' = 'unknown';
  const norm = detectedSource.toLowerCase();
  if (norm.startsWith('es')) detected = 'es';
  else if (norm.startsWith('zh')) detected = 'zh-Hans';
  else if (norm.startsWith('ja')) detected = 'ja';
  else detected = 'en';
  return { input, translated, detectedLang: detected, targetLang };
}

function withTimeout<T>(p: Promise<T>, ms: number, onAbort: () => void): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    onAbort();
    controller.abort();
  }, ms);
  return new Promise<T>((resolve, reject) => {
    p.then((v) => { clearTimeout(timer); resolve(v); })
     .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

export async function translateText(input: string, targetLang: SupportedLocale): Promise<TranslationResult> {
  try {
    if (likelySameLanguage(input, targetLang)) {
      return { input, translated: input, detectedLang: targetLang, targetLang };
    }
    const service = getService();
    const exec = async () => {
      if (service === 'google') return translateWithGoogle(input, targetLang);
      return translateWithOpenAI(input, targetLang);
    };
    try {
      const fast = await withTimeout(exec(), 12000, () => {});
      return fast;
    } catch (firstErr) {
      const fallback = await withTimeout(translateWithOpenAI(input, targetLang), 15000, () => {});
      return fallback;
    }
  } catch (e) {
    console.log('[translator] error', e);
    return {
      input,
      translated: input,
      detectedLang: 'unknown',
      targetLang,
    } as TranslationResult;
  }
}

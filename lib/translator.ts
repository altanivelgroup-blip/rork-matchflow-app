import { SupportedLocale } from '@/lib/i18n';
import type { TranslationResult } from '@/contexts/TranslateContext';

export type TranslatorService = 'openai';

async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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

export async function translateText(input: string, targetLang: SupportedLocale): Promise<TranslationResult> {
  try {
    if (likelySameLanguage(input, targetLang)) {
      return { input, translated: input, detectedLang: targetLang, targetLang };
    }

    const prompt = `Detect the input language and translate to ${targetLang}. Preserve slang, tone, hashtags, mentions, URLs, and emojis unchanged. If a phrase is culture-specific, translate meaningfully and keep the original in parentheses only when necessary. Respond strictly as JSON: { "detectedLang": "en|es|zh-Hans|ja", "translated": "..." }`;
    const messages = [
      { role: 'system', content: 'You are a fast, reliable translation engine for chat and short bios. Keep latency low and preserve formatting.' },
      { role: 'user', content: `${prompt}\n\nText: ${input}` },
    ];
    const data = await postJSON<{ completion: string }>('https://toolkit.rork.com/text/llm/', { messages });
    let detected: SupportedLocale | 'unknown' = 'unknown';
    let translated = input;
    try {
      const parsed = JSON.parse(data.completion);
      const maybeDetected = String(parsed.detectedLang || parsed.lang || 'unknown');
      const norm = maybeDetected.toLowerCase();
      if (norm.startsWith('es')) detected = 'es';
      else if (norm.startsWith('zh')) detected = 'zh-Hans';
      else if (norm.startsWith('ja')) detected = 'ja';
      else detected = 'en';
      translated = String(parsed.translated || parsed.text || input);
    } catch (e) {
      translated = data.completion?.trim?.() || input;
    }
    const result: TranslationResult = {
      input,
      translated,
      detectedLang: detected,
      targetLang,
    };
    return result;
  } catch (e) {
    console.log('[translator] error', e);
    return {
      input,
      translated: input,
      detectedLang: 'unknown',
      targetLang,
    };
  }
}

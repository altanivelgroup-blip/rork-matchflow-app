import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from "react";
import { SupportedLocale, supportedLocales } from "@/lib/i18n";

interface Profile {
  id: string;
  name: string;
  age: number;
  bio: string;
  image: string;
  interests: string[];
  preferredLang?: SupportedLocale;
}

interface MatchContextType {
  matches: Profile[];
  addMatch: (profile: Profile) => void;
  removeMatch: (profileId: string) => void;
  getPreferredLang: (matchId: string) => SupportedLocale | undefined;
  setPreferredLang: (matchId: string, lang: SupportedLocale) => Promise<void>;
  preferredMap: Record<string, SupportedLocale>;
}

const PREFS_KEY = 'match_prefs_lang_v1';

export const [MatchProvider, useMatches] = createContextHook<MatchContextType>(() => {
  const [matches, setMatches] = useState<Profile[]>([]);
  const [preferredMap, setPreferredMap] = useState<Record<string, SupportedLocale>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PREFS_KEY);
        const parsed: Record<string, SupportedLocale> = raw ? JSON.parse(raw) : {};
        setPreferredMap(parsed);
      } catch (e) {
        console.log('[MatchContext] load prefs error', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(preferredMap));
      } catch (e) {
        console.log('[MatchContext] save prefs error', e);
      }
    })();
  }, [preferredMap]);

  const addMatch = useCallback((profile: Profile) => {
    setMatches((prev) => {
      if (prev.find((m) => m.id === profile.id)) {
        return prev;
      }
      return [...prev, profile];
    });
  }, []);

  const removeMatch = useCallback((profileId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== profileId));
  }, []);

  const getPreferredLang = useCallback((matchId: string): SupportedLocale | undefined => {
    const explicit = preferredMap[matchId];
    if (explicit) return explicit;
    const inProfile = matches.find((m) => String(m.id) === String(matchId))?.preferredLang as SupportedLocale | undefined;
    return inProfile;
  }, [preferredMap, matches]);

  const setPreferredLang = useCallback(async (matchId: string, lang: SupportedLocale) => {
    setPreferredMap((prev) => ({ ...prev, [matchId]: lang }));
  }, []);

  const value: MatchContextType = useMemo(() => ({
    matches,
    addMatch,
    removeMatch,
    getPreferredLang,
    setPreferredLang,
    preferredMap,
  }), [matches, addMatch, removeMatch, getPreferredLang, setPreferredLang, preferredMap]);

  return value;
});
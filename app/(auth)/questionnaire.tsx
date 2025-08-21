import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMembership } from '@/contexts/MembershipContext';
import { useAuth } from '@/contexts/AuthContext';
import { backend, type QuestionnaireAnswers } from '@/lib/backend';
import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, Crown, Info, Languages, Sparkles, X } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, type SupportedLocale } from '@/lib/i18n';
import en from '@/locales/en';
import es from '@/locales/es';
import zhHans from '@/locales/zh-Hans';
import ja from '@/locales/ja';

const Q_STORAGE = 'questionnaire:progress:v1';

type StepType = 'multi' | 'single' | 'range' | 'text' | 'tags' | 'checkboxes';

interface StepDef {
  key: keyof QuestionnaireAnswers;
  type: StepType;
  title: string;
  description?: string;
  options?: string[];
  min?: number;
  max?: number;
}

const hobbyOptions = ['Travel', 'Music', 'Sports', 'Reading', 'Cooking', 'Gaming', 'Art', 'Outdoors'];
const dealBreakers = ['Smoking', 'Drugs', 'Wants kids', "Doesn't want kids", 'Open relationship'];
const loveLangs = ['Words of affirmation', 'Quality time', 'Physical touch', 'Acts of service', 'Receiving gifts'];
const personality = ['Introvert', 'Extrovert', 'Ambivert', 'Planner', 'Spontaneous'];
const lifestyleSmoke = ['No', 'Occasionally', 'Yes'];
const fitness = ['Rarely', 'Sometimes', 'Often'];
const lookingFor = ['Serious', 'Casual', 'Friendship', 'Open to explore'];
const music = ['Pop', 'Rock', 'Hip-hop', 'Classical', 'Jazz', 'EDM'];
const cuisines = ['Italian', 'Japanese', 'Mexican', 'Indian', 'Chinese', 'Mediterranean'];

function chip(text: string, selected: boolean) {
  return (
    <View style={[styles.chip, selected ? styles.chipActive : undefined]}>
      <Text style={[styles.chipText, selected ? styles.chipTextActive : undefined]}>{text}</Text>
    </View>
  );
}

export default function QuestionnaireScreen() {
  const { user } = useAuth();
  const { tier } = useMembership();
  const uid = user?.email ?? 'guest';
  const [locale] = useState<SupportedLocale>('en');
  const [current, setCurrent] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const isPlus = tier === 'plus';

  i18n.translations = { en, es, 'zh-Hans': zhHans, ja } as any;

  const baseSteps: StepDef[] = [
    { key: 'hobbies', type: 'multi', title: 'What are your top 3 hobbies?', options: hobbyOptions },
    { key: 'preferredAgeRange', type: 'range', title: 'Preferred age range?', min: 18, max: 70 },
    { key: 'dealBreakers', type: 'checkboxes', title: 'Any deal-breakers?', options: dealBreakers },
    { key: 'bio', type: 'text', title: 'Write a short bio' },
    { key: 'interests', type: 'tags', title: 'Interests (tags like movies, food...)' },
  ];

  const premiumSteps: StepDef[] = [
    { key: 'loveLanguages', type: 'multi', title: 'Love languages', options: loveLangs },
    { key: 'personalityTraits', type: 'multi', title: 'Personality traits', options: personality },
    { key: 'lifestyle', type: 'single', title: 'Lifestyle: smoking', options: lifestyleSmoke },
    { key: 'lookingFor', type: 'single', title: 'What are you looking for?', options: lookingFor },
    { key: 'musicGenres', type: 'multi', title: 'Favorite music genres', options: music },
    { key: 'cuisine', type: 'multi', title: 'Favorite cuisines', options: cuisines },
  ];

  const steps = isPlus ? [...baseSteps, ...premiumSteps] : baseSteps;
  const totalSteps = steps.length;

  const [answers, setAnswers] = useState<QuestionnaireAnswers>({
    hobbies: [],
    preferredAgeRange: { min: 24, max: 36 },
    dealBreakers: [],
    bio: '',
    interests: [],
    loveLanguages: [],
    personalityTraits: [],
    lifestyle: { smoking: 'No' },
    lookingFor: undefined,
    musicGenres: [],
    cuisine: [],
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const saved = await backend.fetchQuestionnaire(uid);
        const draft = await AsyncStorage.getItem(Q_STORAGE + ':' + uid);
        if (!mounted) return;
        if (saved) setAnswers(saved);
        else if (draft) setAnswers(JSON.parse(draft) as QuestionnaireAnswers);
      } catch (e) {
        console.log('[Questionnaire] load error', e);
      }
    })();
    return () => { mounted = false; };
  }, [uid]);

  useEffect(() => {
    AsyncStorage.setItem(Q_STORAGE + ':' + uid, JSON.stringify(answers)).catch(() => {});
  }, [answers, uid]);

  const minRequired = 5;

  const canProceed = useMemo(() => {
    let count = 0;
    if (answers.hobbies.length > 0) count++;
    if (answers.dealBreakers.length > 0) count++;
    if (answers.bio.trim().length >= 10) count++;
    if (answers.interests.length > 0) count++;
    if (answers.preferredAgeRange.min > 0) count++;
    return count >= minRequired;
  }, [answers]);

  const setField = useCallback(<K extends keyof QuestionnaireAnswers>(key: K, value: QuestionnaireAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleFromArray = useCallback((key: keyof QuestionnaireAnswers, value: string) => {
    setAnswers((prev) => {
      const curr = (prev[key] as string[]) ?? [];
      const exists = curr.includes(value);
      const next = exists ? curr.filter((x) => x !== value) : [...curr, value];
      return { ...prev, [key]: next } as QuestionnaireAnswers;
    });
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, totalSteps - 1));
  }, [totalSteps]);

  const goBack = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  const saveAll = useCallback(async () => {
    try {
      setSaving(true);
      const saved = await backend.saveQuestionnaire(uid, answers);
      await AsyncStorage.removeItem(Q_STORAGE + ':' + uid);
      Alert.alert('Profile updated', 'Your answers were saved.');
      router.replace('/(tabs)');
      return saved;
    } catch (e) {
      console.log('[Questionnaire] save error', e);
      Alert.alert('Error', 'Could not save your answers.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [uid, answers]);

  const progress = Math.round(((current + 1) / totalSteps) * 100);

  const renderStep = (step: StepDef) => {
    if (step.type === 'multi' && step.options) {
      const sel = (answers[step.key] as string[]) ?? [];
      return (
        <View style={styles.optionsWrap}>
          {step.options.map((opt) => (
            <TouchableOpacity key={opt} onPress={() => toggleFromArray(step.key, opt)} testID={`opt-${opt}`}>
              {chip(opt, sel.includes(opt))}
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (step.type === 'single' && step.options) {
      const sel = String((answers[step.key] as any) ?? '');
      return (
        <View style={styles.optionsWrap}>
          {step.options.map((opt) => (
            <TouchableOpacity key={opt} onPress={() => setField(step.key as any, opt as any)}>
              {chip(opt, sel === opt)}
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (step.type === 'checkboxes' && step.options) {
      const sel = (answers[step.key] as string[]) ?? [];
      return (
        <View style={styles.optionsWrap}>
          {step.options.map((opt) => (
            <TouchableOpacity key={opt} onPress={() => toggleFromArray(step.key, opt)}>
              {chip(opt, sel.includes(opt))}
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (step.type === 'range') {
      const range = answers.preferredAgeRange;
      return (
        <View style={{ gap: 10 }}>
          <View style={styles.rangeRow}>
            <Text style={styles.rangeLabel}>Min</Text>
            <TextInput style={styles.rangeInput} keyboardType="numeric" value={String(range.min)} onChangeText={(v) => setField('preferredAgeRange', { ...range, min: Number(v || 0) })} />
            <Text style={styles.rangeLabel}>Max</Text>
            <TextInput style={styles.rangeInput} keyboardType="numeric" value={String(range.max)} onChangeText={(v) => setField('preferredAgeRange', { ...range, max: Number(v || 0) })} />
          </View>
          <Text style={styles.rangeHint}>Tip: Keep the range realistic to improve matches.</Text>
        </View>
      );
    }
    if (step.type === 'text') {
      const val = String((answers[step.key] as any) ?? '');
      return (
        <TextInput
          style={styles.textArea}
          placeholder="Type here…"
          placeholderTextColor="#9CA3AF"
          multiline
          value={val}
          onChangeText={(v) => setField(step.key as any, v as any)}
        />
      );
    }
    if (step.type === 'tags') {
      const val = (answers[step.key] as string[]) ?? [];
      return (
        <View>
          <View style={styles.tagsRow}>
            {val.map((t) => (
              <View key={t} style={styles.tagItem}>
                <Text style={styles.tagText}>{t}</Text>
                <TouchableOpacity onPress={() => setField(step.key as any, val.filter((x) => x !== t) as any)}>
                  <X color="#9CA3AF" size={14} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <TextInput
            style={styles.tagInput}
            placeholder="Type a tag and press Enter"
            placeholderTextColor="#9CA3AF"
            onSubmitEditing={(e) => {
              const text = e.nativeEvent.text.trim();
              if (!text) return;
              const next = Array.from(new Set([...val, text])).slice(0, 12);
              setField(step.key as any, next as any);
            }}
          />
        </View>
      );
    }
    return null;
  };

  const step = steps[current];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} disabled={current === 0} accessibilityRole="button" testID="q-back">
          <ChevronLeft color={current === 0 ? '#CBD5E1' : '#0F172A'} size={22} />
        </TouchableOpacity>
        <View style={styles.progressOuter}>
          <View style={[styles.progressInner, { width: `${progress}%` }]} />
        </View>
        <View style={{ width: 22 }} />
      </View>

      {isPlus ? (
        <View style={styles.premiumPill}>
          <Crown color="#F59E0B" size={14} />
          <Text style={styles.premiumText}>Premium: Advanced questions unlocked</Text>
        </View>
      ) : (
        <View style={styles.upgradeHint}>
          <Sparkles color="#0EA5E9" size={14} />
          <Text style={styles.upgradeText}>Upgrade to unlock personality and lifestyle questions</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title} testID="q-title">{step.title}</Text>
        {step.description ? <Text style={styles.description}>{step.description}</Text> : null}
        <View style={{ marginTop: 14 }}>{renderStep(step)}</View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.primaryBtn, !canProceed ? styles.primaryBtnDisabled : undefined]} onPress={saveAll} disabled={!canProceed} testID="save-questionnaire">
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Complete Profile'}</Text>
        </TouchableOpacity>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={goBack} disabled={current === 0} style={[styles.navBtn, current === 0 ? styles.navDisabled : undefined]} testID="prev-step">
            <Text style={styles.navText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goNext} disabled={current === totalSteps - 1} style={[styles.navBtn, current === totalSteps - 1 ? styles.navDisabled : undefined]} testID="next-step">
            <Text style={styles.navText}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.navBtn} testID="skip-q">
            <Text style={styles.navText}>Skip</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.helpText}>Answer at least 5 to continue</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  progressOuter: { flex: 1, height: 6, backgroundColor: '#E2E8F0', borderRadius: 999, marginHorizontal: 12 },
  progressInner: { height: 6, backgroundColor: '#FF6B6B', borderRadius: 999 },
  premiumPill: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  premiumText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
  upgradeHint: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#BAE6FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  upgradeText: { color: '#0C4A6E', fontSize: 12, fontWeight: '700' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  description: { marginTop: 4, color: '#475569' },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { color: '#111827', fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },
  textArea: { minHeight: 120, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, color: '#111827' },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  rangeLabel: { color: '#64748B', marginHorizontal: 8, fontWeight: '700' },
  rangeInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: '#111827' },
  rangeHint: { color: '#94A3B8', fontSize: 12 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tagItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  tagText: { color: '#0F172A', fontWeight: '700' },
  tagInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#111827' },
  footer: { borderTopWidth: 1, borderTopColor: '#F1F5F9', padding: 16 },
  primaryBtn: { backgroundColor: '#FF6B6B', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#FFB3B3' },
  primaryText: { color: '#FFFFFF', fontWeight: '800' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  navBtn: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#F8FAFC', borderRadius: 10 },
  navDisabled: { opacity: 0.6 },
  navText: { color: '#111827', fontWeight: '700' },
  helpText: { marginTop: 8, color: '#64748B', textAlign: 'center', fontSize: 12 },
});

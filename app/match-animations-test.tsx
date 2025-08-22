import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import MatchCelebration, { CelebrationTheme } from '@/components/MatchCelebration';
import type { MockProfile } from '@/mocks/profiles';
import { mockProfiles } from '@/mocks/profiles';
import { Sparkles, Play, Square, Gauge, Globe2, MapPin, Heart, X, Settings } from 'lucide-react-native';
import { backend } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';

interface RunConfig {
  profile: MockProfile | null;
  aiScore: number; // 0-100
  theme: CelebrationTheme;
  speed: 'slow' | 'normal' | 'fast';
  simulateMutual: boolean;
}

const speedToMultiplier: Record<RunConfig['speed'], number> = {
  slow: 0.5,
  normal: 1,
  fast: 1.25,
};

export default function MatchAnimationsTest() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.email ?? 'guest';

  const [config, setConfig] = useState<RunConfig>({
    profile: null,
    aiScore: 85,
    theme: 'fireworks',
    speed: 'normal',
    simulateMutual: true,
  });
  const [visible, setVisible] = useState<boolean>(false);
  const [log, setLog] = useState<string[]>([]);
  const runningRef = useRef<boolean>(false);

  const [settingsEnabled, setSettingsEnabled] = useState<boolean>(true);
  const [settingsIntensity, setSettingsIntensity] = useState<number>(7);
  const [volume, setVolume] = useState<number>(0.9);

  const addLog = useCallback((msg: string) => {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log('[MatchAnimationsTest]', line);
    setLog((prev) => [line, ...prev].slice(0, 100));
  }, []);

  const intensity = useMemo(() => {
    const aiFactor = Math.max(0, Math.min(1, config.aiScore / 100));
    const userFactor = Math.max(0.1, Math.min(1, (settingsIntensity ?? 7) / 10));
    const speedFactor = speedToMultiplier[config.speed] ?? 1;
    const combined = aiFactor * (0.4 + 0.6 * userFactor) * speedFactor;
    return Math.max(0.05, Math.min(1, combined));
  }, [config.aiScore, config.speed, settingsIntensity]);

  const isInternational = useMemo(() => {
    const d = config.profile?.distanceFromUser ?? 0;
    return d > 1000;
  }, [config.profile]);

  const gifUrl = useMemo(() => {
    const huge = 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif';
    const mid = 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif';
    const tiny = 'https://media.giphy.com/media/3oEduQAsYcJKQH2XsI/giphy.gif';
    const score = config.aiScore;
    if (Platform.OS !== 'web') return undefined;
    if (score >= 90) return huge;
    if (score >= 75) return mid;
    return tiny;
  }, [config.aiScore]);

  const lottieUrl = useMemo(() => {
    if (Platform.OS === 'web') return undefined;
    if (config.aiScore >= 90) return 'https://assets9.lottiefiles.com/packages/lf20_xldzoar2.json';
    if (config.aiScore >= 75) return 'https://assets9.lottiefiles.com/packages/lf20_q5pk6p1k.json';
    return undefined;
  }, [config.aiScore]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await backend.fetchUserSettings(uid);
        if (cancelled || !s) return;
        setSettingsEnabled(typeof s.matchAnimationsEnabled === 'boolean' ? s.matchAnimationsEnabled : true);
        setSettingsIntensity(typeof s.matchAnimationIntensity === 'number' ? Math.max(1, Math.min(10, Math.round(s.matchAnimationIntensity))) : 7);
      } catch (e) {
        console.log('[MatchAnimationsTest] load settings error', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid]);

  const onRun = useCallback(() => {
    try {
      if (runningRef.current) {
        addLog('Already running animation, ignoring new request');
        return;
      }
      if (!config.profile) {
        Alert.alert('Select a profile first');
        addLog('Run aborted: no profile selected');
        return;
      }
      const willMatch = !!config.simulateMutual && (config.profile.likedYou || config.aiScore >= 80);
      addLog(`Run: profile=${config.profile.name} aiScore=${config.aiScore} theme=${config.theme} speed=${config.speed} mutual=${willMatch} settingsEnabled=${settingsEnabled} settingsIntensity=${settingsIntensity}`);
      if (!settingsEnabled) {
        setVisible(false);
        addLog('Celebrations disabled by user settings');
        return;
      }
      if (!willMatch) {
        setVisible(false);
        addLog('No match: showing subtle feedback only');
        return;
      }
      runningRef.current = true;
      setVisible(false);
      setTimeout(() => setVisible(true), 16);
    } catch (e) {
      addLog(`Crash in onRun: ${(e as Error).message}`);
    }
  }, [config, addLog, settingsEnabled, settingsIntensity]);

  const onDone = useCallback(() => {
    runningRef.current = false;
    setVisible(false);
    addLog('Animation finished');
  }, [addLog]);

  const scenarios = useMemo(() => {
    const local = mockProfiles.find((p) => (p.distanceFromUser ?? 0) < 50) ?? mockProfiles[0];
    const intl = mockProfiles.find((p) => (p.distanceFromUser ?? 0) > 3000) ?? mockProfiles[mockProfiles.length - 1];
    const fail = mockProfiles.find((p) => !p.likedYou) ?? mockProfiles[1];
    return { local, intl, fail } as const;
  }, []);

  const selectScenario = useCallback((which: 'local' | 'intl' | 'fail') => {
    const profile = which === 'local' ? scenarios.local : which === 'intl' ? scenarios.intl : scenarios.fail;
    const aiScore = which === 'local' ? 88 : which === 'intl' ? 92 : 54;
    const simulateMutual = which !== 'fail';
    setConfig((c) => ({ ...c, profile, aiScore, simulateMutual }));
    addLog(`Scenario selected: ${which} -> ${profile.name}`);
  }, [scenarios, addLog]);

  const themes: CelebrationTheme[] = ['hearts', 'confetti', 'fireworks'];

  return (
    <View style={styles.container} testID="match-animations-test">
      <Stack.Screen options={{ title: 'Match Animations Test' }} />
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.scenarioBtn} onPress={() => selectScenario('local')} accessibilityRole="button" testID="btn-scenario-local">
          <MapPin size={16} color="#0EA5E9" />
          <Text style={styles.scenarioText}>Local Match</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scenarioBtn} onPress={() => selectScenario('intl')} accessibilityRole="button" testID="btn-scenario-intl">
          <Globe2 size={16} color="#22C55E" />
          <Text style={styles.scenarioText}>International</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scenarioBtn} onPress={() => selectScenario('fail')} accessibilityRole="button" testID="btn-scenario-fail">
          <X size={16} color="#EF4444" />
          <Text style={styles.scenarioText}>Failed</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.configCard}>
        <TouchableOpacity
          onPress={() => {
            const picked = mockProfiles[0];
            setConfig((c) => ({ ...c, profile: picked, aiScore: 98, simulateMutual: true }));
            setVisible(false);
            setTimeout(() => setVisible(true), 16);
            addLog('Tap-to-boom triggered (98%)');
          }}
          style={styles.tapBoom}
          accessibilityRole="button"
          testID="btn-tap-boom"
        >
          <Text style={styles.tapBoomText}>Tap here to trigger a BIG boom (98%)</Text>
        </TouchableOpacity>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Selected</Text>
          {isInternational ? (
            <View style={styles.tagIntl} testID="tag-international">
              <Globe2 size={14} color="#065F46" />
              <Text style={styles.tagIntlText}>International</Text>
            </View>
          ) : null}
        </View>
        {config.profile ? (
          <View style={styles.selectedRow}>
            <Text style={styles.selectedName}>
              {config.profile.name} · {config.profile.location?.city ?? '—'} · {(config.profile.distanceFromUser ?? 0)} mi
            </Text>
          </View>
        ) : (
          <Text style={styles.muted}>Pick a scenario above</Text>
        )}

        <View style={styles.settingsRow}>
          <Text style={styles.smallMuted}>Settings: {settingsEnabled ? 'On' : 'Off'} · Intensity {settingsIntensity}/10</Text>
          <TouchableOpacity style={styles.linkBtn} onPress={() => router.push('/(tabs)/settings')} accessibilityRole="button" testID="btn-open-settings">
            <Settings size={14} color="#2563EB" />
            <Text style={styles.linkText}>Open Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={async () => {
            try {
              const s = await backend.fetchUserSettings(uid);
              setSettingsEnabled(typeof s?.matchAnimationsEnabled === 'boolean' ? s?.matchAnimationsEnabled : true);
              setSettingsIntensity(typeof s?.matchAnimationIntensity === 'number' ? Math.max(1, Math.min(10, Math.round(s?.matchAnimationIntensity as number))) : 7);
              addLog('Reloaded settings from backend');
            } catch (e) {
              Alert.alert('Error', 'Failed to reload settings');
            }
          }} accessibilityRole="button" testID="btn-reload-settings">
            <Gauge size={14} color="#10B981" />
            <Text style={styles.linkText}>Reload</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowWrap}>
          {[0.3, 0.6, 1].map((v) => (
            <TouchableOpacity key={`vol-${v}`} style={[styles.pill, Math.abs(volume - v) < 0.01 && styles.pillActive]} onPress={() => setVolume(v)} accessibilityRole="button" testID={`pill-volume-${v}`}>
              <Gauge size={14} color={Math.abs(volume - v) < 0.01 ? '#fff' : '#111827'} />
              <Text style={[styles.pillText, Math.abs(volume - v) < 0.01 && styles.pillTextActive]}>Vol {Math.round(v*100)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {themes.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.pill, config.theme === t && styles.pillActive]}
              onPress={() => setConfig((c) => ({ ...c, theme: t }))}
              accessibilityRole="button"
              testID={`pill-theme-${t}`}
            >
              <Sparkles size={14} color={config.theme === t ? '#fff' : '#111827'} />
              <Text style={[styles.pillText, config.theme === t && styles.pillTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {(['slow', 'normal', 'fast'] as RunConfig['speed'][]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.pill, config.speed === s && styles.pillActive]}
              onPress={() => setConfig((c) => ({ ...c, speed: s }))}
              accessibilityRole="button"
              testID={`pill-speed-${s}`}
            >
              <Gauge size={14} color={config.speed === s ? '#fff' : '#111827'} />
              <Text style={[styles.pillText, config.speed === s && styles.pillTextActive]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowWrap}>
          {[65, 75, 85, 92, 98].map((score) => (
            <TouchableOpacity
              key={score}
              style={[styles.pill, config.aiScore === score && styles.pillActive]}
              onPress={() => setConfig((c) => ({ ...c, aiScore: score }))}
              accessibilityRole="button"
              testID={`pill-score-${score}`}
            >
              <Heart size={14} color={config.aiScore === score ? '#fff' : '#111827'} />
              <Text style={[styles.pillText, config.aiScore === score && styles.pillTextActive]}>{score}%</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowBetween}>
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: '#22C55E' }]}
            onPress={onRun}
            accessibilityRole="button"
            testID="btn-run"
          >
            <Play size={16} color="#fff" />
            <Text style={styles.runBtnText}>Run</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: '#111827' }]}
            onPress={() => {
              const picked = mockProfiles[0];
              setConfig((c) => ({ ...c, profile: picked, aiScore: 96, simulateMutual: true }));
              setVisible(false);
              setTimeout(() => setVisible(true), 16);
              addLog('Lottie burst triggered (96%)');
            }}
            accessibilityRole="button"
            testID="btn-lottie-burst"
          >
            <Sparkles size={16} color="#fff" />
            <Text style={styles.runBtnText}>Lottie Burst</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              runningRef.current = false;
              setVisible(false);
              addLog('Manually stopped');
            }}
            accessibilityRole="button"
            testID="btn-stop"
          >
            <Square size={16} color="#fff" />
            <Text style={styles.runBtnText}>Stop</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Dummy Profiles</Text>
      <FlatList
        data={mockProfiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              setConfig((c) => ({ ...c, profile: item, aiScore: 95, simulateMutual: true }));
              setVisible(false);
              setTimeout(() => setVisible(true), 16);
              addLog(`Clicked ${item.name} -> boom (95%)`);
            }}
            accessibilityRole="button"
            testID={`profile-${item.id}`}
          >
            <Text style={styles.listTitle}>{item.name}, {item.age} · {(item.distanceFromUser ?? 0)} mi</Text>
            <Text style={styles.listSub}>{item.location?.city ?? '—'} · AI {item.aiCompatibilityScore ?? 0}% · {item.isVerified ? 'Verified' : 'Not Verified'}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <View style={styles.logBox} testID="debug-log">
        <Text style={styles.sectionTitle}>Debug Log</Text>
        {log.slice(0, 8).map((l, i) => (
          <Text key={`log-${i}`} style={styles.logLine}>
            {l}
          </Text>
        ))}
      </View>

      <MatchCelebration
        visible={visible}
        onDone={onDone}
        intensity={intensity}
        theme={config.theme}
        message={config.profile ? `It's a match with ${config.profile.name}!` : "It's a match!"}
        volume={volume}
        soundEnabled
        vibrate
        gifUrl={gifUrl}
        lottieUrl={lottieUrl}
        burstMode="auto"
        soundBoomUrl={'https://cdn.freesound.org/previews/235/235968_3984679-lq.wav'}
        soundPopUrl={'https://cdn.freesound.org/previews/341/341695_6262555-lq.wav'}
      />

      {/* Crash guard for web specific features */}
      {Platform.OS === 'web' ? null : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  controlsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  scenarioBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  scenarioText: { color: '#111827', fontWeight: '700' },
  configCard: { backgroundColor: '#FFFFFF', margin: 12, padding: 12, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  muted: { color: '#6B7280', marginTop: 4 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  smallMuted: { color: '#6B7280', fontSize: 12 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, backgroundColor: '#E0F2FE' },
  linkText: { color: '#2563EB', fontWeight: '800' },
  tapBoom: { backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  tapBoomText: { color: '#fff', fontWeight: '900' },
  selectedRow: { marginTop: 6 },
  selectedName: { fontSize: 14, color: '#111827', fontWeight: '700' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9999, backgroundColor: '#E5E7EB' },
  pillActive: { backgroundColor: '#111827' },
  pillText: { color: '#111827', fontWeight: '700', textTransform: 'capitalize' as const },
  pillTextActive: { color: '#fff' },
  runBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  runBtnText: { color: '#fff', fontWeight: '800' },
  sectionTitle: { marginTop: 8, marginHorizontal: 12, fontSize: 14, fontWeight: '800', color: '#111827' },
  listItem: { backgroundColor: '#FFFFFF', padding: 12, marginHorizontal: 12, marginTop: 8, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  listTitle: { color: '#111827', fontWeight: '800' },
  listSub: { color: '#6B7280', marginTop: 2 },
  logBox: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: 'rgba(17,24,39,0.85)', padding: 10, borderRadius: 10 },
  logLine: { color: '#E5E7EB', fontSize: 11 },
  tagIntl: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9999 },
  tagIntlText: { color: '#065F46', fontWeight: '800' },
});

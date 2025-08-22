import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MatchCelebration from '@/components/MatchCelebration';
import { DIAG, type LogEntry } from '@/app/diagnostics-report';
import { Camera, CheckCircle2, Clock, Image as ImageIcon, Play, RotateCcw, ShieldAlert, Stars, User, Volume2, VolumeX, Waypoints } from 'lucide-react-native';

interface Step {
  id: string;
  label: string;
  run: () => Promise<void>;
}

export default function DiagnosticTest() {
  const [running, setRunning] = useState<boolean>(false);
  const [stepsPassed, setStepsPassed] = useState<Record<string, boolean>>({});
  const [celebrate, setCelebrate] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  const log = useCallback((level: LogEntry['level'], code: string, scope: string, message: string, meta?: Record<string, unknown>) => {
    DIAG.push({ level, code, scope, message, meta });
  }, []);

  const mark = useCallback((id: string, ok: boolean) => {
    setStepsPassed(prev => ({ ...prev, [id]: ok }));
  }, []);

  const mockSignup = useCallback(async () => {
    try {
      await AsyncStorage.setItem('signup:basic', JSON.stringify({
        email: 'diag@example.com',
        password: 'p@ssw0rd',
        createdAt: Date.now(),
      }));
      log('info', 'SIGNUP_OK', 'diag', 'Mock signup stored');
      mark('signup', true);
    } catch (e) {
      log('error', 'SIGNUP_FAIL', 'diag', 'Failed to store mock signup', { e: String(e) });
      mark('signup', false);
    }
  }, [log, mark]);

  const simulatePermissions = useCallback(async () => {
    try {
      const granted = true;
      await AsyncStorage.setItem('perm:camera', granted ? 'granted' : 'denied');
      await AsyncStorage.setItem('perm:photos', 'blocked-gallery-during-verify');
      log('info', 'PERM_CAMERA', 'diag', granted ? 'Camera granted' : 'Camera denied');
      mark('permissions', granted);
    } catch (e) {
      log('error', 'PERM_FAIL', 'diag', 'Permission simulation failed', { e: String(e) });
      mark('permissions', false);
    }
  }, [log, mark]);

  const simulateTimer = useCallback(async () => {
    try {
      const start = Date.now();
      await AsyncStorage.setItem('verify_timer_start', String(start));
      log('info', 'TIMER_START', 'diag', '2-minute timer started', { start });
      await new Promise(r => setTimeout(r, 250));
      const expired = start + 2 * 60 * 1000;
      log('warn', 'TIMER_TICK', 'diag', 'Simulated ticking...', { msUntilExpiry: Math.max(0, expired - Date.now()) });
      mark('timer', true);
    } catch (e) {
      log('error', 'TIMER_FAIL', 'diag', 'Timer simulation error', { e: String(e) });
      mark('timer', false);
    }
  }, [log, mark]);

  const simulatePhotos = useCallback(async () => {
    try {
      const photos = {
        front: { uri: 'mock://front.jpg', capturedAt: Date.now() - 20000, byteSize: 150000 },
        smile: { uri: 'mock://smile.jpg', capturedAt: Date.now() - 15000, byteSize: 148000 },
        sad: { uri: 'mock://sad.jpg', capturedAt: Date.now() - 10000, byteSize: 147500 },
      } as const;
      await AsyncStorage.setItem('verification_photos_v1', JSON.stringify(photos));
      log('info', 'PHOTOS_SAVED', 'diag', 'Mock photos saved', { count: Object.keys(photos).length });
      mark('photos', true);
    } catch (e) {
      log('error', 'PHOTOS_FAIL', 'diag', 'Saving mock photos failed', { e: String(e) });
      mark('photos', false);
    }
  }, [log, mark]);

  const simulateVerification = useCallback(async () => {
    try {
      await AsyncStorage.setItem('verification_passed_v1', 'true');
      await AsyncStorage.setItem('verification_score_v1', '0.91');
      log('info', 'VERIFY_OK', 'diag', 'Verification flagged as passed');
      mark('verify', true);
    } catch (e) {
      log('error', 'VERIFY_FAIL', 'diag', 'Verification flag failed', { e: String(e) });
      mark('verify', false);
    }
  }, [log, mark]);

  const triggerFireworks = useCallback(async () => {
    try {
      setCelebrate(true);
      log('info', 'FX_START', 'celebration', 'Fireworks started', { soundOn });
      setTimeout(() => {
        setCelebrate(false);
        log('info', 'FX_END', 'celebration', 'Fireworks finished');
      }, 2000);
      mark('fireworks', true);
    } catch (e) {
      log('error', 'FX_FAIL', 'celebration', 'Fireworks trigger failed', { e: String(e) });
      mark('fireworks', false);
    }
  }, [soundOn, log, mark]);

  const goProfile = useCallback(async () => {
    try {
      router.push('/(tabs)/profile' as any);
      log('info', 'NAV_PROFILE', 'navigation', 'Navigated to profile');
      mark('profile', true);
    } catch (e) {
      log('error', 'NAV_FAIL', 'navigation', 'Profile navigation failed', { e: String(e) });
      mark('profile', false);
    }
  }, [log, mark]);

  const resetAll = useCallback(async () => {
    setRunning(false);
    setCelebrate(false);
    setStepsPassed({});
    await AsyncStorage.multiRemove([
      'signup:basic',
      'perm:camera',
      'perm:photos',
      'verify_timer_start',
      'verification_photos_v1',
      'verification_passed_v1',
      'verification_score_v1',
    ]);
    log('info', 'RESET_OK', 'diag', 'State and keys cleared');
  }, [log]);

  const steps = useMemo<Step[]>(() => ([
    { id: 'signup', label: 'Mock signup', run: mockSignup },
    { id: 'permissions', label: 'Sim permissions', run: simulatePermissions },
    { id: 'timer', label: 'Sim 2‑min timer', run: simulateTimer },
    { id: 'photos', label: 'Save mock photos', run: simulatePhotos },
    { id: 'verify', label: 'Flag verified', run: simulateVerification },
    { id: 'fireworks', label: 'Fireworks + sound', run: triggerFireworks },
    { id: 'profile', label: 'Go to Profile', run: goProfile },
  ]), [goProfile, mockSignup, simulatePermissions, simulatePhotos, simulateTimer, simulateVerification, triggerFireworks]);

  const runAll = useCallback(async () => {
    if (running) return;
    setRunning(true);
    for (const s of steps) {
      try {
        await s.run();
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        log('error', 'STEP_FAIL', 'diag', `Step failed: ${s.id}`, { e: String(e) });
      }
    }
    setRunning(false);
  }, [running, steps, log]);

  const toggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    log(next ? 'info' : 'warn', 'SOUND_TOGGLE', 'celebration', next ? 'Sound enabled' : 'Sound disabled');
  }, [soundOn, log]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} testID="btn-back">
          <Play size={18} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Diagnostic Test</Text>
        <TouchableOpacity onPress={() => router.push('/diagnostics-report' as any)} style={styles.iconBtn} testID="btn-diagnostics">
          <Waypoints size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.cta, styles.primary]} onPress={runAll} disabled={running} testID="btn-run-all">
            <Stars size={18} color="#fff" />
            <Text style={styles.ctaText}>{running ? 'Running…' : 'Run full flow'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cta, styles.secondary]} onPress={resetAll} testID="btn-reset">
            <RotateCcw size={18} color="#111827" />
            <Text style={[styles.ctaText, styles.ctaTextDark]}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.cta, soundOn ? styles.secondary : styles.warn]} onPress={toggleSound} testID="btn-sound-toggle">
            {soundOn ? <Volume2 size={18} color="#111827" /> : <VolumeX size={18} color="#fff" />}
            <Text style={[styles.ctaText, !soundOn ? undefined : styles.ctaTextDark]}>{soundOn ? 'Sound on' : 'Sound off'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cta, styles.secondary]} onPress={() => setCelebrate(true)} testID="btn-fireworks-now">
            <ImageIcon size={18} color="#111827" />
            <Text style={[styles.ctaText, styles.ctaTextDark]}>Fireworks now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Steps</Text>
          {steps.map(s => (
            <TouchableOpacity key={s.id} style={styles.step} onPress={s.run} testID={`step-${s.id}`}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {s.id === 'signup' && <User size={18} color="#3B82F6" />}
                {s.id === 'permissions' && <ShieldAlert size={18} color="#8B5CF6" />} 
                {s.id === 'timer' && <Clock size={18} color="#F59E0B" />} 
                {s.id === 'photos' && <Camera size={18} color="#10B981" />} 
                {s.id === 'verify' && <CheckCircle2 size={18} color="#10B981" />} 
                {s.id === 'fireworks' && <Stars size={18} color="#EF4444" />} 
              </View>
              <Text style={styles.stepLabel}>{s.label}</Text>
              <Text style={[styles.badge, stepsPassed[s.id] ? styles.badgeOk : styles.badgeIdle]}>{stepsPassed[s.id] ? 'OK' : 'RUN'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hints</Text>
          <Text style={styles.hint}>• Watch console logs prefixed with [INFO]/[WARN]/[ERROR].</Text>
          <Text style={styles.hint}>• Open Diagnostics to view buffered logs and export.</Text>
          {Platform.OS === 'web' ? (
            <Text style={styles.hint}>• Web audio may require a user gesture; use Fireworks now first.</Text>
          ) : (
            <Text style={styles.hint}>• iOS silent switch: sound still plays due to audio mode in celebration.</Text>
          )}
        </View>
      </ScrollView>

      <MatchCelebration
        visible={celebrate}
        onDone={() => setCelebrate(false)}
        intensity={0.95}
        theme="fireworks"
        message="Boom!"
        soundEnabled={soundOn}
        vibrate={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  content: { padding: 16 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  cta: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  primary: { backgroundColor: '#111827' },
  secondary: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  warn: { backgroundColor: '#EF4444' },
  ctaText: { color: '#fff', fontWeight: '800' },
  ctaTextDark: { color: '#111827' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 8 },
  step: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', padding: 12, borderRadius: 12, marginBottom: 8 },
  stepLabel: { flex: 1, marginLeft: 12, color: '#111827', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontSize: 12, overflow: 'hidden', fontWeight: '900', color: '#fff' },
  badgeOk: { backgroundColor: '#10B981' },
  badgeIdle: { backgroundColor: '#9CA3AF' },
  iconBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F3F4F6' },
  hint: { color: '#6B7280', marginBottom: 4 },
});
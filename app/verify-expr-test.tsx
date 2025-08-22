import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TestTube, ShieldCheck, RefreshCcw, Camera as CameraIcon } from 'lucide-react-native';
import { runFaceVerification, type PoseCaptureMeta as PoseCaptureMetaAngles } from '@/lib/faceVerification';

interface PoseCaptureMeta { uri: string; capturedAt: number; byteSize: number | null }

type ExpressionKey = 'neutral' | 'smile' | 'sad';

const samples = {
  neutral: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=800&auto=format&fit=crop',
  smile: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop',
  sad: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800&auto=format&fit=crop'
};

export default function VerifyExprTest() {
  const [log, setLog] = useState<string>('');
  const [running, setRunning] = useState<boolean>(false);
  const [photos, setPhotos] = useState<Record<ExpressionKey, PoseCaptureMeta | null>>({ neutral: null, smile: null, sad: null });

  const addLog = useCallback((msg: string) => setLog((p) => `${p}${p ? '\n' : ''}${msg}`), []);

  const simulateCapture = useCallback((expr: ExpressionKey) => {
    const now = Date.now();
    const uri = samples[expr];
    const meta: PoseCaptureMeta = { uri, capturedAt: now + (expr === 'neutral' ? 0 : expr === 'smile' ? 1000 : 2000), byteSize: 25000 };
    setPhotos((p) => ({ ...p, [expr]: meta }));
  }, []);

  const resetAll = useCallback(() => {
    setPhotos({ neutral: null, smile: null, sad: null });
    setLog('');
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setLog('');
    try {
      const pNeutral = photos.neutral ?? { uri: samples.neutral, capturedAt: Date.now(), byteSize: 25000 };
      const pSmile = photos.smile ?? { uri: samples.smile, capturedAt: Date.now() + 1000, byteSize: 24000 };
      const pSad = photos.sad ?? { uri: samples.sad, capturedAt: Date.now() + 2000, byteSize: 26000 };
      const angles = { front: pNeutral, left: pSmile, right: pSad } as unknown as { front: PoseCaptureMetaAngles; left: PoseCaptureMetaAngles; right: PoseCaptureMetaAngles };
      addLog('Verifying three expression photos...');
      const res = await runFaceVerification(angles);
      addLog(`Result ok=${res.ok} score=${(res.score ?? 0).toFixed(2)}`);
      if (!res.ok) addLog(`Reason: ${res.reason ?? 'n/a'}`);
      if (res.ok) Alert.alert('OK', 'Expressions verified.'); else Alert.alert('Failed', res.reason ?? 'Verification failed');
    } catch (e) {
      addLog('Error running verification');
    } finally {
      setRunning(false);
    }
  }, [addLog, photos]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="back-button">
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expr Verify Test</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.desc}>Simulate Neutral 😐, Smile 😊, and Sad 😔 captures, then run verification via the angles engine.</Text>

        <View style={styles.row}>
          {(['neutral','smile','sad'] as ExpressionKey[]).map((expr) => (
            <TouchableOpacity key={expr} style={styles.badge} onPress={() => simulateCapture(expr)} testID={`simulate-${expr}`}>
              <CameraIcon color="#FF6B6B" size={16} />
              <Text style={styles.badgeText}>{expr}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={[styles.runButton, running ? styles.runDisabled : undefined]} onPress={run} disabled={running} testID="run-expr">
          {running ? <ActivityIndicator color="#fff" /> : <TestTube color="#fff" size={18} />}
          <Text style={styles.runText}>{running ? 'Running…' : 'Run Expressions Verification'}</Text>
          <ShieldCheck color="#fff" size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetButton} onPress={resetAll} testID="reset">
          <RefreshCcw color="#666" size={16} />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>

        <View style={styles.logBox}>
          <Text style={styles.logText}>{log || (Platform.OS === 'web' ? 'Web: using canvas heuristics.' : 'Device: mock heuristics in Expo Go.')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  body: { padding: 20 },
  desc: { color: '#555', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF4F4', borderRadius: 999, borderWidth: 1, borderColor: '#FFE1E1' },
  badgeText: { color: '#FF6B6B', fontWeight: '700' },
  runButton: { marginTop: 8, backgroundColor: '#FF6B6B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  runDisabled: { opacity: 0.7 },
  runText: { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 8 },
  resetButton: { alignSelf: 'center', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  resetText: { color: '#666', fontSize: 12 },
  logBox: { marginTop: 16, borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 12, backgroundColor: '#FAFAFA' },
  logText: { color: '#333', fontSize: 12, lineHeight: 18 },
});

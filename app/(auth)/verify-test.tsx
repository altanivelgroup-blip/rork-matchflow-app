import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, ShieldCheck, Image as ImageIcon, TestTube } from 'lucide-react-native';
import { runFaceVerification, compareStaticToLive } from '@/lib/faceVerification';

interface PoseCaptureMeta { uri: string; capturedAt: number; byteSize: number | null }

type PoseKey = 'front' | 'left' | 'right';

const sample = {
  front: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=800&auto=format&fit=crop',
  left: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=800&auto=format&fit=crop',
  right: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=800&auto=format&fit=crop',
  static: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=800&auto=format&fit=crop',
};

export default function VerifyTestScreen() {
  const [running, setRunning] = useState<boolean>(false);
  const [log, setLog] = useState<string>('');

  const addLog = useCallback((msg: string) => setLog((p) => `${p}${p ? '\n' : ''}${msg}`), []);

  const run = useCallback(async () => {
    setRunning(true);
    setLog('');
    try {
      const now = Date.now();
      const mk = (uri: string, t: number): PoseCaptureMeta => ({ uri, capturedAt: now + t, byteSize: 20000 });
      const input = { front: mk(sample.front, 0), left: mk(sample.left, 1000), right: mk(sample.right, 2000) } as { front: PoseCaptureMeta; left: PoseCaptureMeta; right: PoseCaptureMeta };
      addLog('Running runFaceVerification on sample URLs...');
      const v = await runFaceVerification(input);
      addLog(`Verification ok=${v.ok} score=${v.score ?? 0}`);
      if (!v.ok) addLog(`Reason: ${v.reason ?? 'n/a'}`);
      addLog('Comparing static photo to live set...');
      const cmp = await compareStaticToLive(sample.static, input.front.uri, input.left.uri, input.right.uri);
      addLog(`Compare ok=${cmp.ok} similarity=${(cmp.similarity ?? 0).toFixed(2)}${cmp.reason ? ` reason=${cmp.reason}` : ''}`);
      if (Platform.OS === 'web') addLog('Note: On web, this uses the Shape Detection and Canvas APIs when available.');
    } catch (e) {
      addLog('Test error occurred');
    } finally {
      setRunning(false);
    }
  }, [addLog]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Test</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.desc}>Run a simulated verification against sample images to validate on-device heuristics.</Text>

        <TouchableOpacity style={[styles.runButton, running ? styles.runDisabled : undefined]} onPress={run} disabled={running} testID="run-test">
          {running ? <ActivityIndicator color="#fff" /> : <TestTube color="#fff" size={18} />}
          <Text style={styles.runText}>{running ? 'Running…' : 'Run Simulation'}</Text>
          <ShieldCheck color="#fff" size={18} />
        </TouchableOpacity>

        <View style={styles.logBox}>
          <Text style={styles.logText}>{log || 'Logs will appear here…'}</Text>
        </View>

        <View style={styles.hintRow}>
          <ImageIcon color="#999" size={14} />
          <Text style={styles.hintText}>To test with your own photos, use the signup flow and the Compare uploaded selfie button.</Text>
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
  runButton: { marginTop: 8, backgroundColor: '#FF6B6B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  runDisabled: { opacity: 0.7 },
  runText: { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 8 },
  logBox: { marginTop: 16, borderWidth: 1, borderColor: '#EEE', borderRadius: 10, padding: 12, backgroundColor: '#FAFAFA' },
  logText: { color: '#333', fontSize: 12, lineHeight: 18 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  hintText: { color: '#777', fontSize: 12 },
});

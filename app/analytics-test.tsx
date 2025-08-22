import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export default function AnalyticsTest() {
  const analytics = useAnalytics();
  const [country, setCountry] = useState<string>('USA');
  const [log, setLog] = useState<string[]>([]);

  const push = (s: string) => setLog((prev) => [s, ...prev].slice(0, 50));

  const events: { name: ReturnType<() => import('@/contexts/AnalyticsContext').AnalyticsEventName>; params?: Record<string, string | number | boolean | null> }[] = useMemo(() => ([
    { name: 'sign_up', params: { locale: 'en', age: 28, country } } as const,
    { name: 'verification_started', params: { method: 'face' as const } } as const,
    { name: 'verification_passed', params: { liveness: 0.92 } } as const,
    { name: 'ai_sim_opened', params: { scenario: 'Paris Walk' } } as const,
    { name: 'ai_sim_completed', params: { chemistry: 87 } } as const,
    { name: 'premium_upgrade', params: { price: 9.99, promo: 5 } } as const,
    { name: 'promo_applied', params: { code: 'WELCOME5' } } as const,
    { name: 'match_like', params: { profileId: 'p1', country } } as const,
    { name: 'match_mutual', params: { profileId: 'p1', country } } as const,
    { name: 'chat_message', params: { len: 42 } } as const,
    { name: 'churn_marked', params: { reason: 'inactivity' } } as const,
  ]), [country]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Analytics Test' }} />
      <Text style={styles.title}>Analytics Playground</Text>

      <View style={styles.row}>
        {['USA','Mexico','Colombia','China','Japan'].map(c => (
          <TouchableOpacity key={c} onPress={() => setCountry(c)} style={[styles.chip, country === c && styles.chipActive]} testID={`chip-${c}`}>
            <Text style={[styles.chipText, country === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.grid}>
        {events.map((e, i) => (
          <TouchableOpacity
            key={`${e.name}-${i}`}
            onPress={async () => { await analytics.track(e.name, e.params); push(`${e.name} ${JSON.stringify(e.params)}`); }}
            style={styles.btn}
            testID={`event-${e.name}-${i}`}
          >
            <Text style={styles.btnText}>{e.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent (in-memory)</Text>
        {analytics.recent.map((ev, idx) => (
          <Text key={idx} style={styles.logLine}>{new Date(ev.at).toLocaleTimeString()} — {ev.name} {ev.params ? JSON.stringify(ev.params) : ''}</Text>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Console Log</Text>
        {log.map((l, idx) => (
          <Text key={idx} style={styles.logLine}>{l}</Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7' },
  chipText: { fontSize: 12, color: '#374151', fontWeight: '700' },
  chipTextActive: { color: '#065F46' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#111827', borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  card: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 12 },
  cardTitle: { fontWeight: '800', marginBottom: 8, color: '#111827' },
  logLine: { fontSize: 12, color: '#374151', marginBottom: 4 },
});

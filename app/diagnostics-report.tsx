import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Bug, Copy, RefreshCcw, Play } from 'lucide-react-native';
import { DIAG, type DiagEntry } from '@/lib/diagnostics';

const formatTs = (ts: number): string => new Date(ts).toLocaleString();

export default function DiagnosticsReport() {
  const router = useRouter();
  const [logs, setLogs] = useState<DiagEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'errors' | 'warnings'>('all');

  useEffect(() => {
    setLogs(DIAG.snapshot());
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'errors') return logs.filter(l => l.level === 'error');
    if (filter === 'warnings') return logs.filter(l => l.level !== 'info');
    return logs;
  }, [logs, filter]);

  const refresh = useCallback(() => {
    setLogs(DIAG.snapshot());
  }, []);

  const copy = useCallback(async () => {
    try {
      const text = JSON.stringify(filtered, null, 2);
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      } else {
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(text);
      }
      alert('Diagnostics copied');
    } catch (e) {
      alert('Copy failed');
    }
  }, [filtered]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Play size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Diagnostics</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity onPress={() => setFilter('all')} style={[styles.filterBtn, filter === 'all' && styles.filterActive]} testID="filter-all">
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('errors')} style={[styles.filterBtn, filter === 'errors' && styles.filterActive]} testID="filter-errors">
          <Text style={[styles.filterText, filter === 'errors' && styles.filterTextActive]}>Errors</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilter('warnings')} style={[styles.filterBtn, filter === 'warnings' && styles.filterActive]} testID="filter-warnings">
          <Text style={[styles.filterText, filter === 'warnings' && styles.filterTextActive]}>Warnings</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={refresh} style={styles.iconBtn} testID="refresh-logs">
          <RefreshCcw size={18} color="#111827" />
        </TouchableOpacity>
        <TouchableOpacity onPress={copy} style={styles.iconBtn} testID="copy-logs">
          <Copy size={18} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Bug size={24} color="#6B7280" />
            <Text style={styles.emptyText}>No diagnostics yet. Reproduce an issue, then refresh.</Text>
          </View>
        ) : (
          filtered.map((l) => (
            <View key={l.id} style={[styles.card, l.level === 'error' ? styles.cardError : l.level === 'warn' ? styles.cardWarn : undefined]}>
              <View style={styles.cardHeader}>
                <Text style={styles.code}>{l.code}</Text>
                <Text style={styles.scope}>{l.scope}</Text>
                <Text style={styles.time}>{formatTs(l.ts)}</Text>
              </View>
              <Text style={styles.msg}>{l.message}</Text>
              {l.meta ? (
                <Text style={styles.meta}>{JSON.stringify(l.meta)}</Text>
              ) : null}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  iconBtn: { padding: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  filterBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F3F4F6' },
  filterActive: { backgroundColor: '#FFE4E6', borderWidth: 1, borderColor: '#FECDD3' },
  filterText: { color: '#374151', fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#9F1239' },
  list: { padding: 12 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#6B7280', marginTop: 8 },
  card: { backgroundColor: '#fff', borderColor: '#E5E7EB', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardError: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  cardWarn: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  code: { color: '#991B1B', fontWeight: '900' },
  scope: { color: '#4B5563', fontWeight: '700' },
  time: { color: '#6B7280', fontSize: 12 },
  msg: { color: '#111827', marginTop: 4 },
  meta: { color: '#6B7280', marginTop: 6, fontSize: 12 },
});
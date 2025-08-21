import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { Languages, ToggleLeft, ToggleRight, ChevronLeft } from 'lucide-react-native';
import { useTranslate } from '@/contexts/TranslateContext';
import { supportedLocales, SupportedLocale } from '@/lib/i18n';

export default function SettingsScreen() {
  const { enabled, setEnabled, targetLang, setTargetLang } = useTranslate();
  const entries = useMemo(() => Object.entries(supportedLocales) as [SupportedLocale, string][], []);
  const [expanded, setExpanded] = useState<boolean>(true);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Languages color="#111827" size={20} />
            <Text style={styles.rowTitle}>Chat Translation</Text>
          </View>
          <TouchableOpacity
            onPress={() => setEnabled(!enabled)}
            style={styles.toggle}
            testID="toggle-translation"
          >
            {enabled ? <ToggleRight color="#10B981" size={28} /> : <ToggleLeft color="#9CA3AF" size={28} />}
          </TouchableOpacity>
        </View>
        {enabled ? (
          <View style={styles.picker}>
            {entries.map(([code, label]) => {
              const active = targetLang === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.langItem, active && styles.langItemActive]}
                  onPress={() => setTargetLang(code)}
                  testID={`lang-${code}`}
                >
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          Long-press the globe button in chat to open this screen.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  toggle: { padding: 6 },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  langItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langItemActive: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  langText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  langTextActive: { color: '#065F46' },
  tip: { marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', borderRadius: 10 },
  tipText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
});

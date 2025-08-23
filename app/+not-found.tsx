import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { ArrowLeft, Home } from 'lucide-react-native';
import { DIAG } from '@/lib/diagnostics';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    DIAG.push({ level: 'error', code: 'ROUTE_404', scope: 'router', message: 'Unmatched route', meta: { pathname } });
  }, [pathname]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card} testID="not-found">
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.subtitle}>The screen you’re looking for doesn’t exist.</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => router.back()} testID="go-back">
            <ArrowLeft size={16} color="#111827" />
            <Text style={[styles.btnText, styles.btnTextDark]}>Go back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => router.replace('/' as any)} testID="go-home">
            <Home size={16} color="#fff" />
            <Text style={styles.btnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 440, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  subtitle: { marginTop: 6, color: '#6B7280', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  primary: { backgroundColor: '#111827', borderColor: '#111827' },
  secondary: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  btnText: { color: '#fff', fontWeight: '800' },
  btnTextDark: { color: '#111827' },
});
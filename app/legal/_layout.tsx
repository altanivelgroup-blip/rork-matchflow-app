import React, { useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

function SafeBackButton() {
  const router = useRouter();
  const handlePress = useCallback(() => {
    try {
      const canGoBack = typeof (router as any)?.canGoBack === 'function' ? (router as any).canGoBack() : false;
      const webHasHistory = typeof window !== 'undefined' && typeof window.history !== 'undefined' ? window.history.length > 1 : false;
      if (canGoBack || webHasHistory) {
        router.back();
      } else {
        router.replace('/(tabs)/settings');
      }
    } catch {
      router.replace('/(tabs)/settings');
    }
  }, [router]);
  return (
    <TouchableOpacity onPress={handlePress} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back" testID="safe-back">
      <ChevronLeft color="#111827" size={20} />
      <Text style={styles.backText}>Back</Text>
    </TouchableOpacity>
  );
}

export default function LegalLayout() {
  return (
    <Stack screenOptions={{ headerLeft: () => <SafeBackButton /> }}>
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  backText: { color: '#111827', fontSize: 16, fontWeight: '700' },
});

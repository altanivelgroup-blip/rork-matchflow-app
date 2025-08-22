import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { ArrowLeft, Globe2, Filter, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { mockProfiles, type MockProfile } from '@/mocks/profiles';

export default function HexInternationalTest() {
  const [countries, setCountries] = useState<string[]>(['Brazil']);
  const [promoVisible, setPromoVisible] = useState<boolean>(true);

  const results = useMemo(() => {
    const lc = countries.map(c => c.toLowerCase());
    return mockProfiles.filter(p => {
      const city = (p.location?.city ?? '').toLowerCase();
      return lc.length ? lc.some(c => city.includes(c)) : true;
    });
  }, [countries]);

  const toggle = (c: string) => {
    setCountries(prev => {
      const set = new Set(prev);
      if (set.has(c)) set.delete(c); else set.add(c);
      return Array.from(set);
    });
  };

  const renderItem = ({ item }: { item: MockProfile }) => (
    <View style={styles.card} testID={`test-intl-${item.id}`}>
      <Image source={{ uri: item.image }} style={styles.avatar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}, {item.age}</Text>
        <Text style={styles.city}>{item.location?.city ?? 'Unknown'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back">
          <ArrowLeft size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>International Filters Test</Text>
      </View>

      {promoVisible && (
        <View style={styles.promo} testID="promo-banner-test">
          <Sparkles size={16} color="#F59E0B" />
          <Text style={styles.promoText}>First 90 days $5 — unlock AI Dream Dates!</Text>
          <TouchableOpacity onPress={() => setPromoVisible(false)} style={styles.promoClose} testID="dismiss-promo">
            <Text style={styles.promoCloseText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filters}>
        <Filter size={18} color="#6B7280" />
        <View style={styles.pills}>
          {['Brazil', 'Mexico', 'Colombia', 'China', 'Japan', 'USA'].map(c => {
            const active = countries.includes(c);
            return (
              <TouchableOpacity key={c} onPress={() => toggle(c)} style={[styles.pill, active && styles.pillActive]} testID={`pill-${c}`}>
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Results ({results.length})</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  promo: { margin: 16, backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderWidth: 1, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  promoText: { flex: 1, color: '#9A3412', fontWeight: '800' },
  promoClose: { backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  promoCloseText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#F9FAFB' },
  pillActive: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  pillText: { color: '#374151', fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#DC2626' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', paddingHorizontal: 16, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  avatar: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  name: { fontSize: 14, fontWeight: '800', color: '#111827' },
  city: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});

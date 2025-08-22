import React, { useMemo, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Globe2, Filter, Star, Shield, MapPin } from 'lucide-react-native';
import { useI18n } from '@/contexts/I18nContext';
import { mockProfiles, type MockProfile } from '@/mocks/profiles';
import { useQuery } from '@tanstack/react-query';
import { scoreProfilesAgainstUser } from '@/lib/aiMatch';
import { useAuth } from '@/contexts/AuthContext';

interface IntlFilter {
  verifiedOnly: boolean;
  countries: string[];
  minCompatibility: number;
}

export default function InternationalTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [filters, setFilters] = useState<IntlFilter>({ verifiedOnly: true, countries: ['Brazil','Mexico','Colombia','Japan','China'], minCompatibility: 70 });

  const aiQuery = useQuery<{ scores: { id: string; score: number }[] }>({
    queryKey: ['intl-ai', user?.email ?? 'guest'],
    queryFn: async () => {
      try {
        const res = await scoreProfilesAgainstUser(
          { id: user?.email ?? 'guest', name: user?.name ?? 'Guest' },
          mockProfiles.map(p => ({ id: p.id, name: p.name, age: p.age, bio: p.bio, interests: p.interests, location: p.location }))
        );
        return { scores: res.scores.map(s => ({ id: s.id, score: s.score })) };
      } catch {
        return { scores: mockProfiles.map(p => ({ id: p.id, score: p.aiCompatibilityScore ?? 70 })) };
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const scoreMap = useMemo(() => {
    const m: Record<string, number> = {};
    (aiQuery.data?.scores ?? []).forEach(s => m[s.id] = s.score);
    return m;
  }, [aiQuery.data]);

  const countriesLower = filters.countries.map(c => c.toLowerCase());

  const intlProfiles = useMemo(() => {
    return mockProfiles.filter(p => {
      const city = (p.location?.city ?? '').toLowerCase();
      const isIntl = countriesLower.length ? countriesLower.some(c => city.includes(c)) : true;
      const verified = !filters.verifiedOnly || (p.faceScoreFromVerification && p.faceScoreFromVerification > 0.8);
      const score = scoreMap[p.id] ?? 0;
      return isIntl && verified && score >= filters.minCompatibility;
    }).sort((a, b) => (scoreMap[b.id] ?? 0) - (scoreMap[a.id] ?? 0));
  }, [filters, scoreMap]);

  const renderItem = ({ item }: { item: MockProfile }) => {
    const score = Math.round(scoreMap[item.id] ?? item.aiCompatibilityScore ?? 0);
    return (
      <View style={styles.card} testID={`intl-card-${item.id}`}>
        <Image source={{ uri: item.image }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}, {item.age}</Text>
          <View style={styles.row}>
            <View style={styles.badge}><Star size={12} color="#F59E0B" /><Text style={styles.badgeText}>{score}%</Text></View>
            {item.faceScoreFromVerification && item.faceScoreFromVerification > 0.8 && (
              <View style={[styles.badge, styles.badgeBlue]}><Shield size={12} color="#2563EB" /><Text style={[styles.badgeText, { color: '#2563EB' }]}>Verified</Text></View>
            )}
          </View>
          {item.distanceFromUser != null && (
            <View style={[styles.badge, styles.badgeDark]}>
              <MapPin size={12} color="#fff" />
              <Text style={[styles.badgeText, { color: '#fff' }]}>{item.distanceFromUser < 500 ? `${item.distanceFromUser} mi` : '500+ mi'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.promo} testID="promo-banner">
        <Text style={styles.promoHeadline}>{t('international.promoHeadline')}</Text>
        <TouchableOpacity style={styles.promoCta} testID="promo-cta">
          <Text style={styles.promoCtaText}>{t('international.promoCta')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersBar}>
        <Filter size={18} color="#6B7280" />
        <View style={styles.pills}>
          {['Brazil','Mexico','Colombia','Japan','China','USA'].map((c) => {
            const active = filters.countries.includes(c);
            return (
              <TouchableOpacity
                key={c}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setFilters(prev => {
                  const set = new Set(prev.countries);
                  if (set.has(c)) set.delete(c); else set.add(c);
                  return { ...prev, countries: Array.from(set) };
                })}
                testID={`intl-pill-${c}`}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {aiQuery.isLoading ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={intlProfiles}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  promo: {
    backgroundColor: '#111827',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoHeadline: { color: '#FDE68A', fontSize: 14, fontWeight: '800' },
  promoCta: { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#EF4444' },
  promoCtaText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  filtersBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#0B1220', borderBottomWidth: 1, borderBottomColor: '#111827' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 8, flex: 1 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#334155', backgroundColor: '#0F172A' },
  pillActive: { borderColor: '#EF4444', backgroundColor: '#1F2937' },
  pillText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: '#FCA5A5' },
  card: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1F2937' },
  avatar: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  name: { color: '#F9FAFB', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' },
  badgeBlue: { backgroundColor: '#DBEAFE', borderColor: '#BFDBFE' },
  badgeDark: { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(0,0,0,0.6)' },
  badgeText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
});

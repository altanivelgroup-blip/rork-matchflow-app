import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Languages, ToggleLeft, ToggleRight, Crown, WifiOff, RefreshCw, CalendarX2, CreditCard, Globe } from 'lucide-react-native';
import { useTranslate } from '@/contexts/TranslateContext';
import { supportedLocales, SupportedLocale } from '@/lib/i18n';
import { useMembership } from '@/contexts/MembershipContext';
import { openBillingPortal } from '@/lib/payments';
import { useI18n } from '@/contexts/I18nContext';
import { backend } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';

function MembershipSection() {
  const { tier, setTier, limits, subscription, cancel, restore, refresh } = useMembership();
  const router = useRouter();
  const statusText = (() => {
    if (subscription.status === 'active') return `Active • Renews ${subscription.renewsAtISO ? new Date(subscription.renewsAtISO).toDateString() : ''}`;
    if (subscription.status === 'expired') return 'Expired — downgraded to Free';
    if (subscription.status === 'canceled') return 'Canceled — access until end of period';
    return 'Free plan';
  })();
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>Current plan: {tier === 'free' ? 'Free/Basic' : 'Plus'}</Text>
      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>{statusText}</Text>
      <View style={{ gap: 8 }}>
        <PlanRow
          title="Free/Basic"
          subtitle="50 swipes/day • 3 photos • Ads • No AI ordering"
          active={tier === 'free'}
          onPress={async () => { await setTier('free'); }}
        />
        <PlanRow
          title="Plus"
          subtitle="Unlimited swipes • Up to 12 photos • No ads • AI recommendations"
          active={tier === 'plus'}
          onPress={() => {
            try {
              router.push('/checkout');
            } catch (e) {
              console.log('[Settings] navigate checkout error', e);
            }
          }}
        />
      </View>
      <View style={styles.subActions}>
        <TouchableOpacity onPress={refresh} style={styles.subBtn} testID="sub-refresh">
          <RefreshCw color="#111827" size={14} />
          <Text style={styles.subBtnText}>Refresh status</Text>
        </TouchableOpacity>
        {tier === 'plus' ? (
          <>
            <TouchableOpacity onPress={cancel} style={[styles.subBtn, styles.warnBtn]} testID="sub-cancel">
              <CalendarX2 color="#B91C1C" size={14} />
              <Text style={[styles.subBtnText, { color: '#B91C1C' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await openBillingPortal();
                } catch (e) {
                  console.log('[Settings] billing portal error', e);
                  Alert.alert('Billing', 'Unable to open billing portal.');
                }
              }}
              style={styles.subBtn}
              testID="sub-manage"
            >
              <CreditCard color="#111827" size={14} />
              <Text style={styles.subBtnText}>Manage billing</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={restore} style={styles.subBtn} testID="sub-restore">
            <Crown color="#F59E0B" size={14} />
            <Text style={styles.subBtnText}>Restore Premium</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function PlanRow({ title, subtitle, active, onPress }: { title: string; subtitle: string; active: boolean; onPress: () => void; }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.planRow, active && styles.planActive]} testID={`plan-${title}`}>
      <Text style={[styles.planTitle, active && styles.planTitleActive]}>{title}</Text>
      <Text style={[styles.planSubtitle, active && styles.planSubtitleActive]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { enabled, setEnabled, targetLang, setTargetLang } = useTranslate();
  const { locale, setLocale } = useI18n();
  const { user } = useAuth();
  const uid = user?.email ?? 'guest';
  const entries = useMemo(() => Object.entries(supportedLocales) as [SupportedLocale, string][], []);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [offline, setOffline] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
      setOffline(Boolean(nav && nav.onLine === false));
      const on = () => setOffline(false);
      const off = () => setOffline(true);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      return () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await backend.fetchUserSettings(uid);
        if (cancelled || !mountedRef.current || !s) return;
        if (s.preferredLanguage && (Object.keys(supportedLocales) as SupportedLocale[]).includes(s.preferredLanguage as SupportedLocale)) {
          setLocale(s.preferredLanguage as SupportedLocale);
        }
        if (s.translateTarget && (Object.keys(supportedLocales) as SupportedLocale[]).includes(s.translateTarget as SupportedLocale)) {
          setTargetLang(s.translateTarget as SupportedLocale);
        }
        if (typeof s.translateEnabled === 'boolean') {
          setEnabled(s.translateEnabled);
        }
      } catch (e) {
        console.log('[Settings] load user settings error', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    const persist = async () => {
      try {
        await backend.saveUserSettings(uid, { preferredLanguage: locale, translateTarget: targetLang, translateEnabled: enabled });
        console.log('[Settings] saved settings to backend');
      } catch (e) {
        console.log('[Settings] save settings error', e);
      }
    };
    if (mountedRef.current) persist();
  }, [locale, targetLang, enabled, uid]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />

      {offline ? (
        <View style={styles.offlineBar} testID="offline-bar">
          <WifiOff color="#991B1B" size={16} />
          <Text style={styles.offlineText}>Offline — changes will sync when you're back online.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Globe color="#111827" size={20} />
            <Text style={styles.rowTitle}>App Language</Text>
          </View>
        </View>
        <View style={styles.picker}>
          {entries.map(([code, label]) => {
            const active = locale === code;
            const flag = code === 'en' ? '🇺🇸' : code === 'es' ? '🇪🇸' : code === 'ja' ? '🇯🇵' : '🇨🇳';
            return (
              <TouchableOpacity
                key={`app-${code}`}
                style={[styles.langItem, active && styles.langItemActive]}
                onPress={() => setLocale(code)}
                testID={`app-lang-${code}`}
              >
                <Text style={[styles.langText, active && styles.langTextActive]}>
                  {flag} {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

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

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Crown color="#F59E0B" size={20} />
            <Text style={styles.rowTitle}>Membership</Text>
          </View>
        </View>
        <MembershipSection />
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
  planRow: { padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F9FAFB' },
  planActive: { borderColor: '#6EE7B7', backgroundColor: '#ECFDF5' },
  planTitle: { fontSize: 14, color: '#111827', fontWeight: '800' },
  planTitleActive: { color: '#065F46' },
  planSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  planSubtitleActive: { color: '#047857' },
  tipText: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  subActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  subBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  subBtnText: { fontSize: 12, color: '#111827', fontWeight: '700' },
  warnBtn: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  offlineBar: { margin: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 10, borderRadius: 10 },
  offlineText: { color: '#991B1B', fontSize: 12, fontWeight: '800', flex: 1 },
});

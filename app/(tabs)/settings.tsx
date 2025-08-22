import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAnalytics } from '@/contexts/AnalyticsContext';
import { Languages, ToggleLeft, ToggleRight, Crown, WifiOff, RefreshCw, CalendarX2, CreditCard, Globe, Webcam, Image as ImageIcon, Shuffle, Sparkles, Shield, ChevronRight, WalletCards, Bell, FileText } from 'lucide-react-native';
import { useTranslate } from '@/contexts/TranslateContext';
import { supportedLocales, SupportedLocale } from '@/lib/i18n';
import { useMembership } from '@/contexts/MembershipContext';
import { openBillingPortal } from '@/lib/payments';
import { useI18n } from '@/contexts/I18nContext';
import { showToast } from '@/lib/toast';
import { backend, VerificationModePref, CaptureChoice, PreferredGateway } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

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
  const router = useRouter();
  const uid = user?.email ?? 'guest';
  const analytics = useAnalytics();
  const entries = useMemo(() => Object.entries(supportedLocales) as [SupportedLocale, string][], []);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [offline, setOffline] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);
  const [verificationMode, setVerificationMode] = useState<VerificationModePref>('auto');
  const [captureChoice, setCaptureChoice] = useState<CaptureChoice>('static');
  const [matchAnimationsEnabled, setMatchAnimationsEnabled] = useState<boolean>(true);
  const [preferredGateway, setPreferredGateway] = useState<PreferredGateway>('paypal');

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
        if (typeof s.matchAnimationsEnabled === 'boolean') {
          setMatchAnimationsEnabled(s.matchAnimationsEnabled);
        }
        if (s.preferredGateway === 'paypal' || s.preferredGateway === 'stripe') {
          setPreferredGateway(s.preferredGateway);
        }
        if (s.verificationMode === 'auto' || s.verificationMode === 'manual' || s.verificationMode === 'both') {
          setVerificationMode(s.verificationMode);
        }
        if (s.captureChoice === 'live' || s.captureChoice === 'static') {
          setCaptureChoice(s.captureChoice);
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
        await backend.saveUserSettings(uid, { preferredLanguage: locale, translateTarget: targetLang, translateEnabled: enabled, verificationMode, captureChoice, matchAnimationsEnabled, preferredGateway });
        console.log('[Settings] saved settings to backend');
      } catch (e) {
        console.log('[Settings] save settings error', e);
      }
    };
    if (mountedRef.current) persist();
  }, [locale, targetLang, enabled, uid, verificationMode, captureChoice, matchAnimationsEnabled, preferredGateway]);

  const notif = useNotifications();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: useI18n().t('profile.settings') ?? 'Settings' }} />

      {offline ? (
        <View style={styles.offlineBar} testID="offline-bar">
          <WifiOff color="#991B1B" size={16} />
          <Text style={styles.offlineText}>Offline — changes will sync when you're back online.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Bell color="#111827" size={20} />
            <Text style={styles.rowTitle}>Notifications</Text>
          </View>
          <TouchableOpacity onPress={async () => { await notif.requestPermission(); await analytics.track('promo_applied', { source: 'settings_notif_permission' }); }} style={styles.toggle} testID="notif-permission">
            {notif.permissionStatus === 'granted' ? <ToggleRight color="#10B981" size={28} /> : <ToggleLeft color="#9CA3AF" size={28} />}
          </TouchableOpacity>
        </View>
        <View style={[styles.picker, { alignItems: 'center' }]}
          testID="notif-categories">
          {(['mutualMatch','newChat','dreamDate','dailyReminder'] as const).map(cat => {
            const active = notif.prefs.categories[cat];
            return (
              <TouchableOpacity key={`cat-${cat}`} onPress={() => notif.setPrefs({ categories: { [cat]: !active } as any })} style={[styles.langItem, active && styles.langItemActive]} testID={`notif-${cat}`}>
                <Text style={[styles.langText, active && styles.langTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={async () => { await notif.sendLocal({ category: 'newChat', title: 'MatchFlow', body: useI18n().t('notifications.previewPing') ?? 'Test notification sent' }); }} style={[styles.langItem, { backgroundColor: '#EEF2FF', borderColor: '#E0E7FF' }]} testID="notif-test">
            <Text style={[styles.langText, { color: '#3730A3' }]}>Send Test</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={notif.scheduleDailyReminders} style={styles.langItem} testID="notif-schedule">
            <Text style={styles.langText}>Schedule Daily</Text>
          </TouchableOpacity>
        </View>
      </View>

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
                onPress={() => { setLocale(code); const name = (supportedLocales as Record<SupportedLocale, string>)[code]; showToast(`${useI18n().t('common.switchedTo') ?? 'Switched to'} ${name}!`); }}
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
            <Shuffle color="#111827" size={20} />
            <Text style={styles.rowTitle}>Verification Mode</Text>
          </View>
        </View>
        <View style={styles.picker}>
          {([
            ['auto', 'Auto-switch only'],
            ['manual', 'Manual only'],
            ['both', 'Auto + Manual override'],
          ] as Array<[VerificationModePref, string]>).map(([key, label]) => {
            const active = verificationMode === key;
            return (
              <TouchableOpacity
                key={`verif-${key}`}
                style={[styles.langItem, active && styles.langItemActive]}
                onPress={() => setVerificationMode(key)}
                testID={`verification-mode-${key}`}
              >
                <Text style={[styles.langText, active && styles.langTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Webcam color="#111827" size={20} />
            <Text style={styles.rowTitle}>Capture Preference</Text>
          </View>
        </View>
        <View style={styles.picker}>
          {([
            ['live', 'Live Preview'],
            ['static', 'Static (snap then analyze)'],
          ] as Array<[CaptureChoice, string]>).map(([key, label]) => {
            const active = captureChoice === key;
            const disabled = Platform.OS === 'web' && key === 'live';
            return (
              <TouchableOpacity
                key={`capture-${key}`}
                style={[styles.langItem, active && styles.langItemActive, disabled && styles.itemDisabled]}
                onPress={() => !disabled && setCaptureChoice(key)}
                disabled={disabled}
                testID={`capture-choice-${key}`}
              >
                <Text style={[styles.langText, active && styles.langTextActive, disabled && styles.textDisabled]}>
                  {key === 'live' ? '📹' : '🖼️'} {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {Platform.OS === 'web' ? (
          <Text style={styles.note}>Live preview is limited on web. We’ll auto-fallback to Static when unavailable.</Text>
        ) : null}
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
            <ImageIcon color="#111827" size={20} />
            <Text style={styles.rowTitle}>Match Celebrations</Text>
          </View>
          <TouchableOpacity
            onPress={() => setMatchAnimationsEnabled(!matchAnimationsEnabled)}
            style={styles.toggle}
            testID="toggle-match-animations"
          >
            {matchAnimationsEnabled ? <ToggleRight color="#10B981" size={28} /> : <ToggleLeft color="#9CA3AF" size={28} />}
          </TouchableOpacity>
        </View>
        <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 12 }}>Show confetti/hearts when you have a mutual match. Useful to disable for motion sensitivity.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <WalletCards color="#111827" size={20} />
            <Text style={styles.rowTitle}>Payment Gateway</Text>
          </View>
        </View>
        <View style={styles.picker}>
          {(['paypal','stripe'] as PreferredGateway[]).map(gw => {
            const active = preferredGateway === gw;
            return (
              <TouchableOpacity
                key={`gw-${gw}`}
                style={[styles.langItem, active && styles.langItemActive]}
                onPress={() => setPreferredGateway(gw)}
                testID={`gateway-${gw}`}
              >
                <Text style={[styles.langText, active && styles.langTextActive]}>{gw === 'paypal' ? 'PayPal (Sandbox)' : 'Stripe (Test)'}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.note}>You can change gateways later. PayPal is default for fastest setup.</Text>
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

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            try {
              router.push('/legal/privacy');
            } catch (e) {
              console.log('[Settings] navigate privacy error', e);
            }
          }}
          testID="open-privacy-from-settings"
        >
          <View style={styles.rowLeft}>
            <Shield color="#10B981" size={20} />
            <Text style={styles.rowTitle}>Privacy Policy</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.row, { marginTop: 12 }]}
          onPress={() => {
            try {
              router.push('/legal/terms');
            } catch (e) {
              console.log('[Settings] navigate terms error', e);
            }
          }}
          testID="open-terms-from-settings"
        >
          <View style={styles.rowLeft}>
            <FileText color="#111827" size={20} />
            <Text style={styles.rowTitle}>Terms of Service</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
        <Text style={styles.note}>Read our policies. A web version is available for sharing.</Text>
      </View>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            try {
              router.push('/verify-test');
            } catch (e) {
              console.log('[Settings] navigate verify test error', e);
            }
          }}
          testID="verify-test-link"
        >
          <View style={styles.rowLeft}>
            <Shield color="#10B981" size={20} />
            <Text style={styles.rowTitle}>Verification Test</Text>
          </View>
          <ChevronRight color="#9CA3AF" size={20} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.row}
          onPress={() => {
            try {
              router.push('/dream-date-test');
            } catch (e) {
              console.log('[Settings] navigate dream date test error', e);
            }
          }}
          testID="dream-date-test-link"
        >
          <View style={styles.rowLeft}>
            <Sparkles color="#8B5CF6" size={20} />
            <Text style={styles.rowTitle}>Dream Date Test</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.note}>Test the AI Dream Date Simulator functionality</Text>
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
  itemDisabled: { opacity: 0.5 },
  textDisabled: { color: '#9CA3AF' },
  note: { marginTop: 8, color: '#6B7280', fontSize: 12 },
});

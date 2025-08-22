import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, Crown, DollarSign, Globe, ShieldCheck, X } from 'lucide-react-native';
import { startCheckout } from '@/lib/payments';
import { useMembership } from '@/contexts/MembershipContext';
import { useI18n } from '@/contexts/I18nContext';
import { backend, PreferredGateway } from '@/lib/backend';

export default function CheckoutScreen() {
  const router = useRouter();
  const { setTier, refresh } = useMembership();
  const [promo, setPromo] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<boolean>(false);
  const { t } = useI18n();
  const [gateway, setGateway] = useState<PreferredGateway>('paypal');

  const currency = 'USD';
  const priceCents = 999;
  const price = useMemo(() => (priceCents / 100).toFixed(2), [priceCents]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await backend.fetchUserSettings('guest');
        if (!cancelled && s?.preferredGateway) setGateway(s.preferredGateway);
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="checkout-back">
          <ArrowLeft color="#111827" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upgrade to Premium</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.planRow}>
          <View style={styles.planTag}><Crown color="#F59E0B" size={16} /><Text style={styles.planTagText}>Premium</Text></View>
          <Text style={styles.price}>${price}/mo</Text>
        </View>
        <View style={styles.compare}>
          <View style={[styles.col, styles.freeCol]}>
            <Text style={styles.colHeader}>Free</Text>
            <Text style={styles.colLine}>• 50 swipes/day</Text>
            <Text style={styles.colLine}>• Ads</Text>
            <Text style={styles.colLine}>• 3 photos</Text>
            <Text style={styles.colLine}>• No AI ordering</Text>
          </View>
          <View style={[styles.col, styles.premiumCol]}>
            <Text style={styles.colHeader}>Premium</Text>
            <Text style={styles.colLine}>• Unlimited swipes</Text>
            <Text style={styles.colLine}>• Ad-free</Text>
            <Text style={styles.colLine}>• Unlimited media</Text>
            <Text style={styles.colLine}>• AI match + Translator</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBar} testID="checkout-error">
            <X color="#B91C1C" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.promoRow}>
          <TextInput
            value={promo}
            onChangeText={setPromo}
            placeholder="Promo code"
            style={styles.input}
            autoCapitalize="characters"
            testID="checkout-promo"
          />
          <TouchableOpacity
            style={styles.payBtn}
            disabled={busy}
            onPress={async () => {
              setError(undefined);
              setBusy(true);
              try {
                const res = await startCheckout({ planId: 'premium_monthly', currency, amountCents: priceCents, promoCode: promo || undefined, gateway, mode: 'subscription' });
                if (res.success) {
                  await refresh();
                  await setTier('plus');
                  setSuccess(true);
                  setTimeout(() => {
                    router.back();
                  }, 1200);
                } else {
                  setError(res.message ?? 'Payment declined — try another method.');
                }
              } catch (e) {
                setError('No internet — try again later');
              } finally {
                setBusy(false);
              }
            }}
            testID="checkout-pay"
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>Confirm with {gateway === 'paypal' ? 'PayPal' : 'Stripe'}</Text>}
          </TouchableOpacity>
        </View>

        {success ? (
          <View style={styles.successToast} testID="checkout-success">
            <CheckCircle2 color="#10B981" size={18} />
            <Text style={styles.successText}>Welcome to Premium—enjoy unlimited matches!</Text>
          </View>
        ) : null}

        <View style={styles.secureRow}>
          <ShieldCheck color="#10B981" size={16} />
          <Text style={styles.secureText}>Cards, Apple Pay, and Google Pay handled by Stripe.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  card: { margin: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 16 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planTag: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  planTagText: { color: '#92400E', fontSize: 12, fontWeight: '900' },
  price: { fontSize: 18, fontWeight: '900', color: '#111827' },
  compare: { flexDirection: 'row', gap: 10, marginTop: 12 },
  col: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1 },
  freeCol: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  premiumCol: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  colHeader: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 6 },
  colLine: { fontSize: 12, color: '#374151' },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14 },
  payBtn: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#059669' },
  payText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 10, borderRadius: 10, marginTop: 12 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '800', flex: 1 },
  successToast: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', padding: 10, borderRadius: 10 },
  successText: { color: '#065F46', fontSize: 12, fontWeight: '900', flex: 1 },
  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  secureText: { color: '#6B7280', fontSize: 12, fontWeight: '600', flex: 1 },
});

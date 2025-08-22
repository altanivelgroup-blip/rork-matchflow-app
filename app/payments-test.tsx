import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { CheckCircle2, CreditCard, DollarSign, ArrowLeft, X } from 'lucide-react-native';
import { startCheckout, openBillingPortal } from '@/lib/payments';
import { useMembership } from '@/contexts/MembershipContext';

export default function PaymentsTestScreen() {
  const router = useRouter();
  const { setTier, refresh, cancel, restore, subscription } = useMembership();
  const [promo, setPromo] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<string | undefined>(undefined);

  const priceCents = 999;
  const price = useMemo(() => (priceCents / 100).toFixed(2), [priceCents]);

  const run = async (mode: 'subscription' | 'one_time') => {
    setError(undefined);
    setSuccess(undefined);
    setBusy(true);
    try {
      const res = await startCheckout({ planId: mode === 'subscription' ? 'premium_monthly' : 'one_time_donation', currency: 'USD', amountCents: mode === 'subscription' ? priceCents : 500, promoCode: promo || undefined, mode });
      if (res.success) {
        await refresh();
        if (mode === 'subscription') await setTier('plus');
        setSuccess(mode === 'subscription' ? 'Premium activated (sandbox)!' : 'One-time test payment started');
      } else {
        setError(res.message ?? 'Payment failed in sandbox.');
      }
    } catch (e) {
      setError('No internet — try again later');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Payments Test' }} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="payments-back">
          <ArrowLeft color="#111827" size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payments Sandbox</Text>
        <View style={{ width: 20 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.caption}>Current subscription: {subscription.status}</Text>
        <View style={styles.row}> 
          <TextInput
            value={promo}
            onChangeText={setPromo}
            placeholder="Promo code (e.g., PROMO5, PROMO10)"
            style={styles.input}
            autoCapitalize="characters"
            testID="payments-promo"
          />
        </View>

        {error ? (
          <View style={styles.errorBar} testID="payments-error">
            <X color="#B91C1C" size={16} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {success ? (
          <View style={styles.successToast} testID="payments-success">
            <CheckCircle2 color="#10B981" size={18} />
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btn} disabled={busy} onPress={() => run('subscription')} testID="payments-subscribe">
            {busy ? <ActivityIndicator color="#fff" /> : (
              <>
                <CreditCard color="#fff" size={16} />
                <Text style={styles.btnText}>Start Premium $ {price}/mo</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.secondary]} disabled={busy} onPress={() => run('one_time')} testID="payments-onetime">
            <DollarSign color="#111827" size={16} />
            <Text style={[styles.btnText, styles.btnTextDark]}>One-time $5</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.btn, styles.warn]} disabled={busy} onPress={async () => { await cancel(); setSuccess('Canceled (simulated)'); }} testID="payments-cancel">
            <Text style={styles.btnText}>Simulate Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.secondary]} disabled={busy} onPress={async () => { await restore(); setSuccess('Restored (simulated)'); }} testID="payments-restore">
            <Text style={[styles.btnText, styles.btnTextDark]}>Simulate Restore</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.btn, styles.outline]} onPress={openBillingPortal} testID="payments-portal">
          <Text style={[styles.btnText, styles.btnTextDark]}>Open Billing Portal</Text>
        </TouchableOpacity>
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
  caption: { color: '#6B7280', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#059669' },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  btnTextDark: { color: '#111827' },
  secondary: { backgroundColor: '#F3F4F6', borderColor: '#E5E7EB' },
  warn: { backgroundColor: '#F43F5E', borderColor: '#FB7185' },
  outline: { backgroundColor: '#fff', borderColor: '#E5E7EB' },
  errorBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 10, borderRadius: 10, marginTop: 12 },
  errorText: { color: '#991B1B', fontSize: 12, fontWeight: '800', flex: 1 },
  successToast: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', padding: 10, borderRadius: 10 },
  successText: { color: '#065F46', fontSize: 12, fontWeight: '900', flex: 1 },
});

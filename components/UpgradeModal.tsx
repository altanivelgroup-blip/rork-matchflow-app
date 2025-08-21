import React, { useCallback, useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { Crown, ShieldCheck, X, AlertTriangle, CheckCircle2 } from 'lucide-react-native';
import { useMembership } from '@/contexts/MembershipContext';
import { startStripeCheckoutWithOptions } from '@/lib/payments';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

const currencySymbol: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };

export default function UpgradeModal({ visible, onClose, testID }: UpgradeModalProps) {
  const { setTier, refresh } = useMembership();
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [promo, setPromo] = useState<string>('');
  const [confirmed, setConfirmed] = useState<boolean>(false);

  const region = Localization.region ?? 'US';
  const currency = useMemo(() => {
    const eu = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES'];
    if (region === 'GB') return 'GBP';
    if (eu.includes(region)) return 'EUR';
    return 'USD';
  }, [region]);
  const priceCents = 999;
  const priceLabel = useMemo(() => `${currencySymbol[currency] ?? ''}${(priceCents / 100).toFixed(2)}/mo`, [currency, priceCents]);

  const handleUpgrade = useCallback(async () => {
    console.log('[UpgradeModal] starting checkout');
    setError(undefined);
    setBusy(true);
    try {
      const result = await startStripeCheckoutWithOptions({ planId: 'premium_monthly', currency, amountCents: priceCents, promoCode: promo || undefined });
      if (result.success) {
        console.log('[UpgradeModal] checkout success');
        await refresh();
        await setTier('plus');
        setConfirmed(true);
        setTimeout(() => {
          setConfirmed(false);
          onClose();
        }, 1400);
      } else {
        console.log('[UpgradeModal] checkout failed', result.message);
        setError(result.message ?? 'Payment declined — try another card.');
      }
    } catch (e) {
      console.log('[UpgradeModal] checkout error', e);
      setError('Payment failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }, [currency, onClose, priceCents, promo, refresh, setTier]);

  const handleRestore = useCallback(async () => {
    console.log('[UpgradeModal] restore purchase (dev)');
    try {
      await setTier('plus');
      onClose();
    } catch (e) {
      console.log('[UpgradeModal] restore error', e);
    }
  }, [onClose, setTier]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet} testID={testID}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Crown color="#F59E0B" size={22} />
              <Text style={styles.title}>Premium • {priceLabel}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="upgrade-close">
              <X color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.compareBox}>
            <View style={[styles.planCol, styles.freeCol]}>
              <Text style={styles.planHeader}>Free</Text>
              <Text style={styles.line}>• 50 swipes/day</Text>
              <Text style={styles.line}>• Ads</Text>
              <Text style={styles.line}>• 3 photos</Text>
              <Text style={styles.line}>• No AI ordering</Text>
            </View>
            <View style={[styles.planCol, styles.plusCol]}>
              <Text style={styles.planHeader}>Premium</Text>
              <Text style={styles.line}>• Unlimited swipes</Text>
              <Text style={styles.line}>• Ad-free</Text>
              <Text style={styles.line}>• Unlimited media</Text>
              <Text style={styles.line}>• AI match + Translator</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.errorRow} testID="upgrade-error">
              <AlertTriangle color="#B91C1C" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.promoRow}>
            <TextInput
              value={promo}
              onChangeText={setPromo}
              placeholder="Promo code"
              style={styles.promoInput}
              autoCapitalize="characters"
              testID="promo-input"
            />
            <TouchableOpacity onPress={handleUpgrade} style={styles.cta} disabled={busy} testID="upgrade-cta">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Confirm Payment</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.safeNote}>
            <ShieldCheck color="#10B981" size={16} />
            <Text style={styles.safeNoteText}>Cards, Apple Pay, and Google Pay handled securely by Stripe.</Text>
          </View>
        </View>

        {confirmed ? (
          <View style={styles.confirmToast} testID="upgrade-confirm">
            <CheckCircle2 color="#10B981" size={18} />
            <Text style={styles.confirmText}>Welcome to Premium—enjoy unlimited matches!</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#111827' },
  closeBtn: { padding: 6 },
  perks: { gap: 8, marginVertical: 12 },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  perkText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  cta: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
    minWidth: 170,
  },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  restore: { alignItems: 'center', marginTop: 10, paddingVertical: 8 },
  restoreText: { color: '#6B7280', fontWeight: '700' },
  safeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  safeNoteText: { color: '#6B7280', fontSize: 12, fontWeight: '600', flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 8, borderRadius: 8 },
  errorText: { color: '#7F1D1D', fontSize: 12, fontWeight: '800', flex: 1 },
  compareBox: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  planCol: { flex: 1, padding: 10, borderWidth: 1, borderRadius: 12 },
  freeCol: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  plusCol: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  planHeader: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 6 },
  line: { fontSize: 12, color: '#374151' },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  promoInput: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'web' ? 8 : 10, fontSize: 14 },
  confirmToast: { position: 'absolute', bottom: 30, left: 16, right: 16, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { color: '#065F46', fontSize: 13, fontWeight: '800', flex: 1 },
});

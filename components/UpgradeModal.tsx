import React, { useCallback, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Crown, ShieldCheck, X, AlertTriangle } from 'lucide-react-native';
import { useMembership } from '@/contexts/MembershipContext';
import { startStripeCheckout } from '@/lib/payments';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export default function UpgradeModal({ visible, onClose, testID }: UpgradeModalProps) {
  const { setTier, refresh } = useMembership();
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const handleUpgrade = useCallback(async () => {
    console.log('[UpgradeModal] starting checkout');
    setError(undefined);
    setBusy(true);
    try {
      const result = await startStripeCheckout();
      if (result.success) {
        console.log('[UpgradeModal] checkout success');
        await refresh();
        await setTier('plus');
        onClose();
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
  }, [onClose, refresh, setTier]);

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
              <Text style={styles.title}>Go Premium • $9.99/mo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} testID="upgrade-close">
              <X color="#6B7280" size={20} />
            </TouchableOpacity>
          </View>

          <View style={styles.perks}>
            <Perk text="Unlimited swipes" />
            <Perk text="AI profile matching + Translator" />
            <Perk text="No ads" />
            <Perk text="Unlimited media uploads" />
            <Perk text="Priority visibility" />
          </View>

          {error ? (
            <View style={styles.errorRow} testID="upgrade-error">
              <AlertTriangle color="#B91C1C" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleUpgrade} style={styles.cta} disabled={busy} testID="upgrade-cta">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Upgrade to Premium</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} style={styles.restore} disabled={busy} testID="upgrade-restore">
            <Text style={styles.restoreText}>Restore purchase (dev)</Text>
          </TouchableOpacity>

          <View style={styles.safeNote}>
            <ShieldCheck color="#10B981" size={16} />
            <Text style={styles.safeNoteText}>Secure Stripe Checkout handles cards, Apple Pay, and Google Pay.</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Perk({ text }: { text: string }) {
  return (
    <View style={styles.perkRow}>
      <View style={styles.bullet} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
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
  },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  restore: { alignItems: 'center', marginTop: 10, paddingVertical: 8 },
  restoreText: { color: '#6B7280', fontWeight: '700' },
  safeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  safeNoteText: { color: '#6B7280', fontSize: 12, fontWeight: '600', flex: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 8, borderRadius: 8 },
  errorText: { color: '#7F1D1D', fontSize: 12, fontWeight: '800', flex: 1 },
});

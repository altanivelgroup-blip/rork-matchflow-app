import React, { useCallback } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Crown, ShieldCheck, X } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useMembership } from '@/contexts/MembershipContext';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  testID?: string;
}

export default function UpgradeModal({ visible, onClose, testID }: UpgradeModalProps) {
  const { setTier } = useMembership();

  const handleUpgrade = useCallback(async () => {
    try {
      const url = 'https://buy.stripe.com/test_1234567890?prefilled_email=premium@demo.app';
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.log('[UpgradeModal] open checkout error', e);
    }
  }, []);

  const handleRestore = useCallback(async () => {
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

          <TouchableOpacity onPress={handleUpgrade} style={styles.cta} testID="upgrade-cta">
            <Text style={styles.ctaText}>Upgrade to Premium</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRestore} style={styles.restore} testID="upgrade-restore">
            <Text style={styles.restoreText}>Restore purchase (dev)</Text>
          </TouchableOpacity>

          <View style={styles.safeNote}>
            <ShieldCheck color="#10B981" size={16} />
            <Text style={styles.safeNoteText}>Handled via Stripe Checkout in a secure browser. No payment info is stored on-device.</Text>
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
});

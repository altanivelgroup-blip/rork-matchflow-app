import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  visible: boolean;
  selectedLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LanguageSwitchConfirm({ visible, selectedLabel, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Language changed</Text>
          <Text style={styles.subtitle}>{`Language changed to ${selectedLabel} — app will refresh.`}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={[styles.btn, styles.secondary]} testID="lang-cancel">
              <Text style={[styles.btnText, styles.secondaryText]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} style={[styles.btn, styles.primary]} testID="lang-confirm">
              <Text style={[styles.btnText, styles.primaryText]}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const fontWeight700 = '700' as const;

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  title: { fontSize: 18, fontWeight: fontWeight700, color: '#111827' },
  subtitle: { marginTop: 6, color: '#374151' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  primary: { backgroundColor: '#111827' },
  primaryText: { color: '#fff', fontWeight: fontWeight700 },
  secondary: { backgroundColor: '#F3F4F6' },
  secondaryText: { color: '#111827', fontWeight: fontWeight700 },
  btnText: { fontSize: 14 },
});
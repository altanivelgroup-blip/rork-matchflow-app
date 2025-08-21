import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield } from 'lucide-react-native';

interface Props {
  text?: string;
  testID?: string;
}

export default function PrivacyNote({ text, testID }: Props) {
  const display = text ?? 'We use AI to verify photos for your safety, preventing fakes and catfishing.';
  return (
    <View style={styles.container} accessibilityRole="text" testID={testID ?? 'privacy-note'}>
      <View style={styles.iconWrap}>
        <Shield color="#2563EB" size={14} />
      </View>
      <Text style={styles.text}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  text: {
    flex: 1,
    color: '#1F2937',
    fontSize: 12,
  },
});
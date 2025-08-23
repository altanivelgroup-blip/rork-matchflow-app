import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import ConfettiBomb from '@/components/ConfettiBomb';

export default function ConfettiBombTest() {
  const [show, setShow] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Confetti Bomb Demo</Text>
        <Text style={styles.subtitle}>Tap the button to trigger the confetti bomb with a loud boom.</Text>
        <TouchableOpacity style={styles.button} onPress={() => setShow(true)} testID="btn-trigger-bomb">
          <Text style={styles.buttonText}>Trigger Confetti Bomb</Text>
        </TouchableOpacity>
      </View>
      <ConfettiBomb auto={show} intensity={1} volume={1} message="Boom! 🎉" onDone={() => setShow(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#A3AED0', fontSize: 14, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '800' },
});

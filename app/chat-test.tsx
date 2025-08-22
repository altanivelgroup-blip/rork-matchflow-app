import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { useChat } from '@/contexts/ChatContext';
import { useMatches } from '@/contexts/MatchContext';

interface Item { id: string; name: string }

export default function ChatTest() {
  const { simulateIncoming, setTyping } = useChat();
  const { matches } = useMatches();
  const [matchId, setMatchId] = useState<string>(matches[0]?.id ?? 'demo-1');
  const [message, setMessage] = useState<string>('Hola! ¿Cómo estás?');

  const data: Item[] = useMemo(() => (matches.length ? matches.map(m => ({ id: m.id, name: m.name })) : [
    { id: 'demo-1', name: 'Ava (Demo)' },
    { id: 'demo-2', name: 'Liam (Demo)' },
  ]), [matches]);

  const onSimulate = async () => {
    await simulateIncoming(matchId, message);
  };

  const onTyping = async () => {
    await setTyping(matchId, true);
    setTimeout(() => setTyping(matchId, false), 1500);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Chat Simulator' }} />

      <Text style={styles.label}>Select Match</Text>
      <FlatList
        data={data}
        horizontal
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setMatchId(item.id)}
            style={[styles.pill, matchId === item.id ? styles.pillActive : undefined]}
            testID={`match-${item.id}`}
          >
            <Text style={[styles.pillText, matchId === item.id ? styles.pillTextActive : undefined]}>{item.name}</Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
      />

      <Text style={styles.label}>Incoming Message</Text>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="Type simulated incoming text"
        placeholderTextColor="#999"
        testID="sim-input"
      />

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={onSimulate} testID="simulate-btn">
          <Text style={styles.buttonText}>Simulate Incoming</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={onTyping} testID="typing-btn">
          <Text style={[styles.buttonText, styles.secondaryText]}>Simulate Typing</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Open any chat at /chat/[matchId] using one of the IDs above to see updates live.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
  label: { marginTop: 16, marginBottom: 8, marginHorizontal: 16, fontSize: 14, fontWeight: '700', color: '#111827' },
  input: { marginHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#111827', borderColor: '#E5E7EB', borderWidth: 1 },
  row: { flexDirection: 'row', gap: 10, marginTop: 16, marginHorizontal: 16 },
  button: { flex: 1, backgroundColor: '#111827', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: '#E5E7EB' },
  secondaryText: { color: '#111827' },
  pill: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F3F4F6', borderRadius: 9999, borderWidth: 1, borderColor: '#E5E7EB' },
  pillActive: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  pillText: { color: '#111827', fontSize: 12 },
  pillTextActive: { color: '#1D4ED8', fontWeight: '700' },
  hint: { marginTop: 20, marginHorizontal: 16, fontSize: 12, color: '#6B7280' },
});

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Animated, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { backend } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { mockProfiles, type MockProfile } from '@/mocks/profiles';
import { MessageCircle, Sparkles } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import MatchCelebration from '@/components/MatchCelebration';
import { scoreProfilesAgainstUser, type AiUserProfileInput } from '@/lib/aiMatch';

const { width: screenWidth } = Dimensions.get('window');

export default function SwipeTest() {
  const { user } = useAuth();
  const uid = user?.email ?? 'guest';

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [matchModal, setMatchModal] = useState<{ visible: boolean; profile: MockProfile | null }>({ visible: false, profile: null });
  const [celebration, setCelebration] = useState<{ visible: boolean; intensity: number; theme: 'confetti' | 'hearts' | 'fireworks'; message: string }>({ visible: false, intensity: 0.7, theme: 'hearts', message: "Boom! It's a Match!" });
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);
  const position = useRef(new Animated.ValueXY()).current;

  const deck = useMemo<MockProfile[]>(() => mockProfiles.slice(0, 3), []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await backend.fetchUserSettings(uid);
        if (!cancelled && s && typeof s.matchAnimationsEnabled === 'boolean') {
          setAnimationsEnabled(s.matchAnimationsEnabled);
        }
      } catch (e) {
        console.log('[SwipeTest] load settings error', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid]);

  const resetCard = () => {
    setCurrentIndex((i) => Math.min(i + 1, deck.length - 1));
    position.setValue({ x: 0, y: 0 });
  };

  const simulateLeft = useCallback(async () => {
    const p = deck[currentIndex];
    if (!p) return;
    await backend.recordPass(uid, p.id);
    Animated.timing(position, { toValue: { x: -screenWidth, y: 0 }, duration: 180, useNativeDriver: false }).start(() => resetCard());
  }, [currentIndex, deck, position, uid]);

  const openCelebration = useCallback((score: number, name: string) => {
    const intensity = Math.max(0.3, Math.min(1, score / 100));
    const theme = score >= 80 ? 'fireworks' : score >= 60 ? 'hearts' : 'confetti';
    const msg = `Boom! It's a Match${name ? ` with ${name}` : ''}!`;
    setCelebration({ visible: true, intensity, theme, message: msg });
    setTimeout(() => setCelebration((c) => ({ ...c, visible: false })), 2000 + Math.floor(800 * intensity));
  }, []);

  const simulateRight = useCallback(async () => {
    const p = deck[currentIndex];
    if (!p) return;
    const res = await backend.recordLike(uid, p.id);
    if (res.mutual) {
      try {
        const me: AiUserProfileInput = { id: uid, name: uid, age: 28, interests: ['Music', 'Travel', 'Food'], location: { lat: 37.7749, lon: -122.4194, city: 'San Francisco' } };
        const scored = await scoreProfilesAgainstUser(me, [{ id: p.id, name: p.name, age: p.age, interests: p.interests, location: p.location } as AiUserProfileInput]);
        const score = scored.scores[0]?.score ?? 65;
        if (animationsEnabled) openCelebration(score, p.name);
      } catch (e) {
        console.log('[SwipeTest] scoring error', e);
        if (animationsEnabled) openCelebration(65, p.name);
      }
      setMatchModal({ visible: true, profile: p });
    }
    Animated.timing(position, { toValue: { x: screenWidth, y: 0 }, duration: 180, useNativeDriver: false }).start(() => resetCard());
  }, [animationsEnabled, currentIndex, deck, openCelebration, position, uid]);

  const forceMutual = useCallback(async () => {
    const p = deck[currentIndex];
    if (!p) return;
    await backend.recordLike(p.id, uid);
    const res = await backend.recordLike(uid, p.id);
    if (res.mutual) {
      try {
        const me: AiUserProfileInput = { id: uid, name: uid, age: 28, interests: ['Music', 'Travel', 'Food'], location: { lat: 37.7749, lon: -122.4194, city: 'San Francisco' } };
        const scored = await scoreProfilesAgainstUser(me, [{ id: p.id, name: p.name, age: p.age, interests: p.interests, location: p.location } as AiUserProfileInput]);
        const score = scored.scores[0]?.score ?? 80;
        if (animationsEnabled) openCelebration(score, p.name);
      } catch (e) {
        console.log('[SwipeTest] scoring error', e);
        if (animationsEnabled) openCelebration(80, p.name);
      }
      setMatchModal({ visible: true, profile: p });
    }
  }, [animationsEnabled, currentIndex, deck, openCelebration, uid]);

  const p = deck[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Swipe Test' }} />
      <Text style={styles.title}>Swipe Logic Simulator</Text>
      <Text style={styles.sub}>User: {uid}</Text>

      {p ? (
        <View style={styles.card} testID="test-card">
          <Image source={{ uri: p.image }} style={styles.cardImage} />
          <View style={styles.cardInfo}>
            <Text style={styles.cardName}>{p.name}, {p.age}</Text>
            <Text style={styles.cardBio} numberOfLines={2}>{p.bio}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.done}>
          <Text style={styles.doneText}>End of test deck</Text>
        </View>
      )}

      <View style={styles.row}>
        <TouchableOpacity onPress={simulateLeft} style={[styles.btn, styles.pass]} testID="simulate-left">
          <Text style={styles.btnText}>Simulate Left</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={simulateRight} style={[styles.btn, styles.like]} testID="simulate-right">
          <Text style={styles.btnText}>Simulate Right</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity onPress={forceMutual} style={[styles.btn, styles.mutual]} testID="force-mutual">
          <Text style={styles.btnText}>Force Mutual Match</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCurrentIndex((i) => Math.max(i - 1, 0))} style={[styles.btn, styles.reset]} testID="prev-card">
          <Text style={styles.btnText}>Prev</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <TouchableOpacity
          onPress={() => setCelebration({ visible: true, intensity: 0.5, theme: 'confetti', message: "Test: Boom! It's a Match!" })}
          style={[styles.btn, { backgroundColor: '#8B5CF6' }]}
          testID="play-celebration-50"
        >
          <Sparkles color="#fff" size={16} />
          <Text style={[styles.btnText, { marginLeft: 8 }]}>Play 50%</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCelebration({ visible: true, intensity: 0.95, theme: 'fireworks', message: "Test: Boom! It's a Match!" })}
          style={[styles.btn, { backgroundColor: '#F59E0B' }]}
          testID="play-celebration-95"
        >
          <Sparkles color="#fff" size={16} />
          <Text style={[styles.btnText, { marginLeft: 8 }]}>Play 95%</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent visible={matchModal.visible} animationType="fade" onRequestClose={() => setMatchModal({ visible: false, profile: null })}>
        <View style={styles.modalBackdrop}>
          <View style={styles.matchCard} testID="match-modal-test">
            <Text style={styles.matchTitle}>It’s a match!</Text>
            {matchModal.profile ? (
              <View style={styles.matchRow}>
                <Image source={{ uri: matchModal.profile.image }} style={styles.matchAvatar} />
                <Text style={styles.matchName}>{matchModal.profile.name}</Text>
              </View>
            ) : null}
            <View style={styles.matchButtons}>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#111827', borderColor: '#1F2937' }]}
                onPress={() => setMatchModal({ visible: false, profile: null })}
                testID="keep-swiping-test"
              >
                <Text style={styles.ctaText}>Keep swiping</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctaButton, { backgroundColor: '#FF6B6B', borderColor: '#FCA5A5' }]}
                onPress={() => {
                  const id = matchModal.profile?.id;
                  setMatchModal({ visible: false, profile: null });
                  if (id) router.push(`/chat/${id}` as any);
                }}
                testID="open-chat-test"
              >
                <MessageCircle color="#fff" size={18} />
                <Text style={[styles.ctaText, { marginLeft: 8 }]}>Chat now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {animationsEnabled && (
        <MatchCelebration
          visible={celebration.visible}
          intensity={celebration.intensity}
          theme={celebration.theme}
          message={celebration.message}
          onDone={() => setCelebration((c) => ({ ...c, visible: false }))}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  sub: { marginTop: 4, color: '#6B7280', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '900' },
  pass: { backgroundColor: '#EF4444' },
  like: { backgroundColor: '#3B82F6' },
  mutual: { backgroundColor: '#10B981' },
  reset: { backgroundColor: '#6B7280' },
  card: { marginTop: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  cardImage: { width: '100%', height: 220 },
  cardInfo: { padding: 12 },
  cardName: { fontSize: 18, fontWeight: '900', color: '#111827' },
  cardBio: { marginTop: 4, color: '#4B5563', fontWeight: '600' },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#6B7280', fontWeight: '900' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  matchCard: { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  matchTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, alignSelf: 'center' },
  matchAvatar: { width: 56, height: 56, borderRadius: 28 },
  matchName: { fontSize: 18, fontWeight: '800', color: '#111827' },
  matchButtons: { flexDirection: 'row', gap: 10, marginTop: 18, justifyContent: 'center' },
  ctaButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  ctaText: { color: '#fff', fontWeight: '900', fontSize: 14 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View, Image } from 'react-native';
import { PROMO_GRAPHICS } from '@/constants/promoGraphics';
import * as Haptics from 'expo-haptics';
import { Audio, AVPlaybackStatusSuccess } from 'expo-av';

export type CelebrationTheme = 'confetti' | 'hearts' | 'fireworks';

export interface MatchCelebrationProps {
  visible: boolean;
  onDone?: () => void;
  intensity?: number;
  theme?: CelebrationTheme;
  message?: string;
  volume?: number;
  soundEnabled?: boolean;
  vibrate?: boolean;
  lottieUrl?: string;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  kind: 'dot' | 'heart' | 'firework';
  size: number;
}

const { width: W, height: H } = Dimensions.get('window');

const DEFAULT_FIREWORKS_JSON = 'https://assets8.lottiefiles.com/packages/lf20_pzud6sat.json';
const ALT_FIREWORKS_JSON = 'https://assets8.lottiefiles.com/packages/lf20_kyi6f3u3.json';
const SOUND_BOOM = 'https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3';
const SOUND_POP = 'https://assets.mixkit.co/active_storage/sfx/2561/2561-preview.mp3';

export default function MatchCelebration({ visible, onDone, intensity = 1, theme = 'hearts', message = "Boom! It's a Match!", volume = 0.8, soundEnabled = true, vibrate = true, lottieUrl }: MatchCelebrationProps) {
  const count = Math.max(12, Math.floor(80 * Math.max(0, Math.min(1, intensity))));
  const duration = 900 + Math.floor(1200 * intensity);

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const kind: 'dot' | 'heart' | 'firework' = theme === 'hearts' ? 'heart' : theme === 'fireworks' ? 'firework' : 'dot';
      const size = kind === 'heart' ? 16 + Math.random() * 14 : kind === 'firework' ? 20 + Math.random() * 16 : 6 + Math.random() * 8;
      arr.push({
        x: new Animated.Value(W / 2),
        y: new Animated.Value(H / 2),
        scale: new Animated.Value(0.2 + Math.random() * 0.8),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(0.9),
        color: pickColor(theme),
        kind,
        size,
      });
    }
    return arr;
  }, [count, theme, visible]);

  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(20)).current;

  const soundRef = useRef<Audio.Sound | null>(null);
  const [lottieReady, setLottieReady] = useState<boolean>(false);

  useEffect(() => {
    return () => {
      try {
        if (soundRef.current) {
          soundRef.current.unloadAsync();
          soundRef.current = null;
        }
      } catch (e) {
        console.log('[MatchCelebration] unload sound error', e);
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const anims: Animated.CompositeAnimation[] = [];

    particles.forEach((p, idx) => {
      const angle = (Math.PI * 2 * idx) / particles.length + Math.random() * 0.6;
      const power = 120 + Math.random() * (Platform.OS === 'web' ? 140 : 200);
      const dx = Math.cos(angle) * power;
      const dy = Math.sin(angle) * power;

      const move = Animated.timing(p.x, { toValue: W / 2 + dx, duration, easing: Easing.out(Easing.quad), useNativeDriver: false });
      const moveY = Animated.timing(p.y, { toValue: H / 2 + dy, duration, easing: Easing.out(Easing.quad), useNativeDriver: false });
      const rot = Animated.timing(p.rotate, { toValue: Math.random() * 360, duration, easing: Easing.linear, useNativeDriver: false });
      const fade = Animated.timing(p.opacity, { toValue: 0, duration: duration + 300, easing: Easing.out(Easing.quad), useNativeDriver: false });
      const sc = Animated.timing(p.scale, { toValue: 0.8 + Math.random() * 0.6, duration: Math.min(800, Math.max(400, duration - 300)), easing: Easing.out(Easing.quad), useNativeDriver: false });

      anims.push(Animated.parallel([move, moveY, rot, fade, sc]));
    });

    const showLabel = Animated.parallel([
      Animated.timing(labelOpacity, { toValue: 1, duration: 240, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(labelY, { toValue: 0, duration: 320, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]);
    const hideLabel = Animated.parallel([
      Animated.timing(labelOpacity, { toValue: 0, duration: 260, delay: Math.max(600, duration - 200), easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(labelY, { toValue: -16, duration: 260, delay: Math.max(600, duration - 200), easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]);

    const startEverything = async () => {
      try {
        if (vibrate) {
          if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate?.(60);
        }
        if (soundEnabled) {
          if (Platform.OS !== 'web') {
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false });
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
            }
            const isHuge = intensity >= 0.9;
            const { sound } = await Audio.Sound.createAsync({ uri: isHuge ? SOUND_BOOM : SOUND_POP }, { volume: Math.max(0, Math.min(1, volume)), shouldPlay: true });
            soundRef.current = sound;
            sound.setOnPlaybackStatusUpdate((s) => {
              const st = s as AVPlaybackStatusSuccess;
              if (st.isLoaded && st.didJustFinish) {
                sound.unloadAsync().catch(() => {});
                soundRef.current = null;
              }
            });
          } else {
            try {
              const isHuge = intensity >= 0.9;
              const audio = createWebAudio(isHuge ? SOUND_BOOM : SOUND_POP);
              audio.volume = Math.max(0, Math.min(1, volume));
              audio.play().catch((e: unknown) => console.log('[MatchCelebration] web audio play err', e));
            } catch (err) {
              console.log('[MatchCelebration] web audio error', err);
            }
          }
        }
      } catch (e) {
        console.log('[MatchCelebration] startEverything error', e);
      }
    };

    startEverything();

    Animated.sequence([showLabel, Animated.parallel(anims), hideLabel]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  }, [visible, particles, duration, labelOpacity, labelY, onDone, vibrate, soundEnabled, volume, intensity]);

  if (!visible) return null;

  const scaled = 0.6 + intensity * 0.8;
  const jsonUrl = lottieUrl ?? (intensity >= 0.9 ? DEFAULT_FIREWORKS_JSON : ALT_FIREWORKS_JSON);

  return (
    <View pointerEvents="none" style={styles.overlay} testID="match-celebration">
      {null}

      {particles.map((p, i) => {
        const transform = [{ translateX: p.x }, { translateY: p.y }, { rotate: p.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }, { scale: p.scale }];
        const style = [styles.particle, { backgroundColor: p.kind === 'dot' ? p.color : 'transparent', width: p.size, height: p.size, opacity: p.opacity } as const];
        return (
          <Animated.View key={`p-${i}`} style={[StyleSheet.absoluteFillObject, { transform }]}> 
            {p.kind === 'heart' ? (
              <Text style={{ fontSize: p.size, color: p.color, lineHeight: p.size as number, textAlign: 'center' }}>❤</Text>
            ) : p.kind === 'firework' ? (
              <Text style={{ fontSize: p.size, lineHeight: p.size as number, textAlign: 'center' }}>✨</Text>
            ) : (
              <View style={[style as unknown as object, { borderRadius: p.size / 2 }]} />
            )}
          </Animated.View>
        );
      })}

      <Animated.View style={[styles.centerLabel, { opacity: labelOpacity, transform: [{ translateY: labelY }] }]}> 
        {theme === 'fireworks' && (
          <Image 
            source={{ uri: PROMO_GRAPHICS.matchCelebration.fireworks }} 
            style={styles.celebrationImage}
          />
        )}
        <Text style={styles.title} accessibilityRole="header">{message}</Text>
      </Animated.View>
    </View>
  );
}

function pickColor(theme: CelebrationTheme): string {
  if (theme === 'hearts') {
    const reds = ['#FF577F', '#FF6B6B', '#F43F5E', '#EF4444', '#FB7185'];
    return reds[Math.floor(Math.random() * reds.length)] as string;
  }
  if (theme === 'fireworks') {
    const brights = ['#22D3EE', '#F59E0B', '#84CC16', '#A78BFA', '#F472B6', '#FDE68A'];
    return brights[Math.floor(Math.random() * brights.length)] as string;
  }
  const confetti = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
  return confetti[Math.floor(Math.random() * confetti.length)] as string;
}

// Web audio helper
function createWebAudio(src: string) {
  if (Platform.OS === 'web' && typeof (window as any)?.Audio !== 'undefined') {
    return new (window as any).Audio(src);
  }
  throw new Error('Audio not supported');
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  particle: { backgroundColor: '#FF6B6B' },
  centerLabel: { position: 'absolute', top: H / 2 - 80, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(17,24,39,0.6)', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  celebrationImage: { width: 40, height: 40, marginBottom: 8, opacity: 0.8 },
  lottieBurst: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

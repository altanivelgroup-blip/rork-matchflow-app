import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View, Image } from 'react-native';
import { PROMO_GRAPHICS } from '@/constants/promoGraphics';
import * as Haptics from 'expo-haptics';

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
  gifUrl?: string;
  soundBoomUrl?: string;
  soundPopUrl?: string;
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
const SOUND_BOOM_MP3 = 'https://assets.mixkit.co/active_storage/sfx/2560/2560-preview.mp3';
const SOUND_POP_MP3 = 'https://assets.mixkit.co/active_storage/sfx/2561/2561-preview.mp3';
const SOUND_BOOM_WAV_FALLBACK = 'https://cdn.freesound.org/previews/235/235968_3984679-lq.wav';
const SOUND_POP_WAV_FALLBACK = 'https://cdn.freesound.org/previews/341/341695_6262555-lq.wav';

export default function MatchCelebration({ visible, onDone, intensity = 1, theme = 'fireworks', message = "It's a Match!", volume = 0.9, soundEnabled = true, vibrate = true, lottieUrl, gifUrl, soundBoomUrl, soundPopUrl }: MatchCelebrationProps) {
  const clampedIntensity = Math.max(0.05, Math.min(1, intensity));
  const count = Math.max(24, Math.floor(140 * clampedIntensity));
  const duration = 900 + Math.floor(1300 * clampedIntensity);

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const kind: 'dot' | 'heart' | 'firework' = theme === 'hearts' ? 'heart' : theme === 'fireworks' ? 'firework' : 'dot';
      const size = kind === 'heart' ? 16 + Math.random() * 18 : kind === 'firework' ? 16 + Math.random() * 22 : 6 + Math.random() * 10;
      arr.push({
        x: new Animated.Value(W / 2),
        y: new Animated.Value(H / 2),
        scale: new Animated.Value(0.2 + Math.random() * 0.8),
        rotate: new Animated.Value(0),
        opacity: new Animated.Value(0.95),
        color: pickColor(theme),
        kind,
        size,
      });
    }
    return arr;
  }, [count, theme, visible]);

  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(20)).current;

  const flashOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.8)).current;

  const soundRef = useRef<{ unloadAsync: () => Promise<void>; setOnPlaybackStatusUpdate: (fn: (s: any) => void) => void } | null>(null);

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
      const angle = (Math.PI * 2 * idx) / particles.length + Math.random() * 0.7;
      const power = 140 + Math.random() * (Platform.OS === 'web' ? 160 : 240) * clampedIntensity;
      const dx = Math.cos(angle) * power;
      const dy = Math.sin(angle) * power;

      const move = Animated.timing(p.x, { toValue: W / 2 + dx, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
      const moveY = Animated.timing(p.y, { toValue: H / 2 + dy, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false });
      const rot = Animated.timing(p.rotate, { toValue: Math.random() * 360, duration, easing: Easing.linear, useNativeDriver: false });
      const fade = Animated.timing(p.opacity, { toValue: 0, duration: duration + 400, easing: Easing.out(Easing.quad), useNativeDriver: false });
      const sc = Animated.timing(p.scale, { toValue: 0.9 + Math.random() * 0.8, duration: Math.min(1000, Math.max(500, duration - 200)), easing: Easing.out(Easing.quad), useNativeDriver: false });

      anims.push(Animated.parallel([move, moveY, rot, fade, sc]));
    });

    const showLabel = Animated.parallel([
      Animated.timing(labelOpacity, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(labelY, { toValue: 0, duration: 340, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]);
    const hideLabel = Animated.parallel([
      Animated.timing(labelOpacity, { toValue: 0, duration: 280, delay: Math.max(600, duration - 120), easing: Easing.in(Easing.quad), useNativeDriver: false }),
      Animated.timing(labelY, { toValue: -16, duration: 280, delay: Math.max(600, duration - 120), easing: Easing.in(Easing.quad), useNativeDriver: false }),
    ]);

    const startEverything = async () => {
      try {
        if (vibrate) {
          if (Platform.OS !== 'web') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) (navigator as any).vibrate?.(60);
        }
        if (soundEnabled) {
          if (Platform.OS !== 'web') {
            try {
              const { Audio } = await import('expo-av');
              await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false });
              if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
              }
              const isHuge = clampedIntensity >= 0.9;
              const boomUri = (soundBoomUrl ?? SOUND_BOOM_MP3 ?? SOUND_BOOM_WAV_FALLBACK);
              const initialStatus = { volume: Math.max(0, Math.min(1, volume)), shouldPlay: true } as const;
              const { sound: boom } = await Audio.Sound.createAsync({ uri: boomUri }, initialStatus);
              soundRef.current = boom as unknown as { unloadAsync: () => Promise<void>; setOnPlaybackStatusUpdate: (fn: (s: any) => void) => void };
              boom.setOnPlaybackStatusUpdate((s: any) => {
                if (s?.isLoaded && s?.didJustFinish) {
                  boom.unloadAsync().catch(() => {});
                  soundRef.current = null;
                }
              });
              if (isHuge) {
                setTimeout(async () => {
                  try {
                    const popUri = (soundPopUrl ?? SOUND_POP_MP3 ?? SOUND_POP_WAV_FALLBACK);
                    const { sound: pop } = await Audio.Sound.createAsync({ uri: popUri }, { volume: Math.max(0, Math.min(1, volume * 0.8)), shouldPlay: true });
                    pop.setOnPlaybackStatusUpdate((s: any) => {
                      if (s?.isLoaded && s?.didJustFinish) pop.unloadAsync().catch(() => {});
                    });
                  } catch (err) {
                    console.log('[MatchCelebration] pop sound error', err);
                  }
                }, 220);
              }
            } catch (nativeAudioErr) {
              console.log('[MatchCelebration] native audio init error', nativeAudioErr);
            }
          } else {
            try {
              const isHuge = clampedIntensity >= 0.9;
              const boom = createWebAudioWithFallback([soundBoomUrl, SOUND_BOOM_MP3, SOUND_BOOM_WAV_FALLBACK].filter(Boolean) as string[]);
              boom.volume = Math.max(0, Math.min(1, volume));
              void boom.play();
              if (isHuge) {
                setTimeout(() => {
                  try {
                    const pop = createWebAudioWithFallback([soundPopUrl, SOUND_POP_MP3, SOUND_POP_WAV_FALLBACK].filter(Boolean) as string[]);
                    pop.volume = Math.max(0, Math.min(1, volume * 0.8));
                    void pop.play();
                  } catch (er) {
                    console.log('[MatchCelebration] web pop sound error', er);
                  }
                }, 220);
              }
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

    flashOpacity.setValue(0);
    ringScale.setValue(0.6);
    ringOpacity.setValue(0.8);

    const shockwave = Animated.parallel([
      Animated.sequence([
        Animated.timing(flashOpacity, { toValue: 0.6, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        Animated.timing(flashOpacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]),
      Animated.timing(ringScale, { toValue: 2.2 + clampedIntensity * 1.4, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 820, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]);

    Animated.sequence([shockwave, showLabel, Animated.parallel(anims), hideLabel]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  }, [visible, particles, duration, labelOpacity, labelY, onDone, vibrate, soundEnabled, volume, clampedIntensity, flashOpacity, ringOpacity, ringScale, lottieUrl]);

  if (!visible) return null;

  const gifOverlay = gifUrl ?? (clampedIntensity >= 0.9
    ? 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif'
    : 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif');

  const burstWidth = W * Math.min(1, 0.85 + clampedIntensity * 0.7);
  const burstHeight = 360 + Math.floor(120 * clampedIntensity);

  return (
    <View pointerEvents="none" style={styles.overlay} testID="match-celebration">
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />
      <Animated.View style={[styles.ring, { top: H / 2 - 40, left: W / 2 - 40, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

      {gifOverlay ? (
        <Image source={{ uri: gifOverlay }} style={{ position: 'absolute', top: H / 2 - burstHeight / 2, width: burstWidth, height: burstHeight }} testID={Platform.OS === 'web' ? 'gif-fireworks-web' : 'gif-fireworks'} />
      ) : null}

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
    const brights = ['#22D3EE', '#F59E0B', '#84CC16', '#A78BFA', '#F472B6', '#FDE68A', '#38BDF8', '#F97316'];
    return brights[Math.floor(Math.random() * brights.length)] as string;
  }
  const confetti = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
  return confetti[Math.floor(Math.random() * confetti.length)] as string;
}

function getMimeFromUrl(url: string): string | undefined {
  const lower = url.toLowerCase();
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  return undefined;
}

function createWebAudioWithFallback(sources: string[]) {
  if (Platform.OS !== 'web' || typeof (window as any)?.Audio === 'undefined') {
    throw new Error('Audio not supported');
  }
  const audio = new (window as any).Audio();
  audio.preload = 'auto';
  (audio as any).crossOrigin = 'anonymous';

  let chosen: string | null = null;
  for (const src of sources) {
    if (!src) continue;
    const mime = getMimeFromUrl(src);
    if (!mime || audio.canPlayType(mime)) {
      chosen = src;
      break;
    }
  }
  if (!chosen && sources.length > 0) chosen = sources[0] as string;
  if (!chosen) throw new Error('No audio sources provided');

  audio.src = chosen;

  audio.onerror = () => {
    const idx = sources.indexOf(chosen as string);
    if (idx >= 0 && idx < sources.length - 1) {
      const next = sources[idx + 1] as string;
      const mime = getMimeFromUrl(next);
      if (!mime || audio.canPlayType(mime)) {
        audio.src = next;
        audio.load();
      }
    }
  };

  return audio as HTMLAudioElement;
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  particle: { backgroundColor: '#FF6B6B' },
  centerLabel: { position: 'absolute', top: H / 2 - 80, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(17,24,39,0.6)', alignItems: 'center' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  celebrationImage: { width: 40, height: 40, marginBottom: 8, opacity: 0.8 },
  lottieBurst: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff' },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
});

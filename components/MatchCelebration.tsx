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

export default function MatchCelebration({ visible, onDone, intensity = 1, theme = 'fireworks', message = "It's a Match!", volume = 0.9, soundEnabled = true, vibrate = true, lottieUrl }: MatchCelebrationProps) {
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

  const soundRef = useRef<Audio.Sound | null>(null);
  const [lottieData, setLottieData] = useState<object | null>(null);

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

    const url = lottieUrl ?? (clampedIntensity >= 0.9 ? DEFAULT_FIREWORKS_JSON : ALT_FIREWORKS_JSON);
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        setLottieData(json as object);
      })
      .catch((e) => {
        console.log('[MatchCelebration] lottie fetch error', e);
        setLottieData(null);
      });

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
            await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false });
            if (soundRef.current) {
              await soundRef.current.unloadAsync();
              soundRef.current = null;
            }
            const isHuge = clampedIntensity >= 0.9;
            const { sound: boom } = await Audio.Sound.createAsync({ uri: SOUND_BOOM }, { volume: Math.max(0, Math.min(1, volume)), shouldPlay: true });
            soundRef.current = boom;
            boom.setOnPlaybackStatusUpdate((s) => {
              const st = s as AVPlaybackStatusSuccess;
              if (st.isLoaded && st.didJustFinish) {
                boom.unloadAsync().catch(() => {});
                soundRef.current = null;
              }
            });
            if (isHuge) {
              setTimeout(async () => {
                try {
                  const { sound: pop } = await Audio.Sound.createAsync({ uri: SOUND_POP }, { volume: Math.max(0, Math.min(1, volume * 0.8)), shouldPlay: true });
                  pop.setOnPlaybackStatusUpdate((s) => {
                    const st = s as AVPlaybackStatusSuccess;
                    if (st.isLoaded && st.didJustFinish) pop.unloadAsync().catch(() => {});
                  });
                } catch (err) {
                  console.log('[MatchCelebration] pop sound error', err);
                }
              }, 220);
            }
          } else {
            try {
              const isHuge = clampedIntensity >= 0.9;
              const boom = createWebAudio(SOUND_BOOM);
              boom.volume = Math.max(0, Math.min(1, volume));
              void boom.play();
              if (isHuge) {
                setTimeout(() => {
                  try {
                    const pop = createWebAudio(SOUND_POP);
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

  const jsonUrl = lottieUrl ?? (clampedIntensity >= 0.9 ? DEFAULT_FIREWORKS_JSON : ALT_FIREWORKS_JSON);

  let LottieViewComp: any = null;
  let ReactLottie: any = null;
  if (Platform.OS !== 'web') {
    try {
      LottieViewComp = require('lottie-react-native').default;
    } catch {
      LottieViewComp = null;
    }
  } else {
    try {
      ReactLottie = require('react-lottie').default;
    } catch {
      ReactLottie = null;
    }
  }

  const burstWidth = W * Math.min(1, 0.85 + clampedIntensity * 0.7);
  const burstHeight = 360 + Math.floor(120 * clampedIntensity);

  return (
    <View pointerEvents="none" style={styles.overlay} testID="match-celebration">
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />
      <Animated.View style={[styles.ring, { top: H / 2 - 40, left: W / 2 - 40, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />

      {Platform.OS !== 'web' && LottieViewComp && lottieData ? (
        <>
          <View style={[styles.lottieBurst, { top: H / 2 - burstHeight / 2 }]}> 
            <LottieViewComp
              source={lottieData}
              autoPlay
              loop={false}
              speed={Math.max(0.6, Math.min(2.2, 0.9 + clampedIntensity))}
              style={{ width: burstWidth, height: burstHeight }}
              resizeMode="cover"
              testID="lottie-fireworks"
            />
          </View>
          {clampedIntensity > 0.85 ? (
            <View style={[styles.lottieBurst, { top: H / 2 - burstHeight / 2 - 80 }]}> 
              <LottieViewComp
                source={lottieData}
                autoPlay
                loop={false}
                speed={Math.max(0.7, Math.min(2, 0.9 + clampedIntensity * 0.8))}
                style={{ width: burstWidth * 0.8, height: burstHeight * 0.85, opacity: 0.85 }}
                resizeMode="cover"
              />
            </View>
          ) : null}
        </>
      ) : null}

      {Platform.OS === 'web' && ReactLottie && lottieData ? (
        <View style={[styles.lottieBurst, { top: H / 2 - burstHeight / 2 }]}> 
          <ReactLottie
            options={{ animationData: lottieData, loop: false, autoplay: true, rendererSettings: { preserveAspectRatio: 'xMidYMid slice' } }}
            height={burstHeight}
            width={burstWidth}
            isStopped={false}
            isPaused={false}
          />
        </View>
      ) : null}

      {Platform.OS === 'web' && (!ReactLottie || !lottieData) ? (
        <Image
          source={{ uri: clampedIntensity >= 0.9 ? 'https://media.giphy.com/media/3o7abB06u9bNzA8lu8/giphy.gif' : 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif' }}
          style={{ position: 'absolute', top: H / 2 - burstHeight / 2, width: burstWidth, height: burstHeight, opacity: 0.9 }}
        />
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
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#ffffff' },
  ring: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)' },
});

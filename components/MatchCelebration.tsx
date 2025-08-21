import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, View } from 'react-native';

export type CelebrationTheme = 'confetti' | 'hearts' | 'fireworks';

export interface MatchCelebrationProps {
  visible: boolean;
  onDone?: () => void;
  intensity?: number; // 0..1 controls number of particles and duration
  theme?: CelebrationTheme;
  message?: string;
}

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  kind: 'dot' | 'heart';
  size: number;
}

const { width: W, height: H } = Dimensions.get('window');

export default function MatchCelebration({ visible, onDone, intensity = 1, theme = 'hearts', message = "Boom! It's a Match!" }: MatchCelebrationProps) {
  const count = Math.max(12, Math.floor(80 * Math.max(0, Math.min(1, intensity))));
  const duration = 900 + Math.floor(1200 * intensity);

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const kind: 'dot' | 'heart' = theme === 'hearts' ? 'heart' : 'dot';
      const size = kind === 'heart' ? 16 + Math.random() * 14 : 6 + Math.random() * 8;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, theme, visible]);

  const labelOpacity = useRef(new Animated.Value(0)).current;
  const labelY = useRef(new Animated.Value(20)).current;

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

    Animated.sequence([showLabel, Animated.parallel(anims), hideLabel]).start(({ finished }) => {
      if (finished && onDone) onDone();
    });
  }, [visible, particles, duration, labelOpacity, labelY, onDone]);

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={styles.overlay} testID="match-celebration">
      {particles.map((p, i) => {
        const transform = [{ translateX: p.x }, { translateY: p.y }, { rotate: p.rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }, { scale: p.scale }];
        const style = [styles.particle, { backgroundColor: p.kind === 'dot' ? p.color : 'transparent', width: p.size, height: p.size, opacity: p.opacity } as const];
        return (
          <Animated.View key={`p-${i}`} style={[StyleSheet.absoluteFillObject, { transform }]}> 
            {p.kind === 'heart' ? (
              <Text style={{ fontSize: p.size, color: p.color, lineHeight: p.size as number, textAlign: 'center' }}>❤</Text>
            ) : (
              <View style={[style as unknown as object, { borderRadius: p.size / 2 }]} />
            )}
          </Animated.View>
        );
      })}
      <Animated.View style={[styles.centerLabel, { opacity: labelOpacity, transform: [{ translateY: labelY }] }]}> 
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

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  particle: { backgroundColor: '#FF6B6B' },
  centerLabel: { position: 'absolute', top: H / 2 - 80, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(17,24,39,0.6)' },
  title: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center' },
});

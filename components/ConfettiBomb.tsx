import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Button, Platform } from 'react-native';
import MatchCelebration from '@/components/MatchCelebration';

export interface ConfettiBombProps {
  auto?: boolean;
  intensity?: number;
  volume?: number;
  message?: string;
  onDone?: () => void;
  testID?: string;
}

const LOTTIE_CONFETTI_CANDIDATES: string[] = [
  'https://lottie.host/1b3b7c5a-5c1a-42b2-9f0e-0a0c0b8e6a07/tR4n9mY2b3.json',
  'https://assets1.lottiefiles.com/packages/lf20_touohxv0.json',
];

const BOMB_SOUND_CANDIDATES: string[] = [
  'https://assets.mixkit.co/sfx/preview/mixkit-explosion-debris-1704.mp3',
  'https://assets.mixkit.co/sfx/preview/mixkit-bomb-explosion-with-debris-1702.mp3',
  'https://www.soundjay.com/explosion/sounds/explosion-01.mp3',
];

export default function ConfettiBomb({
  auto = true,
  intensity = 1,
  volume = 1,
  message = 'Boom! 🎉',
  onDone,
  testID = 'confetti-bomb',
}: ConfettiBombProps) {
  const [visible, setVisible] = useState<boolean>(auto);

  const lottieUrl = useMemo(() => LOTTIE_CONFETTI_CANDIDATES[0] as string, []);
  const bombUrl = useMemo(() => BOMB_SOUND_CANDIDATES[0] as string, []);

  const handleDone = useCallback(() => {
    setVisible(false);
    onDone?.();
  }, [onDone]);

  return (
    <View style={styles.container} testID={testID}>
      <MatchCelebration
        visible={visible}
        onDone={handleDone}
        intensity={intensity}
        theme={'confetti'}
        message={message}
        volume={Math.max(0.2, Math.min(1, volume))}
        soundEnabled={true}
        vibrate={Platform.OS !== 'web'}
        lottieUrl={lottieUrl}
        soundBoomUrl={bombUrl}
        burstMode={'auto'}
      />
      {!visible && (
        <View style={styles.buttonWrap}>
          <Button title="Trigger Confetti Bomb" onPress={() => setVisible(true)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  buttonWrap: { position: 'absolute', bottom: 24, left: 24, right: 24 },
});

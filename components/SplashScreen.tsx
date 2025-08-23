import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Text, Platform } from 'react-native';
import { useI18n } from '@/contexts/I18nContext';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const { t } = useI18n();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  useEffect(() => {
    console.log('[SplashScreen] startAnimation (clean)');
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      console.log('[SplashScreen] animation finished', finished);
      onAnimationComplete?.();
    });
  }, [fadeAnim, scaleAnim, onAnimationComplete]);

  return (
    <View style={styles.container} testID="splash-container" accessibilityLabel="splash-container">
      <Animated.View
        style={[styles.brandContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        testID="splash-brand-container"
        accessibilityLabel="splash-brand-container"
      >
        <Text style={styles.appName} testID="splash-app-name">{t('common.appName')}</Text>
        <Text style={styles.tagline} testID="splash-tagline">{t('splash.tagline')}</Text>
      </Animated.View>

      {Platform.OS === 'web' ? (
        <View style={styles.webHint} testID="splash-web-hint">
          <Text style={styles.webHintText}>{t('splash.webHint') ?? ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#111',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600' as const,
  },
  webHint: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f7f2fa',
  },
  webHintText: {
    textAlign: 'center' as const,
    color: '#6a1b9a',
    fontSize: 12,
  },
});
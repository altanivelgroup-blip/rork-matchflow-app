import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Text, Platform } from 'react-native';
import { useI18n } from '@/contexts/I18nContext';

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const { t } = useI18n();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startAnimation = () => {
      console.log('[SplashScreen] startAnimation');
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.loop(
            Animated.sequence([
              Animated.timing(scanLineAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
              }),
              Animated.timing(scanLineAnim, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
            { iterations: 2 }
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.08,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
            { iterations: 2 }
          ),
        ]),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        console.log('[SplashScreen] animation finished', finished);
        onAnimationComplete?.();
      });
    };

    startAnimation();
  }, [fadeAnim, scaleAnim, scanLineAnim, pulseAnim, onAnimationComplete]);

  const scanLineTranslateY = useMemo(() => scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  }), [scanLineAnim]);

  return (
    <View style={styles.container} testID="splash-container" accessibilityLabel="splash-container">
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { scale: pulseAnim },
            ],
          },
        ]}
        testID="splash-logo-container"
        accessibilityLabel="splash-logo-container"
      >
        <Image
          source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ej8wpdgrhkud76f3w6rio' }}
          style={styles.logo}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.scanFrame} testID="splash-scan-frame">
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{ translateY: scanLineTranslateY }],
              },
            ]}
            testID="splash-scan-line"
          />
        </View>
        <View style={styles.corners}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]} testID="splash-text">
        <Text style={styles.appName}>{t('common.appName')}</Text>
        <Text style={styles.tagline}>{t('splash.tagline')}</Text>
        <Text style={styles.loadingText}>{t('splash.scanning')}</Text>
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
  logoContainer: {
    position: 'relative',
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
  },
  scanFrame: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#E91E63',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  corners: {
    position: 'absolute',
    width: 190,
    height: 190,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: '#9C27B0',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  textContainer: {
    marginTop: 36,
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: '#E91E63',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600' as const,
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 14,
    color: '#9C27B0',
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
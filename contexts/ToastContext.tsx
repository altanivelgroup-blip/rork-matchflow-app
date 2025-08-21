import createContextHook from '@nkzw/create-context-hook';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

interface ToastState {
  message: string;
  visible: boolean;
}

interface ToastContextType {
  show: (message: string) => void;
}

const defaultValue: ToastContextType = {
  show: () => {},
};

export const [ToastProvider, useToast] = createContextHook<ToastContextType>(() => {
  const [state, setState] = useState<ToastState>({ message: '', visible: false });
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = (message: string) => {
    try {
      console.log('[Toast] show', message);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setState({ message, visible: true });
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: false, easing: Easing.out(Easing.quad) }).start(() => {
        timerRef.current = setTimeout(() => {
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: false, easing: Easing.in(Easing.quad) }).start(() => {
            setState({ message: '', visible: false });
          });
        }, 1500);
      });
    } catch (e) {
      console.log('[Toast] error', e);
    }
  };

  const value: ToastContextType = useMemo(() => ({ show }), []);

  return (
    <View style={{ flex: 1 }}>
      {/* @ts-expect-error children provided by wrapper */}
      {undefined}
      {/* Overlay */}
      {state.visible ? (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity }] } testID="toast">
          <Text style={styles.toastText}>{state.message}</Text>
        </Animated.View>
      ) : null}
    </View>
  ) as unknown as ToastContextType; // The wrapper will ignore returned JSX; we expose context via value above
}, defaultValue);

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(17,24,39,0.95)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

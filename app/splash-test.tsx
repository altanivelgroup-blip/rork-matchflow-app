import React from 'react';
import { View, StyleSheet } from 'react-native';
import Splash from '@/components/SplashScreen';

export default function SplashTest() {
  return (
    <View style={styles.container} testID="splash-test-page">
      <Splash />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

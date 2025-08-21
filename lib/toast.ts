import { Platform, ToastAndroid, Alert } from 'react-native';

export function showToast(message: string) {
  try {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    if (Platform.OS === 'web') {
      console.log('[toast]', message);
      return;
    }
    Alert.alert('', message);
  } catch (e) {
    console.log('[toast] error', e);
  }
}

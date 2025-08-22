import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ShieldCheck,
  Camera,
  Eye,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { useCameraPermissions } from 'expo-camera';
import { useI18n } from '@/contexts/I18nContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';

export default function PermissionsPromptScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const { t } = useI18n();
  const analytics = useAnalytics();

  const handleRequestPermissions = async () => {
    try {
      setIsRequesting(true);
      
      console.log('[PermissionsPrompt] Requesting camera permission...');
      const result = await requestPermission();
      
      if (result?.granted) {
        console.log('[PermissionsPrompt] Camera permission granted');
        await analytics.track('permissions_granted', { type: 'camera' });
        
        // Navigate to photo verification
        router.push('/(auth)/verify-photo' as any);
      } else {
        console.log('[PermissionsPrompt] Camera permission denied');
        await analytics.track('permissions_denied', { type: 'camera' });
        
        const title = t('permissions.deniedTitle') ?? 'Camera Permission Required';
        const message = Platform.OS === 'android'
          ? (t('permissions.deniedMessageAndroid') ?? 'Camera access is required for secure verification. Please allow camera access in Settings > Apps > MatchFlow > Permissions > Camera.')
          : (t('permissions.deniedMessageIOS') ?? 'Camera access is required for secure verification. Please allow camera access in Settings > Privacy & Security > Camera.');
        
        Alert.alert(
          title,
          message,
          [
            { text: t('common.cancel') ?? 'Cancel' },
            {
              text: t('permissions.retryPermission') ?? 'Retry Permission',
              onPress: () => handleRequestPermissions(),
            },
            {
              text: t('common.openSettings') ?? 'Open Settings',
              onPress: () => {
                if (Platform.OS !== 'web') {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.log('[PermissionsPrompt] Error requesting permissions:', error);
      Alert.alert(
        t('common.error') ?? 'Error',
        t('permissions.requestError') ?? 'Failed to request camera permission. Please try again.',
        [
          { text: t('common.ok') ?? 'OK' },
          { text: t('permissions.retryPermission') ?? 'Retry Permission', onPress: () => handleRequestPermissions() }
        ]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      t('permissions.skipTitle') ?? 'Skip Verification?',
      t('permissions.skipMessage') ?? 'You can complete verification later, but some features may be limited until your account is verified. Gallery access will be blocked until camera permission is granted.',
      [
        { text: t('common.cancel') ?? 'Cancel' },
        {
          text: t('permissions.skipConfirm') ?? 'Skip for now',
          style: 'destructive',
          onPress: () => {
            analytics.track('verification_skipped');
            router.push('/(auth)/verify-photo' as any); // Still go to verification but with limited access
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#FF6B6B', '#FF8E53']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <ShieldCheck color="white" size={48} />
            </View>
            <Text style={styles.title}>
              {t('permissions.title') ?? 'Secure Verification'}
            </Text>
            <Text style={styles.subtitle}>
              {t('permissions.subtitle') ?? 'We need camera access for secure identity verification'}
            </Text>
          </View>

          <View style={styles.contentContainer}>
            <View style={styles.explanationCard}>
              <Text style={styles.cardTitle}>
                {t('permissions.whyTitle') ?? 'Why do we need camera access?'}
              </Text>
              
              <View style={styles.reasonItem}>
                <Eye color="#FF6B6B" size={20} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>
                    {t('permissions.reason1Title') ?? 'Identity Verification'}
                  </Text>
                  <Text style={styles.reasonDescription}>
                    {t('permissions.reason1Desc') ?? 'Verify your identity to ensure authentic profiles and build trust in our community'}
                  </Text>
                </View>
              </View>

              <View style={styles.reasonItem}>
                <Lock color="#FF6B6B" size={20} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>
                    {t('permissions.reason2Title') ?? 'Account Security'}
                  </Text>
                  <Text style={styles.reasonDescription}>
                    {t('permissions.reason2Desc') ?? 'Protect your account from unauthorized access and fake profiles'}
                  </Text>
                </View>
              </View>

              <View style={styles.reasonItem}>
                <CheckCircle2 color="#FF6B6B" size={20} />
                <View style={styles.reasonText}>
                  <Text style={styles.reasonTitle}>
                    {t('permissions.reason3Title') ?? 'Enhanced Features'}
                  </Text>
                  <Text style={styles.reasonDescription}>
                    {t('permissions.reason3Desc') ?? 'Access premium matching features and verified member benefits'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.privacyCard}>
              <Info color="#3B82F6" size={20} />
              <View style={styles.privacyText}>
                <Text style={styles.privacyTitle}>
                  {t('permissions.privacyTitle') ?? 'Your Privacy is Protected'}
                </Text>
                <Text style={styles.privacyDescription}>
                  {t('permissions.privacyDesc') ?? 'Photos are processed securely and only used for verification. We never share your images without consent.'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.allowButton, isRequesting && styles.allowButtonDisabled]}
              onPress={handleRequestPermissions}
              disabled={isRequesting}
              testID="allow-camera"
            >
              <Camera color="white" size={20} />
              <Text style={styles.allowButtonText}>
                {isRequesting
                  ? (t('permissions.requesting') ?? 'Requesting...')
                  : (t('permissions.allowCamera') ?? 'Allow Camera Access')
                }
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkipForNow}
              testID="skip-verification"
            >
              <Text style={styles.skipButtonText}>
                {t('permissions.skipForNow') ?? 'Skip for now'}
              </Text>
            </TouchableOpacity>

            <View style={styles.warningCard}>
              <AlertTriangle color="#F59E0B" size={16} />
              <Text style={styles.warningText}>
                {t('permissions.warningText') ?? 'Without camera permission: Gallery access blocked, verification limited, reduced matching features.'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
    padding: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  contentContainer: {
    flex: 1,
  },
  explanationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reasonText: {
    flex: 1,
    marginLeft: 12,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reasonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EBF8FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  privacyText: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  allowButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  allowButtonDisabled: {
    opacity: 0.7,
  },
  allowButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  skipButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  warningText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 16,
  },
});
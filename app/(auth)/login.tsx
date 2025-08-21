import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Heart, Apple, Globe, Mail, Lock, LogIn, MountainSnow } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportedLocales, type SupportedLocale } from "@/lib/i18n";
import LanguageSwitchConfirm from '@/components/LanguageSwitchConfirm';
import { useI18n } from '@/contexts/I18nContext';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingLocale, setPendingLocale] = useState<SupportedLocale | null>(null);
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const { login } = useAuth();
  const { t, locale, setLocale } = useI18n();

  const i18nProxy = useMemo(() => ({ t: (k: string) => t(k) }), [t, locale]);

  const flagFor = (code: SupportedLocale): string => (code === 'en' ? '🇺🇸' : code === 'es' ? '🇪🇸' : code === 'ja' ? '🇯🇵' : '🇨🇳');

  const emailValid = useMemo(() => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email), [email]);
  const passwordStrong = useMemo(() => password.length >= 6, [password]);

  const handleLogin = async () => {
    if (!emailValid) {
      Alert.alert(i18nProxy.t('errors.invalidEmail') ?? 'Invalid email address');
      return;
    }
    if (!passwordStrong) {
      Alert.alert(i18nProxy.t('errors.weakPassword') ?? 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      // Check if user has completed verification
      const verificationPassed = await AsyncStorage.getItem('verification_passed_v1');
      
      let loc: { lat: number; lon: number; city?: string } | undefined;
      try {
        if (Platform.OS === 'web' && navigator.geolocation) {
          const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition((pos) => resolve(pos.coords), (err) => reject(err), { enableHighAccuracy: true, timeout: 8000 });
          });
          loc = { lat: coords.latitude, lon: coords.longitude };
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          }
        }
      } catch (e) {
        console.log('[Login] location error', e);
      }
      
      await login({ email, name: email.split("@")[0], location: loc });
      
      // Redirect based on verification status
      if (verificationPassed === 'true') {
        router.replace("/(tabs)");
      } else {
        // User needs to complete verification flow
        router.replace("/verify-photo" as any);
      }
    } catch (e) {
      Alert.alert(i18nProxy.t('errors.loginFailed') ?? 'Sign in failed', i18nProxy.t('errors.tryAgain') ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await login({ email: `google_user@example.com`, name: 'Google User' });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    setLoading(true);
    try {
      await login({ email: `apple_user@example.com`, name: 'Apple User' });
      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Apple sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#FF6B6B", "#FF8E53"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.langRow}>
              <Globe color="#fff" size={16} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langChips}>
                {(Object.keys(supportedLocales) as SupportedLocale[]).map((code) => (
                  <TouchableOpacity key={code} style={[styles.langChip, locale === code ? styles.langChipActive : undefined]} onPress={() => { setPendingLocale(code); setConfirmVisible(true); }} testID={`lang-${code}`}>
                    <Text style={[styles.langChipText, locale === code ? styles.langChipTextActive : undefined]}>{`${flagFor(code)} ${supportedLocales[code]}`}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.logoContainer}>
              <Heart color="white" size={60} fill="white" />
              <Text style={styles.appName}>{i18nProxy.t('common.appName') ?? 'MatchFlow'}</Text>
              <Text style={styles.tagline}>Find your perfect match</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <Mail color="#999" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder={i18nProxy.t('auth.email') ?? 'Email'}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="email-input"
                />
              </View>

              <View style={styles.inputRow}>
                <Lock color="#999" size={18} />
                <TextInput
                  style={styles.input}
                  placeholder={i18nProxy.t('auth.password') ?? 'Password'}
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="password-input"
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading ? styles.loginDisabled : undefined]}
                onPress={handleLogin}
                disabled={loading}
                testID="login-button"
              >
                {loading ? <ActivityIndicator color="#fff" /> : <LogIn color="#fff" size={18} />}
                <Text style={styles.loginButtonText}>{i18nProxy.t('auth.login') ?? 'Login'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => Alert.alert('Forgot Password', 'Reset link sent if email exists.')}
              >
                <Text style={styles.forgotPasswordText}>{i18nProxy.t('auth.forgotPassword') ?? 'Forgot Password?'}</Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{i18nProxy.t('common.or') ?? 'OR'}</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity style={styles.socialButton} onPress={handleGoogle} testID="google-login">
                  <MountainSnow color="#EA4335" size={18} />
                  <Text style={styles.socialText}>Google</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={handleApple} testID="apple-login">
                  <Apple color="#000" size={18} />
                  <Text style={styles.socialText}>Apple</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.signupButton}
                onPress={() => router.push("/signup" as any)}
                testID="signup-link"
              >
                <Text style={styles.signupButtonText}>
                  {i18nProxy.t('auth.signupCta') ?? "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <LanguageSwitchConfirm
        visible={confirmVisible}
        selectedLabel={pendingLocale ? supportedLocales[pendingLocale] : ''}
        onCancel={() => { setConfirmVisible(false); setPendingLocale(null); }}
        onConfirm={() => {
          const next = pendingLocale ?? locale;
          setLocale(next);
          setConfirmVisible(false);
          setPendingLocale(null);
        }}
      />
    </LinearGradient>
  );
}

const fontWeight700 = "700" as const;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  langChips: { paddingHorizontal: 10, gap: 8 },
  langChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 8 },
  langChipActive: { backgroundColor: '#fff' },
  langChipText: { color: '#fff', fontSize: 12 },
  langChipTextActive: { color: '#FF6B6B', fontWeight: fontWeight700 },
  logoContainer: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  appName: { fontSize: 36, fontWeight: "bold", color: "white", marginTop: 15 },
  tagline: { fontSize: 16, color: "rgba(255, 255, 255, 0.9)", marginTop: 5 },
  formContainer: { backgroundColor: "white", borderRadius: 20, padding: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, marginBottom: 15 },
  input: { flex: 1, padding: 15, fontSize: 16, color: "#333" },
  loginButton: { flexDirection: 'row', gap: 8, backgroundColor: "#FF6B6B", borderRadius: 10, padding: 15, alignItems: "center", justifyContent: 'center', marginTop: 10 },
  loginDisabled: { opacity: 0.7 },
  loginButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
  forgotPassword: { alignItems: "center", marginTop: 12 },
  forgotPasswordText: { color: "#FF6B6B", fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#E0E0E0" },
  dividerText: { marginHorizontal: 10, color: "#999", fontSize: 14 },
  socialRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  socialButton: { flex: 1, flexDirection: 'row', backgroundColor: '#F8F8F8', paddingVertical: 12, marginHorizontal: 4, justifyContent: 'center', borderRadius: 10, alignItems: 'center' },
  socialText: { marginLeft: 6, color: '#333', fontSize: 14, fontWeight: fontWeight700 },
  signupButton: { alignItems: "center", marginTop: 8 },
  signupButtonText: { color: "#666", fontSize: 14 },
});
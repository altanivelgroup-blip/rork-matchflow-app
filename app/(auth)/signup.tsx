import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Calendar, Globe, IdCard, Lock, Mail, MapPin } from "lucide-react-native";
import * as Location from 'expo-location';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { i18n, supportedLocales, type SupportedLocale, detectDeviceLocale } from "@/lib/i18n";
import LanguageSwitchConfirm from '@/components/LanguageSwitchConfirm';
import en from '@/locales/en';
import es from '@/locales/es';
import zhHans from '@/locales/zh-Hans';
import ja from '@/locales/ja';

const LOCALE_KEY = 'i18n:locale';

export default function SignupScreen() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [locationText, setLocationText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [locale, setLocale] = useState<SupportedLocale>(detectDeviceLocale());
  const [pendingLocale, setPendingLocale] = useState<SupportedLocale | null>(null);
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);

  useEffect(() => {
    i18n.translations = { en, es, 'zh-Hans': zhHans, ja } as any;
    const init = async () => {
      const saved = await AsyncStorage.getItem(LOCALE_KEY);
      const next = (saved as SupportedLocale) ?? locale;
      i18n.locale = next;
      setLocale(next);
    };
    init();
  }, []);

  useEffect(() => {
    i18n.locale = locale;
    AsyncStorage.setItem(LOCALE_KEY, locale).catch(() => {});
  }, [locale]);

  const t = useMemo(() => i18n, [locale]);

  const flagFor = (code: SupportedLocale): string => (code === 'en' ? '🇺🇸' : code === 'es' ? '🇪🇸' : code === 'ja' ? '🇯🇵' : '🇨🇳');

  const emailValid = useMemo(() => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email), [email]);
  const passwordStrong = useMemo(() => password.length >= 6, [password]);

  const preflightLocation = async () => {
    try {
      if (Platform.OS === 'web' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true, timeout: 5000 });
      } else {
        await Location.requestForegroundPermissionsAsync();
      }
    } catch (e) {
      console.log('[Signup] location preflight error', e);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword || !age || !gender) {
      Alert.alert('Missing info', 'Please fill all fields.');
      return;
    }
    if (!emailValid) {
      Alert.alert(t.t('errors.invalidEmail') ?? 'Invalid email address');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(t.t('errors.passwordsNoMatch') ?? 'Passwords do not match.');
      return;
    }
    if (!passwordStrong) {
      Alert.alert('Weak password', 'Use at least 6 characters');
      return;
    }
    setLoading(true);
    await preflightLocation();
    try {
      await AsyncStorage.setItem('signup:basic', JSON.stringify({ name, email, age: Number(age) || undefined, gender, locationText }));
      router.push("/verify-photo" as any);
    } catch (e) {
      Alert.alert('Error', 'Unable to proceed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={["#FF6B6B", "#FF8E53"]} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="white" size={24} />
        </TouchableOpacity>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

            <View style={styles.headerContainer}>
              <Text style={styles.title}>{t.t('auth.createAccount') ?? 'Create Account'}</Text>
              <Text style={styles.subtitle}>{t.t('auth.createAccountSubtitle') ?? 'Join MatchFlow to find your perfect match'}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <IdCard color="#999" size={18} />
                <TextInput style={styles.input} placeholder={t.t('auth.fullName') ?? 'Full Name'} placeholderTextColor="#999" value={name} onChangeText={setName} testID="name-input" />
              </View>

              <View style={styles.inputRow}>
                <Mail color="#999" size={18} />
                <TextInput style={styles.input} placeholder={t.t('auth.email') ?? 'Email'} placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="email-input" />
              </View>

              <View style={styles.inputRow}>
                <Lock color="#999" size={18} />
                <TextInput style={styles.input} placeholder={t.t('auth.password') ?? 'Password'} placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry testID="password-input" />
              </View>

              <View style={styles.inputRow}>
                <Lock color="#999" size={18} />
                <TextInput style={styles.input} placeholder={t.t('auth.confirmPassword') ?? 'Confirm Password'} placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry testID="confirm-password-input" />
              </View>

              <View style={styles.inputRow}>
                <Calendar color="#999" size={18} />
                <TextInput style={styles.input} placeholder={t.t('profileSetup.agePlaceholder') ?? 'Age'} placeholderTextColor="#999" value={age} onChangeText={setAge} keyboardType="number-pad" />
              </View>

              <View style={styles.inputRow}>
                <IdCard color="#999" size={18} />
                <TextInput style={styles.input} placeholder="Gender" placeholderTextColor="#999" value={gender} onChangeText={setGender} />
              </View>

              <View style={styles.inputRow}>
                <MapPin color="#999" size={18} />
                <TextInput style={styles.input} placeholder="Location (City)" placeholderTextColor="#999" value={locationText} onChangeText={setLocationText} />
              </View>

              <TouchableOpacity style={[styles.signupButton, loading ? styles.signupDisabled : undefined]} onPress={handleSignup} testID="signup-button" disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : null}
                <Text style={styles.signupButtonText}>Continue</Text>
              </TouchableOpacity>

              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  By signing up, you agree to our <Text style={styles.termsLink}>Terms of Service</Text> and <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
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
  backButton: { position: "absolute", top: 50, left: 20, zIndex: 1, padding: 10 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 30 },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  langChips: { paddingHorizontal: 10, gap: 8 },
  langChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', marginRight: 8 },
  langChipActive: { backgroundColor: '#fff' },
  langChipText: { color: '#fff', fontSize: 12 },
  langChipTextActive: { color: '#FF6B6B', fontWeight: fontWeight700 },
  headerContainer: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  title: { fontSize: 32, fontWeight: "bold", color: "white", marginBottom: 10 },
  subtitle: { fontSize: 16, color: "rgba(255, 255, 255, 0.9)", textAlign: "center" },
  formContainer: { backgroundColor: "white", borderRadius: 20, padding: 25, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 12, marginBottom: 15 },
  input: { flex: 1, padding: 15, fontSize: 16, color: "#333" },
  signupButton: { backgroundColor: "#FF6B6B", borderRadius: 10, padding: 15, alignItems: "center", marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  signupDisabled: { opacity: 0.7 },
  signupButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
  termsContainer: { marginTop: 20, paddingHorizontal: 10 },
  termsText: { fontSize: 12, color: "#666", textAlign: "center", lineHeight: 18 },
  termsLink: { color: "#FF6B6B", fontWeight: "600" },
});
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowLeft, Calendar, Globe, IdCard, Lock, Mail, MapPin } from "lucide-react-native";
import * as Location from 'expo-location';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supportedLocales, type SupportedLocale } from "@/lib/i18n";
import LanguageSwitchConfirm from '@/components/LanguageSwitchConfirm';
import { useI18n } from '@/contexts/I18nContext';

export default function SignupScreen() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [age, setAge] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [showGenderPicker, setShowGenderPicker] = useState<boolean>(false);
  const [locationText, setLocationText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingLocale, setPendingLocale] = useState<SupportedLocale | null>(null);
  const [confirmVisible, setConfirmVisible] = useState<boolean>(false);
  const { t, locale, setLocale } = useI18n();

  const i18nProxy = useMemo(() => ({ t: (k: string) => t(k) }), [t, locale]);

  const flagFor = (code: SupportedLocale): string => (code === 'en' ? '🇺🇸' : code === 'es' ? '🇪🇸' : code === 'ja' ? '🇯🇵' : '🇨🇳');

  const emailValid = useMemo(() => /[^@\s]+@[^@\s]+\.[^@\s]+/.test(email), [email]);
  const passwordStrong = useMemo(() => password.length >= 6, [password]);
  const ageValid = useMemo(() => {
    const ageNum = Number(age);
    return ageNum >= 18 && ageNum <= 100;
  }, [age]);
  const nameValid = useMemo(() => name.trim().length >= 2, [name]);
  
  const genderOptions = ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'];

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
    // Validation
    if (!nameValid) {
      Alert.alert(i18nProxy.t('errors.invalidName') ?? 'Invalid name', 'Name must be at least 2 characters long.');
      return;
    }
    if (!emailValid) {
      Alert.alert(i18nProxy.t('errors.invalidEmail') ?? 'Invalid email address');
      return;
    }
    if (!passwordStrong) {
      Alert.alert(i18nProxy.t('errors.weakPassword') ?? 'Weak password', 'Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(i18nProxy.t('errors.passwordsNoMatch') ?? 'Passwords do not match.');
      return;
    }
    if (!ageValid) {
      Alert.alert(i18nProxy.t('errors.invalidAge') ?? 'Invalid age', 'You must be between 18 and 100 years old.');
      return;
    }
    if (!gender) {
      Alert.alert(i18nProxy.t('errors.missingGender') ?? 'Missing gender', 'Please select your gender.');
      return;
    }
    
    setLoading(true);
    await preflightLocation();
    try {
      // Store signup data for later use
      const signupData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password, // In real app, this would be hashed
        age: Number(age),
        gender,
        locationText: locationText.trim(),
        signupTimestamp: Date.now()
      };
      
      await AsyncStorage.setItem('signup:basic', JSON.stringify(signupData));
      
      // Navigate to photo verification
      router.push("/verify-photo" as any);
    } catch (e) {
      console.log('[Signup] error:', e);
      Alert.alert(i18nProxy.t('errors.signupFailed') ?? 'Signup failed', i18nProxy.t('errors.tryAgain') ?? 'Please try again.');
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
              <Text style={styles.title}>{i18nProxy.t('auth.createAccount') ?? 'Create Account'}</Text>
              <Text style={styles.subtitle}>{i18nProxy.t('auth.createAccountSubtitle') ?? 'Join MatchFlow to find your perfect match'}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputRow}>
                <IdCard color="#999" size={18} />
                <TextInput style={styles.input} placeholder={i18nProxy.t('auth.fullName') ?? 'Full Name'} placeholderTextColor="#999" value={name} onChangeText={setName} testID="name-input" />
              </View>

              <View style={styles.inputRow}>
                <Mail color="#999" size={18} />
                <TextInput style={styles.input} placeholder={i18nProxy.t('auth.email') ?? 'Email'} placeholderTextColor="#999" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" testID="email-input" />
              </View>

              <View style={styles.inputRow}>
                <Lock color="#999" size={18} />
                <TextInput style={styles.input} placeholder={i18nProxy.t('auth.password') ?? 'Password'} placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry testID="password-input" />
              </View>

              <View style={styles.inputRow}>
                <Lock color="#999" size={18} />
                <TextInput style={styles.input} placeholder={i18nProxy.t('auth.confirmPassword') ?? 'Confirm Password'} placeholderTextColor="#999" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry testID="confirm-password-input" />
              </View>

              <View style={styles.inputRow}>
                <Calendar color="#999" size={18} />
                <TextInput style={styles.input} placeholder={i18nProxy.t('profileSetup.agePlaceholder') ?? 'Age'} placeholderTextColor="#999" value={age} onChangeText={setAge} keyboardType="number-pad" />
              </View>

              <TouchableOpacity 
                style={styles.inputRow} 
                onPress={() => setShowGenderPicker(true)}
                testID="gender-picker"
              >
                <IdCard color="#999" size={18} />
                <Text style={[styles.input, { paddingVertical: 15 }, !gender && { color: '#999' }]}>
                  {gender || 'Select Gender'}
                </Text>
              </TouchableOpacity>

              <View style={styles.inputRow}>
                <MapPin color="#999" size={18} />
                <TextInput style={styles.input} placeholder="Location (City)" placeholderTextColor="#999" value={locationText} onChangeText={setLocationText} />
              </View>

              <TouchableOpacity 
                style={[styles.signupButton, loading ? styles.signupDisabled : undefined]} 
                onPress={handleSignup} 
                testID="signup-button" 
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : null}
                <Text style={styles.signupButtonText}>
                  {i18nProxy.t('auth.continueToVerification') ?? 'Continue to Verification'}
                </Text>
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
      
      {/* Gender Picker Modal */}
      {showGenderPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.genderOption, gender === option && styles.genderOptionSelected]}
                onPress={() => {
                  setGender(option);
                  setShowGenderPicker(false);
                }}
                testID={`gender-${option.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Text style={[styles.genderOptionText, gender === option && styles.genderOptionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowGenderPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
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
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalContent: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '80%', maxWidth: 300 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 20 },
  genderOption: { paddingVertical: 15, paddingHorizontal: 20, borderRadius: 10, marginBottom: 8, backgroundColor: '#F5F5F5' },
  genderOptionSelected: { backgroundColor: '#FF6B6B' },
  genderOptionText: { fontSize: 16, color: '#333', textAlign: 'center' },
  genderOptionTextSelected: { color: 'white', fontWeight: '600' },
  modalCancel: { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16, color: '#999' },
});
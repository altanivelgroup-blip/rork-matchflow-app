import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Camera, ArrowLeft, MapPin, Loader2 } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ExpoLocation from "expo-location";

export default function ProfileSetupScreen() {
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const { login } = useAuth();
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [location, setLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        setVerified(true);
      } catch (e) {
        console.log('[ProfileSetup] init error', e);
        setVerified(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const requestAndCaptureLocation = useCallback(async () => {
    try {
      setLocError(null);
      setLocLoading(true);
      if (Platform.OS === 'web') {
        await new Promise<void>((resolve, reject) => {
          if (!('geolocation' in navigator)) {
            reject(new Error('Geolocation not supported'));
            return;
          }
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const coords = pos.coords;
                const loc = { lat: coords.latitude, lon: coords.longitude };
                setLocation(loc);
                await AsyncStorage.setItem('user_location_v1', JSON.stringify(loc));
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        });
      } else {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission denied');
        }
        const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
        const coords = pos.coords;
        let city: string | undefined = undefined;
        try {
          const rev = await ExpoLocation.reverseGeocodeAsync({ latitude: coords.latitude, longitude: coords.longitude });
          city = rev?.[0]?.city ?? rev?.[0]?.subregion ?? undefined;
        } catch (e) {
          console.log('[ProfileSetup] reverse geocode error', e);
        }
        const loc = { lat: coords.latitude, lon: coords.longitude, city };
        setLocation(loc);
        await AsyncStorage.setItem('user_location_v1', JSON.stringify(loc));
      }
    } catch (e: unknown) {
      console.log('[ProfileSetup] location error', e);
      const msg = e instanceof Error ? e.message : 'Could not get location';
      setLocError(msg);
    } finally {
      setLocLoading(false);
    }
  }, []);

  const handleComplete = async () => {
    if (!verified) return;
    try {
      const faceVectorRaw = await AsyncStorage.getItem('face_vector_v1');
      const verificationScoreRaw = await AsyncStorage.getItem('verification_score_v1');
      const faceVector = faceVectorRaw ? (JSON.parse(faceVectorRaw) as number[]) : undefined;
      const storedLocRaw = await AsyncStorage.getItem('user_location_v1');
      const storedLoc = storedLocRaw ? (JSON.parse(storedLocRaw) as { lat: number; lon: number; city?: string }) : undefined;
      const faceScoreFromVerification = verificationScoreRaw ? Number(verificationScoreRaw) : undefined;
      await login({ 
        email: "user@example.com", 
        name: "User",
        bio,
        age: parseInt(age) || 25,
        interests: interests.split(",").map(i => i.trim()).filter(Boolean),
        location: storedLoc ?? location ?? undefined,
        faceVector: faceVector ?? undefined,
        faceScoreFromVerification: typeof faceScoreFromVerification === 'number' ? faceScoreFromVerification : undefined,
      });
      await AsyncStorage.setItem('user_face_vector_v1', JSON.stringify(faceVector ?? []));
      if (storedLocRaw) {
        // already saved
      } else if (location) {
        await AsyncStorage.setItem('user_location_v1', JSON.stringify(location));
      }
      if (typeof faceScoreFromVerification === 'number' && !Number.isNaN(faceScoreFromVerification)) {
        await AsyncStorage.setItem('user_face_score_v1', String(faceScoreFromVerification));
      }
    } catch (e) {
      console.log('[ProfileSetup] persist face data error', e);
    }
    router.replace("/questionnaire" as any);
  };

  if (verified === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Checking verification…</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#666' }} testID="verification-loading">Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.photoContainer}>
          <Camera color="#999" size={40} />
          <Text style={styles.photoText}>Add Profile Photo</Text>
        </TouchableOpacity>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              placeholderTextColor="#999"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              testID="age-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#999"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              testID="bio-input"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Interests</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Travel, Music, Sports (comma separated)"
              placeholderTextColor="#999"
              value={interests}
              onChangeText={setInterests}
              testID="interests-input"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleComplete}
          testID="complete-button"
        >
          <Text style={styles.completeButtonText}>Complete Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleComplete}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        <View style={styles.locationCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MapPin color={locError ? '#b91c1c' : location ? '#22c55e' : '#666'} size={18} />
            <Text style={styles.locationTitle}>Location</Text>
          </View>
          {location ? (
            <Text style={styles.locationText}>{location.city ? `${location.city} · ` : ''}{location.lat.toFixed(4)}, {location.lon.toFixed(4)}</Text>
          ) : locError ? (
            <Text style={[styles.locationText, { color: '#b91c1c' }]}>Permission needed or unavailable. You can continue, but matches may be less accurate.</Text>
          ) : (
            <Text style={styles.locationText}>Share your location for better matches nearby.</Text>
          )}
          <TouchableOpacity
            style={[styles.locButton, locLoading ? styles.locButtonDisabled : undefined]}
            onPress={requestAndCaptureLocation}
            disabled={locLoading}
            testID="capture-location"
          >
            {locLoading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.locButtonText}>{location ? 'Update Location' : 'Use my location'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  photoText: {
    marginTop: 10,
    fontSize: 12,
    color: "#999",
  },
  formContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: "#333",
  },
  bioInput: {
    height: 100,
    paddingTop: 15,
  },
  completeButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 10,
    padding: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  completeButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  skipButton: {
    alignItems: "center",
  },
  skipButtonText: {
    color: "#999",
    fontSize: 14,
  },
  locationCard: {
    marginTop: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  locationText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
  },
  locButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  locButtonDisabled: { opacity: 0.6 },
  locButtonText: { color: '#fff', fontWeight: '700' },
});
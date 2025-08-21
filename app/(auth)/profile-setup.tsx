import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Camera, ArrowLeft } from "lucide-react-native";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileSetupScreen() {
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [interests, setInterests] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flag = await AsyncStorage.getItem('verification_passed_v1');
        if (!mounted) return;
        if (flag !== 'true') {
          alert('Please complete photo verification first.');
          router.replace('/(auth)/verify-photo' as any);
        } else {
          setVerified(true);
        }
      } catch (e) {
        console.log('[ProfileSetup] verify gate error', e);
        alert('Could not confirm verification. Please retry.');
        router.replace('/(auth)/verify-photo' as any);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleComplete = () => {
    if (!verified) return;
    login({ 
      email: "user@example.com", 
      name: "User",
      bio,
      age: parseInt(age) || 25,
      interests: interests.split(",").map(i => i.trim()).filter(Boolean)
    });
    router.replace("/(tabs)");
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
});
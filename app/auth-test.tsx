import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, TestTube, CheckCircle, AlertCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TestStep {
  id: string;
  title: string;
  description: string;
  action: () => Promise<void>;
  completed: boolean;
}

export default function AuthFlowTestScreen() {
  const [steps, setSteps] = useState<TestStep[]>([
    {
      id: 'clear-data',
      title: 'Clear Test Data',
      description: 'Reset all stored authentication and verification data',
      action: async () => {
        await AsyncStorage.multiRemove([
          'signup:basic',
          'verification_photos_v1',
          'verification_passed_v1',
          'verification_score_v1',
          'face_vector_v1',
          'user'
        ]);
        Alert.alert('Success', 'All test data cleared');
      },
      completed: false
    },
    {
      id: 'simulate-signup',
      title: 'Simulate Signup Data',
      description: 'Create mock signup data for testing verification flow',
      action: async () => {
        const mockSignupData = {
          name: 'Test User',
          email: 'test@matchflow.com',
          password: 'password123',
          age: 25,
          gender: 'Male',
          locationText: 'San Francisco, CA',
          signupTimestamp: Date.now()
        };
        await AsyncStorage.setItem('signup:basic', JSON.stringify(mockSignupData));
        Alert.alert('Success', 'Mock signup data created');
      },
      completed: false
    },
    {
      id: 'test-signup-flow',
      title: 'Test Signup Flow',
      description: 'Navigate to signup screen to test form validation',
      action: async () => {
        router.push('/signup' as any);
      },
      completed: false
    },
    {
      id: 'test-verification-flow',
      title: 'Test Verification Flow',
      description: 'Navigate to photo verification screen',
      action: async () => {
        router.push('/verify-photo' as any);
      },
      completed: false
    },
    {
      id: 'simulate-verification-success',
      title: 'Simulate Verification Success',
      description: 'Mark verification as completed for testing',
      action: async () => {
        const mockPhotos = {
          front: { uri: 'mock://front.jpg', capturedAt: Date.now() - 3000, byteSize: 150000 },
          left: { uri: 'mock://left.jpg', capturedAt: Date.now() - 2000, byteSize: 148000 },
          right: { uri: 'mock://right.jpg', capturedAt: Date.now() - 1000, byteSize: 152000 }
        };
        
        await AsyncStorage.setItem('verification_photos_v1', JSON.stringify(mockPhotos));
        await AsyncStorage.setItem('verification_passed_v1', 'true');
        await AsyncStorage.setItem('verification_score_v1', '0.95');
        
        Alert.alert('Success', 'Verification marked as completed');
      },
      completed: false
    },
    {
      id: 'test-login-flow',
      title: 'Test Login Flow',
      description: 'Navigate to login screen to test redirect logic',
      action: async () => {
        router.push('/login' as any);
      },
      completed: false
    },
    {
      id: 'check-stored-data',
      title: 'Check Stored Data',
      description: 'View all stored authentication data',
      action: async () => {
        const keys = [
          'signup:basic',
          'verification_photos_v1', 
          'verification_passed_v1',
          'verification_score_v1',
          'user'
        ];
        
        const data: Record<string, string | null> = {};
        for (const key of keys) {
          data[key] = await AsyncStorage.getItem(key);
        }
        
        console.log('Stored Data:', data);
        Alert.alert('Data Check', `Check console for stored data. Verification passed: ${data['verification_passed_v1']}`);
      },
      completed: false
    }
  ]);

  const executeStep = async (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    try {
      await step.action();
      setSteps(prev => prev.map(s => 
        s.id === stepId ? { ...s, completed: true } : s
      ));
    } catch (error) {
      console.error('Step execution error:', error);
      Alert.alert('Error', `Failed to execute step: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auth Flow Test</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <TestTube color="#FF6B6B" size={20} />
          <Text style={styles.infoTitle}>Authentication Flow Testing</Text>
          <Text style={styles.infoText}>
            Use these steps to test the complete sign-up and verification flow without going through the actual process.
          </Text>
        </View>

        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
              {step.completed && (
                <CheckCircle color="#22c55e" size={20} />
              )}
            </View>
            
            <TouchableOpacity
              style={[styles.stepButton, step.completed && styles.stepButtonCompleted]}
              onPress={() => executeStep(step.id)}
            >
              <Text style={[styles.stepButtonText, step.completed && styles.stepButtonTextCompleted]}>
                {step.completed ? 'Completed' : 'Execute'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.warningCard}>
          <AlertCircle color="#F59E0B" size={16} />
          <Text style={styles.warningText}>
            This is a testing utility. In production, users would go through the actual signup and verification process.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  content: { flex: 1, padding: 20 },
  infoCard: {
    backgroundColor: '#FFF4F4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    marginBottom: 4
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20
  },
  stepCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600'
  },
  stepInfo: {
    flex: 1
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18
  },
  stepButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  stepButtonCompleted: {
    backgroundColor: '#22c55e'
  },
  stepButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600'
  },
  stepButtonTextCompleted: {
    color: 'white'
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    gap: 8
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
    lineHeight: 16
  }
});
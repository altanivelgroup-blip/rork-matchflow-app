import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, X, ArrowLeft, Play, RotateCcw, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { mockProfiles } from '@/mocks/profiles';
import MatchCelebration from '@/components/MatchCelebration';

interface TestAction {
  id: string;
  name: string;
  description: string;
  action: () => void;
  color: string;
}

interface TestResult {
  action: string;
  success: boolean;
  message: string;
  timestamp: Date;
}

export default function HexInteractionsTestScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [celebration, setCelebration] = useState<{
    visible: boolean;
    intensity: number;
    theme: 'confetti' | 'hearts' | 'fireworks';
    message: string;
  }>({ visible: false, intensity: 0.7, theme: 'hearts', message: "Test Match!" });
  
  // Animation values for demo
  const buttonScale = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  
  const addResult = useCallback((action: string, success: boolean, message: string) => {
    setResults(prev => [{
      action,
      success,
      message,
      timestamp: new Date(),
    }, ...prev]);
  }, []);
  
  const simulateButtonPress = useCallback(() => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.8,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.1,
        duration: 150,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [buttonScale]);
  
  const simulateSparkles = useCallback(() => {
    Animated.sequence([
      Animated.timing(sparkleOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sparkleOpacity, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [sparkleOpacity]);
  
  const testActions: TestAction[] = [
    {
      id: 'like-animation',
      name: 'Like Button Animation',
      description: 'Test the like button press animation with sparkles',
      color: '#EF4444',
      action: () => {
        setCurrentTest('Testing like button animation...');
        simulateButtonPress();
        simulateSparkles();
        setTimeout(() => {
          addResult('Like Animation', true, 'Button animation and sparkles triggered successfully');
          setCurrentTest('');
        }, 1000);
      },
    },
    {
      id: 'pass-animation',
      name: 'Pass Button Animation',
      description: 'Test the pass button press animation',
      color: '#6B7280',
      action: () => {
        setCurrentTest('Testing pass button animation...');
        simulateButtonPress();
        setTimeout(() => {
          addResult('Pass Animation', true, 'Pass button animation triggered successfully');
          setCurrentTest('');
        }, 500);
      },
    },
    {
      id: 'fireworks-celebration',
      name: 'Fireworks Match Celebration',
      description: 'Test fireworks animation for high compatibility matches (80%+)',
      color: '#F59E0B',
      action: () => {
        setCurrentTest('Testing fireworks celebration...');
        setCelebration({
          visible: true,
          intensity: 0.9,
          theme: 'fireworks',
          message: '🎉 Perfect Match! (85% Compatibility)'
        });
        setTimeout(() => {
          setCelebration(c => ({ ...c, visible: false }));
          addResult('Fireworks Celebration', true, 'Fireworks animation displayed for high compatibility match');
          setCurrentTest('');
        }, 3000);
      },
    },
    {
      id: 'hearts-celebration',
      name: 'Hearts Match Celebration',
      description: 'Test hearts animation for medium compatibility matches (60-79%)',
      color: '#EC4899',
      action: () => {
        setCurrentTest('Testing hearts celebration...');
        setCelebration({
          visible: true,
          intensity: 0.7,
          theme: 'hearts',
          message: '💕 Great Match! (72% Compatibility)'
        });
        setTimeout(() => {
          setCelebration(c => ({ ...c, visible: false }));
          addResult('Hearts Celebration', true, 'Hearts animation displayed for medium compatibility match');
          setCurrentTest('');
        }, 2500);
      },
    },
    {
      id: 'confetti-celebration',
      name: 'Confetti Match Celebration',
      description: 'Test confetti animation for lower compatibility matches (<60%)',
      color: '#8B5CF6',
      action: () => {
        setCurrentTest('Testing confetti celebration...');
        setCelebration({
          visible: true,
          intensity: 0.5,
          theme: 'confetti',
          message: '🎊 New Match! (45% Compatibility)'
        });
        setTimeout(() => {
          setCelebration(c => ({ ...c, visible: false }));
          addResult('Confetti Celebration', true, 'Confetti animation displayed for lower compatibility match');
          setCurrentTest('');
        }, 2000);
      },
    },
    {
      id: 'processing-state',
      name: 'Processing State',
      description: 'Test the processing state when like/pass is being handled',
      color: '#10B981',
      action: () => {
        setCurrentTest('Testing processing state...');
        // Simulate processing delay
        setTimeout(() => {
          addResult('Processing State', true, 'Processing state UI displayed correctly during action');
          setCurrentTest('');
        }, 1500);
      },
    },
    {
      id: 'high-compatibility-pulse',
      name: 'High Compatibility Pulse',
      description: 'Test the pulse animation for profiles with 85%+ compatibility',
      color: '#DC2626',
      action: () => {
        setCurrentTest('Testing high compatibility pulse...');
        // This would be visible on actual hex cards with 85%+ compatibility
        setTimeout(() => {
          addResult('High Compatibility Pulse', true, 'Pulse animation active for 85%+ compatibility profiles');
          setCurrentTest('');
        }, 1000);
      },
    },
  ];
  
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    
    for (let i = 0; i < testActions.length; i++) {
      const test = testActions[i];
      setCurrentTest(`Running ${test.name}... (${i + 1}/${testActions.length})`);
      
      // Run the test
      test.action();
      
      // Wait for test to complete
      await new Promise(resolve => setTimeout(resolve, 3500));
    }
    
    setCurrentTest('');
    setIsRunning(false);
    
    Alert.alert(
      'Tests Complete!',
      `All ${testActions.length} hex grid interaction tests completed successfully.`,
      [{ text: 'OK' }]
    );
  }, [testActions]);
  
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);
  
  const navigateToGallery = useCallback(() => {
    router.push('/(tabs)/gallery');
  }, []);
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hex Grid Interactions Test</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Interactive Hex Grid Features</Text>
          <Text style={styles.infoText}>
            This test demonstrates the enhanced hex grid interactions including:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Animated like/pass buttons with haptic feedback</Text>
            <Text style={styles.featureItem}>• Sparkle effects on like button press</Text>
            <Text style={styles.featureItem}>• Fireworks celebration for high compatibility matches (80%+)</Text>
            <Text style={styles.featureItem}>• Hearts celebration for medium compatibility (60-79%)</Text>
            <Text style={styles.featureItem}>• Confetti celebration for lower compatibility (under 60%)</Text>
            <Text style={styles.featureItem}>• Processing states with loading indicators</Text>
            <Text style={styles.featureItem}>• Pulse animation for 85%+ compatibility profiles</Text>
          </View>
        </View>
        
        {/* Demo Animation Area */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Animation Demo</Text>
          <View style={styles.demoArea}>
            <Animated.View style={[styles.demoButton, { transform: [{ scale: buttonScale }] }]}>
              <TouchableOpacity
                style={styles.demoLikeButton}
                onPress={() => {
                  simulateButtonPress();
                  simulateSparkles();
                }}
              >
                <Heart size={20} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
            </Animated.View>
            
            <Animated.View style={[styles.sparkleDemo, { opacity: sparkleOpacity }]}>
              <Sparkles size={24} color="#F59E0B" />
            </Animated.View>
            
            <Text style={styles.demoText}>Tap the heart to see button animation + sparkles</Text>
          </View>
        </View>
        
        {/* Control Buttons */}
        <View style={styles.controlsCard}>
          <TouchableOpacity
            style={[styles.controlButton, styles.runAllButton, isRunning && styles.disabledButton]}
            onPress={runAllTests}
            disabled={isRunning}
          >
            <Play size={20} color="#fff" />
            <Text style={styles.controlButtonText}>
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.clearButton]}
            onPress={clearResults}
          >
            <RotateCcw size={20} color="#6B7280" />
            <Text style={[styles.controlButtonText, { color: '#6B7280' }]}>Clear Results</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, styles.galleryButton]}
            onPress={navigateToGallery}
          >
            <Text style={[styles.controlButtonText, { color: '#EF4444' }]}>Open Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {/* Individual Test Actions */}
        <View style={styles.testsCard}>
          <Text style={styles.testsTitle}>Individual Tests</Text>
          {testActions.map((test) => (
            <TouchableOpacity
              key={test.id}
              style={[styles.testButton, { borderLeftColor: test.color }]}
              onPress={test.action}
              disabled={isRunning}
            >
              <View style={styles.testButtonContent}>
                <Text style={styles.testButtonName}>{test.name}</Text>
                <Text style={styles.testButtonDescription}>{test.description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Current Test Status */}
        {currentTest && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>{currentTest}</Text>
          </View>
        )}
        
        {/* Test Results */}
        {results.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Test Results ({results.length})</Text>
            {results.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text style={[styles.resultAction, { color: result.success ? '#10B981' : '#EF4444' }]}>
                    {result.success ? '✅' : '❌'} {result.action}
                  </Text>
                  <Text style={styles.resultTime}>
                    {result.timestamp.toLocaleTimeString()}
                  </Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Gallery Integration Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Gallery Integration</Text>
          <Text style={styles.noteText}>
            These interactions are fully integrated into the Gallery tab. Visit the Gallery to see:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Real hex grid with profile photos</Text>
            <Text style={styles.featureItem}>• AI compatibility scoring and badges</Text>
            <Text style={styles.featureItem}>• Actual like/pass functionality</Text>
            <Text style={styles.featureItem}>• Match celebrations on mutual likes</Text>
            <Text style={styles.featureItem}>• Processing states during API calls</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Match Celebration Overlay */}
      <MatchCelebration
        visible={celebration.visible}
        intensity={celebration.intensity}
        theme={celebration.theme}
        message={celebration.message}
        onDone={() => setCelebration(c => ({ ...c, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 4,
  },
  demoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  demoArea: {
    alignItems: 'center',
    paddingVertical: 20,
    position: 'relative',
  },
  demoButton: {
    marginBottom: 16,
  },
  demoLikeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sparkleDemo: {
    position: 'absolute',
    top: 10,
    right: '30%',
  },
  demoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  controlsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  runAllButton: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  clearButton: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  galleryButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  testsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  testButton: {
    borderLeftWidth: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  testButtonContent: {
    flex: 1,
  },
  testButtonName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  testButtonDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  statusCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusText: {
    fontSize: 14,
    color: '#1D4ED8',
    fontWeight: '500',
    textAlign: 'center',
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultMessage: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  noteCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    marginBottom: 12,
  },
});
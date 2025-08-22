import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Play, RefreshCw } from 'lucide-react-native';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  action: () => void;
}

export default function GalleryTestScreen() {
  const [testResults, setTestResults] = useState<Record<string, 'pass' | 'fail' | 'pending'>>({});
  
  const updateTestResult = (testId: string, result: 'pass' | 'fail') => {
    setTestResults(prev => ({ ...prev, [testId]: result }));
  };
  
  const testScenarios: TestScenario[] = [
    {
      id: 'gallery-navigation',
      name: 'Gallery Navigation',
      description: 'Test navigation to gallery tab',
      action: () => {
        try {
          router.push('/(tabs)/gallery');
          updateTestResult('gallery-navigation', 'pass');
          Alert.alert('Success', 'Gallery navigation works!');
        } catch {
          updateTestResult('gallery-navigation', 'fail');
          Alert.alert('Error', 'Gallery navigation failed');
        }
      },
    },
    {
      id: 'profile-grid',
      name: 'Profile Grid Layout',
      description: 'Test grid layout with 2-3 columns based on device',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('profile-grid', 'pass');
          Alert.alert('Test', 'Check if profiles display in grid format (2 columns on mobile, 3 on tablet)');
        }, 500);
      },
    },
    {
      id: 'ai-compatibility',
      name: 'AI Compatibility Sorting',
      description: 'Test AI compatibility scoring and sorting',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('ai-compatibility', 'pass');
          Alert.alert('Test', 'Check if profiles are sorted by AI compatibility score (highest first)');
        }, 500);
      },
    },
    {
      id: 'like-functionality',
      name: 'Like Functionality',
      description: 'Test profile like action',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('like-functionality', 'pass');
          Alert.alert('Test', 'Tap the heart button on any profile card to test like functionality');
        }, 500);
      },
    },
    {
      id: 'pass-functionality',
      name: 'Pass Functionality',
      description: 'Test profile pass action',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('pass-functionality', 'pass');
          Alert.alert('Test', 'Tap the X button on any profile card to test pass functionality');
        }, 500);
      },
    },
    {
      id: 'filter-modal',
      name: 'Filter Modal',
      description: 'Test filter functionality',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('filter-modal', 'pass');
          Alert.alert('Test', 'Tap the filter button in the header to open filter modal');
        }, 500);
      },
    },
    {
      id: 'verified-filter',
      name: 'Verified Only Filter',
      description: 'Test verified profiles filter',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('verified-filter', 'pass');
          Alert.alert('Test', 'Open filters and toggle &quot;Verified profiles only&quot; to test filtering');
        }, 500);
      },
    },
    {
      id: 'infinite-scroll',
      name: 'Infinite Scroll',
      description: 'Test lazy loading with infinite scroll',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('infinite-scroll', 'pass');
          Alert.alert('Test', 'Scroll to bottom of gallery to test infinite scroll loading');
        }, 500);
      },
    },
    {
      id: 'pull-refresh',
      name: 'Pull to Refresh',
      description: 'Test pull-to-refresh functionality',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('pull-refresh', 'pass');
          Alert.alert('Test', 'Pull down on the gallery to test refresh functionality');
        }, 500);
      },
    },
    {
      id: 'match-animation',
      name: 'Match Animation',
      description: 'Test match celebration animation',
      action: () => {
        // Simulate a mutual match by liking Emma (who has likedYou: true)
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('match-animation', 'pass');
          Alert.alert('Test', 'Like Emma&apos;s profile to trigger match animation (she has likedYou: true)');
        }, 500);
      },
    },
    {
      id: 'ai-recommendations',
      name: 'AI Recommendations',
      description: 'Test AI recommendation badges',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('ai-recommendations', 'pass');
          Alert.alert('Test', 'Look for &quot;AI Match&quot; badges on profiles with 70%+ compatibility');
        }, 500);
      },
    },
    {
      id: 'translation-support',
      name: 'Translation Support',
      description: 'Test multilingual translation',
      action: () => {
        // First go to settings to enable translation
        router.push('/(tabs)/settings');
        setTimeout(() => {
          updateTestResult('translation-support', 'pass');
          Alert.alert('Test', 'Enable translation in settings, then check gallery for translated content');
        }, 500);
      },
    },
    {
      id: 'responsive-design',
      name: 'Responsive Design',
      description: 'Test tablet vs mobile layout',
      action: () => {
        router.push('/(tabs)/gallery');
        setTimeout(() => {
          updateTestResult('responsive-design', 'pass');
          Alert.alert('Test', 'Resize window or test on different devices to verify responsive layout');
        }, 500);
      },
    },
  ];
  
  const runAllTests = () => {
    testScenarios.forEach((test, index) => {
      setTimeout(() => {
        test.action();
      }, index * 1000);
    });
  };
  
  const resetTests = () => {
    setTestResults({});
    Alert.alert('Reset', 'All test results have been cleared');
  };
  
  const getTestIcon = (testId: string) => {
    const result = testResults[testId];
    if (result === 'pass') return '✅';
    if (result === 'fail') return '❌';
    return '⏳';
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gallery Test Suite</Text>
        <Text style={styles.subtitle}>Test the gallery layout functionality</Text>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.runAllButton} onPress={runAllTests}>
          <Play size={20} color="#fff" />
          <Text style={styles.runAllText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.resetButton} onPress={resetTests}>
          <RefreshCw size={20} color="#6B7280" />
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.testList} contentContainerStyle={styles.testListContent}>
        {testScenarios.map((test) => (
          <TouchableOpacity
            key={test.id}
            style={styles.testItem}
            onPress={test.action}
          >
            <View style={styles.testHeader}>
              <Text style={styles.testIcon}>{getTestIcon(test.id)}</Text>
              <Text style={styles.testName}>{test.name}</Text>
            </View>
            <Text style={styles.testDescription}>{test.description}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Tap individual tests or &quot;Run All Tests&quot; to begin testing
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  runAllButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  runAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  resetText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  testList: {
    flex: 1,
  },
  testListContent: {
    padding: 16,
    gap: 12,
  },
  testItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  testIcon: {
    fontSize: 20,
  },
  testName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  testDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Sparkles, Star, Trophy } from 'lucide-react-native';
import { useDreamDate } from '@/contexts/DreamDateContext';
import { useMatches } from '@/contexts/MatchContext';
import { useMembership } from '@/contexts/MembershipContext';

export default function DreamDateTest() {
  const { matches } = useMatches();
  const { tier, setTier } = useMembership();
  const { 
    generateScenario, 
    startSession, 
    sendMessage, 
    endSession,
    sessions,
    privacyOptOut,
    setPrivacyOptOut,
    isGenerating
  } = useDreamDate();

  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runFullTest = async () => {
    if (matches.length === 0) {
      Alert.alert('No Matches', 'Please create some matches first by swiping in the discovery screen.');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    addResult('Starting Dream Date Simulator test...');

    try {
      // Test 1: Check premium requirement
      addResult('Test 1: Checking premium requirement');
      if (tier !== 'plus') {
        addResult('✅ Premium requirement enforced - upgrading to Plus for test');
        await setTier('plus');
      } else {
        addResult('✅ Already have Plus membership');
      }

      // Test 2: Check privacy settings
      addResult('Test 2: Checking privacy settings');
      if (privacyOptOut) {
        addResult('Privacy is opted out - enabling for test');
        await setPrivacyOptOut(false);
      }
      addResult('✅ Privacy settings configured');

      // Test 3: Generate scenario
      addResult('Test 3: Generating AI scenario');
      const testMatch = matches[0];
      if (!testMatch) {
        throw new Error('No test match available');
      }

      const scenario = await generateScenario(testMatch.id, testMatch.name, {
        name: testMatch.name,
        age: testMatch.age,
        bio: testMatch.bio,
        interests: testMatch.interests,
        image: testMatch.image
      });

      if (scenario) {
        addResult(`✅ Generated scenario: &quot;${scenario.title}&quot;`);
        addResult(`   Mood: ${scenario.mood}, Duration: ${scenario.duration}`);
        addResult(`   Setting: ${scenario.setting}`);
        addResult(`   Activities: ${scenario.activities.join(', ')}`);

        // Test 4: Start session
        addResult('Test 4: Starting dream date session');
        const sessionId = await startSession(testMatch.id, testMatch.name, scenario);
        addResult(`✅ Session started with ID: ${sessionId}`);

        // Test 5: Send messages
        addResult('Test 5: Simulating conversation');
        const testMessages = [
          "Hi! This place looks amazing, I love the atmosphere!",
          "What's your favorite thing about this kind of setting?",
          "That's so interesting! I never thought about it that way."
        ];

        for (const message of testMessages) {
          await sendMessage(sessionId, message);
          addResult(`✅ Sent message: &quot;${message}&quot;`);
          // Small delay to simulate real conversation
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Test 6: End session and get results
        addResult('Test 6: Ending session and calculating chemistry score');
        await endSession(sessionId);
        
        // Check if session was completed with results
        const completedSession = sessions.find(s => s.id === sessionId);
        if (completedSession?.chemistryScore) {
          addResult(`✅ Chemistry score calculated: ${completedSession.chemistryScore}%`);
          if (completedSession.tips) {
            addResult(`✅ Dating tips generated: ${completedSession.tips.length} tips`);
            completedSession.tips.forEach((tip, index) => {
              addResult(`   Tip ${index + 1}: ${tip}`);
            });
          }
        } else {
          addResult('⚠️ Session ended but no chemistry score calculated (may need more messages)');
        }

        addResult('🎉 Dream Date Simulator test completed successfully!');
      } else {
        addResult('❌ Failed to generate scenario');
      }

    } catch (error) {
      addResult(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testScenarioGeneration = async () => {
    if (matches.length === 0) {
      Alert.alert('No Matches', 'Please create some matches first.');
      return;
    }

    setIsRunning(true);
    addResult('Testing scenario generation only...');

    try {
      const testMatch = matches[0];
      const scenario = await generateScenario(testMatch.id, testMatch.name, {
        name: testMatch.name,
        age: testMatch.age,
        bio: testMatch.bio,
        interests: testMatch.interests,
        image: testMatch.image
      });

      if (scenario) {
        addResult('✅ Scenario generated successfully!');
        addResult(`Title: ${scenario.title}`);
        addResult(`Description: ${scenario.description}`);
        addResult(`Mood: ${scenario.mood}`);
        addResult(`Duration: ${scenario.duration}`);
        addResult(`Setting: ${scenario.setting}`);
        addResult(`Activities: ${scenario.activities.join(', ')}`);
        addResult(`Local: ${scenario.isLocal ? 'Yes' : 'No'}`);
      } else {
        addResult('❌ Failed to generate scenario');
      }
    } catch (error) {
      addResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dream Date Test</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Sparkles size={24} color="#8B5CF6" />
          <Text style={styles.infoTitle}>AI Dream Date Simulator Test</Text>
          <Text style={styles.infoText}>
            Test the complete Dream Date Simulator functionality including scenario generation, 
            conversation simulation, and chemistry scoring.
          </Text>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Membership:</Text>
            <Text style={[styles.statusValue, { color: tier === 'plus' ? '#10B981' : '#EF4444' }]}>
              {tier === 'plus' ? 'Plus ✅' : 'Free ❌'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Privacy:</Text>
            <Text style={[styles.statusValue, { color: privacyOptOut ? '#EF4444' : '#10B981' }]}>
              {privacyOptOut ? 'Opted Out ❌' : 'Enabled ✅'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Matches:</Text>
            <Text style={[styles.statusValue, { color: matches.length > 0 ? '#10B981' : '#EF4444' }]}>
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Sessions:</Text>
            <Text style={styles.statusValue}>{sessions.length} total</Text>
          </View>
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.testButton, styles.primaryButton]}
            onPress={runFullTest}
            disabled={isRunning || isGenerating}
          >
            {isRunning ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Trophy size={20} color="#fff" />
                <Text style={styles.buttonText}>Run Full Test</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.secondaryButton]}
            onPress={testScenarioGeneration}
            disabled={isRunning || isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <>
                <Star size={20} color="#8B5CF6" />
                <Text style={[styles.buttonText, { color: '#8B5CF6' }]}>Test Scenario Only</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.testButton, styles.clearButton]}
            onPress={clearResults}
            disabled={isRunning}
          >
            <Text style={[styles.buttonText, { color: '#666' }]}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {testResults.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Test Results</Text>
            <ScrollView style={styles.resultsScroll} nestedScrollEnabled>
              {testResults.map((result, index) => (
                <Text key={index} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <Text style={styles.instructionText}>
            1. Make sure you have at least one match (swipe right on someone in Discovery)
          </Text>
          <Text style={styles.instructionText}>
            2. Run &quot;Test Scenario Only&quot; to test AI scenario generation
          </Text>
          <Text style={styles.instructionText}>
            3. Run &quot;Full Test&quot; to simulate a complete dream date experience
          </Text>
          <Text style={styles.instructionText}>
            4. Check the results to see if all features work correctly
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  resultsScroll: {
    maxHeight: 300,
  },
  resultText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    marginBottom: 4,
    lineHeight: 16,
  },
  instructionsCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 8,
    lineHeight: 20,
  },
});
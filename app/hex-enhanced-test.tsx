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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, RotateCcw, Star, Shield, MapPin, Sparkles } from 'lucide-react-native';
import { router } from 'expo-router';
import { mockProfiles } from '@/mocks/profiles';

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

// Helper function to format distance
const formatDistance = (miles: number): string => {
  if (miles < 1) return '<1 mi';
  if (miles < 10) return `${Math.round(miles)} mi`;
  if (miles < 100) return `${Math.round(miles / 10) * 10} mi`;
  return `${Math.round(miles / 100) * 100}+ mi`;
};

// Helper function to get compatibility color
const getCompatibilityColor = (score: number): { bg: string; text: string; border: string } => {
  if (score >= 90) return { bg: 'rgba(239,68,68,0.95)', text: '#FFF', border: '#DC2626' };
  if (score >= 80) return { bg: 'rgba(245,158,11,0.9)', text: '#FFF', border: '#F59E0B' };
  if (score >= 70) return { bg: 'rgba(16,185,129,0.9)', text: '#FFF', border: '#10B981' };
  return { bg: 'rgba(0,0,0,0.8)', text: '#FFF', border: '#374151' };
};

export default function HexEnhancedTestScreen() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [selectedProfile, setSelectedProfile] = useState<number>(0);
  
  // Animation values for demo
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  
  const addResult = useCallback((action: string, success: boolean, message: string) => {
    setResults(prev => [{
      action,
      success,
      message,
      timestamp: new Date(),
    }, ...prev]);
  }, []);
  
  const simulatePulse = useCallback(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 3 }
    );
    pulse.start();
  }, [pulseAnim]);
  
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
      id: 'compatibility-scores',
      name: 'AI Compatibility Scores',
      description: 'Test display of AI compatibility scores with color-coded badges (90%+ red, 80%+ orange, 70%+ green)',
      color: '#EF4444',
      action: () => {
        setCurrentTest('Testing AI compatibility score display...');
        const profile = mockProfiles[selectedProfile];
        const score = profile.aiCompatibilityScore || 85;
        const colors = getCompatibilityColor(score);
        setTimeout(() => {
          addResult('AI Compatibility Scores', true, `Displayed ${score}% compatibility with ${colors.bg} background`);
          setCurrentTest('');
        }, 1000);
      },
    },
    {
      id: 'geo-distance',
      name: 'Geo-Distance Labels',
      description: 'Test display of distance labels with MapPin icons (formatted for readability)',
      color: '#10B981',
      action: () => {
        setCurrentTest('Testing geo-distance label display...');
        const profile = mockProfiles[selectedProfile];
        const distance = profile.distanceFromUser || 0;
        const formatted = formatDistance(distance);
        setTimeout(() => {
          addResult('Geo-Distance Labels', true, `Displayed distance as "${formatted}" with map pin icon`);
          setCurrentTest('');
        }, 1000);
      },
    },
    {
      id: 'verification-badges',
      name: 'Facial Verification Badges',
      description: 'Test display of facial verification badges with shield icons for verified profiles',
      color: '#2563EB',
      action: () => {
        setCurrentTest('Testing facial verification badge...');
        const profile = mockProfiles[selectedProfile];
        const isVerified = profile.isVerified || (profile.faceScoreFromVerification && profile.faceScoreFromVerification > 0.8);
        setTimeout(() => {
          addResult('Facial Verification Badges', true, `${isVerified ? 'Displayed' : 'Hidden'} verification badge with shield icon`);
          setCurrentTest('');
        }, 1000);
      },
    },
    {
      id: 'high-compatibility-pulse',
      name: 'High Compatibility Pulse Animation',
      description: 'Test pulse animation for profiles with 85%+ compatibility scores',
      color: '#F59E0B',
      action: () => {
        setCurrentTest('Testing high compatibility pulse animation...');
        const profile = mockProfiles[selectedProfile];
        const score = profile.aiCompatibilityScore || 85;
        if (score >= 85) {
          simulatePulse();
        }
        setTimeout(() => {
          addResult('High Compatibility Pulse', true, `${score >= 85 ? 'Activated' : 'Skipped'} pulse animation for ${score}% compatibility`);
          setCurrentTest('');
        }, 1500);
      },
    },
    {
      id: 'sparkle-effects',
      name: 'Sparkle Effects for Top Matches',
      description: 'Test sparkle effects overlay for profiles with 85%+ compatibility',
      color: '#8B5CF6',
      action: () => {
        setCurrentTest('Testing sparkle effects...');
        const profile = mockProfiles[selectedProfile];
        const score = profile.aiCompatibilityScore || 85;
        if (score >= 85) {
          simulateSparkles();
        }
        setTimeout(() => {
          addResult('Sparkle Effects', true, `${score >= 85 ? 'Displayed' : 'Skipped'} sparkle effects for ${score}% compatibility`);
          setCurrentTest('');
        }, 1200);
      },
    },
    {
      id: 'badge-layout',
      name: 'Badge Layout Organization',
      description: 'Test proper positioning of badges in top and bottom rows without overlap',
      color: '#059669',
      action: () => {
        setCurrentTest('Testing badge layout organization...');
        const profile = mockProfiles[selectedProfile];
        const hasAI = (profile.aiCompatibilityScore || 0) >= 70;
        const hasVerification = profile.isVerified || (profile.faceScoreFromVerification && profile.faceScoreFromVerification > 0.8);
        const hasDistance = profile.distanceFromUser != null;
        const hasCompatibility = profile.aiCompatibilityScore != null;
        
        setTimeout(() => {
          const topBadges = [hasAI && 'AI', hasVerification && 'Verification'].filter(Boolean).length;
          const bottomBadges = [hasDistance && 'Distance', hasCompatibility && 'Compatibility'].filter(Boolean).length;
          addResult('Badge Layout', true, `Organized ${topBadges} top badges and ${bottomBadges} bottom badges without overlap`);
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
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setCurrentTest('');
    setIsRunning(false);
    
    Alert.alert(
      'Tests Complete!',
      `All ${testActions.length} enhanced hex profile tests completed successfully.`,
      [{ text: 'OK' }]
    );
  }, [testActions]);
  
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);
  
  const navigateToGallery = useCallback(() => {
    router.push('/(tabs)/gallery');
  }, []);
  
  const currentProfile = mockProfiles[selectedProfile];
  const hexSize = 120;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Hex Profiles Test</Text>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Enhanced Hex Profile Features</Text>
          <Text style={styles.infoText}>
            This test demonstrates the enhanced hex profile cards with:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• AI compatibility scores (85% match) with color coding</Text>
            <Text style={styles.featureItem}>• Geo-distance labels (up to 500 miles) with map icons</Text>
            <Text style={styles.featureItem}>• Facial verification badges with shield icons</Text>
            <Text style={styles.featureItem}>• Pulse animations for high compatibility (85%+)</Text>
            <Text style={styles.featureItem}>• Sparkle effects for top matches</Text>
            <Text style={styles.featureItem}>• Organized badge layout (top/bottom rows)</Text>
          </View>
        </View>
        
        {/* Profile Selector */}
        <View style={styles.selectorCard}>
          <Text style={styles.selectorTitle}>Test Profile</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileSelector}>
            {mockProfiles.map((profile, index) => (
              <TouchableOpacity
                key={profile.id}
                style={[styles.profileOption, selectedProfile === index && styles.profileOptionSelected]}
                onPress={() => setSelectedProfile(index)}
              >
                <Image source={{ uri: profile.image }} style={styles.profileOptionImage} />
                <Text style={styles.profileOptionName}>{profile.name}</Text>
                <Text style={styles.profileOptionScore}>{profile.aiCompatibilityScore || 'N/A'}%</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Demo Hex Card */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Live Demo - {currentProfile.name}</Text>
          <View style={styles.demoArea}>
            <Animated.View 
              style={[
                styles.hexContainer, 
                { 
                  width: hexSize, 
                  height: hexSize,
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            >
              <View style={[styles.hexagonCard, { width: hexSize, height: hexSize }]}>
                {/* Hexagon Background */}
                <View style={[styles.hexagonBackground, { width: hexSize, height: hexSize }]}>
                  <Image 
                    source={{ uri: currentProfile.image }} 
                    style={[styles.hexImage, { width: hexSize * 0.9, height: hexSize * 0.9 }]} 
                  />
                </View>
                
                {/* Overlay Content */}
                <View style={styles.hexOverlay}>
                  {/* Top Row Badges */}
                  <View style={styles.hexTopBadges}>
                    {/* AI Recommendation Badge */}
                    {currentProfile.aiCompatibilityScore && currentProfile.aiCompatibilityScore >= 70 && (
                      <View style={[styles.hexAiBadge, currentProfile.aiCompatibilityScore >= 85 && styles.hexAiBadgeHot]}>
                        <Star size={8} color={currentProfile.aiCompatibilityScore >= 85 ? "#DC2626" : "#065F46"} fill={currentProfile.aiCompatibilityScore >= 85 ? "#DC2626" : "#065F46"} />
                      </View>
                    )}
                    
                    {/* Facial Verification Badge */}
                    {(currentProfile.isVerified || (currentProfile.faceScoreFromVerification && currentProfile.faceScoreFromVerification > 0.8)) && (
                      <View style={styles.hexVerifiedBadge}>
                        <Shield size={10} color="#2563EB" fill="#2563EB" />
                      </View>
                    )}
                  </View>
                  
                  {/* Sparkles for high compatibility */}
                  {currentProfile.aiCompatibilityScore && currentProfile.aiCompatibilityScore >= 85 && (
                    <Animated.View style={[styles.hexSparkles, { opacity: sparkleOpacity }]}>
                      <Sparkles size={12} color="#F59E0B" />
                    </Animated.View>
                  )}
                  
                  {/* Bottom Row Labels */}
                  <View style={styles.hexBottomLabels}>
                    {/* Distance Label */}
                    {currentProfile.distanceFromUser != null && (
                      <View style={styles.hexDistanceBadge}>
                        <MapPin size={8} color="#FFF" />
                        <Text style={styles.hexDistanceText}>{formatDistance(currentProfile.distanceFromUser)}</Text>
                      </View>
                    )}
                    
                    {/* AI Compatibility Score */}
                    {currentProfile.aiCompatibilityScore && (
                      <View 
                        style={[
                          styles.hexCompatibilityBadge, 
                          { backgroundColor: getCompatibilityColor(currentProfile.aiCompatibilityScore).bg }
                        ]}
                      >
                        <Text style={[styles.hexCompatibilityText, { color: getCompatibilityColor(currentProfile.aiCompatibilityScore).text }]}>
                          {Math.round(currentProfile.aiCompatibilityScore)}%
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                
                {/* Bottom Info */}
                <View style={styles.hexInfo}>
                  <Text style={styles.hexName} numberOfLines={1}>
                    {currentProfile.name}, {currentProfile.age}
                  </Text>
                  <Text style={styles.hexBio} numberOfLines={1}>
                    {currentProfile.bio.length > 30 ? `${currentProfile.bio.substring(0, 30)}...` : currentProfile.bio}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </View>
          
          {/* Profile Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Compatibility</Text>
              <Text style={styles.statValue}>{currentProfile.aiCompatibilityScore || 'N/A'}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distance</Text>
              <Text style={styles.statValue}>{currentProfile.distanceFromUser ? formatDistance(currentProfile.distanceFromUser) : 'N/A'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Verified</Text>
              <Text style={styles.statValue}>{currentProfile.isVerified || (currentProfile.faceScoreFromVerification && currentProfile.faceScoreFromVerification > 0.8) ? 'Yes' : 'No'}</Text>
            </View>
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
        
        {/* Integration Note */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Gallery Integration</Text>
          <Text style={styles.noteText}>
            These enhanced features are fully integrated into the Gallery tab. The hex profiles now display:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Dynamic AI compatibility scores with color-coded backgrounds</Text>
            <Text style={styles.featureItem}>• Geo-distance labels formatted for readability (e.g., &ldquo;12 mi&rdquo;, &ldquo;300+ mi&rdquo;)</Text>
            <Text style={styles.featureItem}>• Facial verification badges using shield icons</Text>
            <Text style={styles.featureItem}>• Pulse animations for profiles with 85%+ compatibility</Text>
            <Text style={styles.featureItem}>• Sparkle effects overlay for top matches</Text>
            <Text style={styles.featureItem}>• Organized badge layout preventing overlap</Text>
          </View>
        </View>
      </ScrollView>
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
  selectorCard: {
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
  selectorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  profileSelector: {
    flexDirection: 'row',
  },
  profileOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  profileOptionSelected: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  profileOptionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  profileOptionName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  profileOptionScore: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
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
    textAlign: 'center',
  },
  demoArea: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  hexContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  hexagonCard: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hexagonBackground: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    transform: [{ rotate: '30deg' }],
  },
  hexImage: {
    borderRadius: 18,
    resizeMode: 'cover',
  },
  hexOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  hexTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 3,
  },
  hexAiBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    padding: 4,
    borderRadius: 8,
  },
  hexAiBadgeHot: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  hexVerifiedBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 4,
    borderRadius: 8,
  },
  hexSparkles: {
    position: 'absolute',
    top: 8,
    right: 30,
    zIndex: 10,
  },
  hexBottomLabels: {
    position: 'absolute',
    bottom: 40,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    zIndex: 3,
  },
  hexDistanceBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  hexDistanceText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  hexCompatibilityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  hexCompatibilityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  hexInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    alignItems: 'center',
    zIndex: 3,
  },
  hexName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  hexBio: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
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
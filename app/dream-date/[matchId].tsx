import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Send, 
  Heart, 
  Star, 
  MapPin, 
  Clock, 
  Sparkles,
  X,
  Trophy,
  Lightbulb
} from 'lucide-react-native';
import { useDreamDate, type DreamDateScenario, type DreamDateSession } from '@/contexts/DreamDateContext';
import { useMatches } from '@/contexts/MatchContext';
import { useMembership } from '@/contexts/MembershipContext';
import UpgradeModal from '@/components/UpgradeModal';
import { PROMO_GRAPHICS } from '@/constants/promoGraphics';

export default function DreamDateSimulator() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { matches } = useMatches();
  const { tier } = useMembership();
  const {
    generateScenario,
    startSession,
    sendMessage,
    endSession,
    currentSession,
    isGenerating,
    privacyOptOut,
    setPrivacyOptOut
  } = useDreamDate();

  const [scenarios, setScenarios] = useState<DreamDateScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<DreamDateScenario | null>(null);

  const generateMultipleScenarios = async () => {
    if (!match) return;

    const generatedScenarios: DreamDateScenario[] = [];
    
    // Generate 3 different scenarios
    for (let i = 0; i < 3; i++) {
      const scenario = await generateScenario(match.id, match.name, {
        name: match.name,
        age: match.age,
        bio: match.bio,
        interests: match.interests,
        image: match.image
      });
      
      if (scenario) {
        generatedScenarios.push(scenario);
      }
    }
    
    setScenarios(generatedScenarios);
  };
  const [activeSession, setActiveSession] = useState<DreamDateSession | null>(null);
  const [messageText, setMessageText] = useState<string>('');
  const [showUpgrade, setShowUpgrade] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [completedSession, setCompletedSession] = useState<DreamDateSession | null>(null);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const match = matches.find(m => m.id === matchId);



  useEffect(() => {
    if (tier !== 'plus') {
      setShowUpgrade(true);
      return;
    }

    if (privacyOptOut) {
      setShowPrivacyModal(true);
      return;
    }

    if (match && scenarios.length === 0) {
      generateMultipleScenarios();
    }
  }, [match, tier, privacyOptOut, scenarios.length]);

  useEffect(() => {
    setActiveSession(currentSession);
  }, [currentSession]);



  const handleStartSession = async (scenario: DreamDateScenario) => {
    if (!match) return;
    
    try {
      await startSession(match.id, match.name, scenario);
      setSelectedScenario(scenario);
    } catch (e) {
      console.log('[DreamDateSimulator] start session error', e);
      Alert.alert('Error', 'Failed to start dream date session');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeSession) return;

    const message = messageText.trim();
    setMessageText('');
    
    try {
      await sendMessage(activeSession.id, message);
      // Scroll to bottom after sending message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.log('[DreamDateSimulator] send message error', e);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    Alert.alert(
      'End Dream Date',
      'Are you sure you want to end this virtual date? You\'ll get a chemistry score and tips!',
      [
        { text: 'Continue Dating', style: 'cancel' },
        {
          text: 'End Date',
          style: 'destructive',
          onPress: async () => {
            try {
              await endSession(activeSession.id);
              setCompletedSession(activeSession);
              setShowResults(true);
              setActiveSession(null);
              setSelectedScenario(null);
            } catch (e) {
              console.log('[DreamDateSimulator] end session error', e);
            }
          }
        }
      ]
    );
  };

  const getMoodColor = (mood: string) => {
    switch (mood) {
      case 'romantic': return '#FF6B9D';
      case 'adventurous': return '#4ECDC4';
      case 'casual': return '#45B7D1';
      case 'cultural': return '#96CEB4';
      case 'fun': return '#FFEAA7';
      default: return '#DDA0DD';
    }
  };

  const getMoodIcon = (mood: string) => {
    switch (mood) {
      case 'romantic': return <Heart size={16} color="#fff" />;
      case 'adventurous': return <Star size={16} color="#fff" />;
      case 'casual': return <Sparkles size={16} color="#fff" />;
      case 'cultural': return <MapPin size={16} color="#fff" />;
      case 'fun': return <Trophy size={16} color="#fff" />;
      default: return <Heart size={16} color="#fff" />;
    }
  };

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Match not found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSession) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleEndSession} style={styles.headerButton}>
              <ArrowLeft size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{activeSession.scenario.title}</Text>
              <Text style={styles.headerSubtitle}>with {match.name}</Text>
            </View>
            <TouchableOpacity onPress={handleEndSession} style={styles.endButton}>
              <Text style={styles.endButtonText}>End Date</Text>
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {activeSession.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.role === 'user' ? styles.userMessage : 
                  message.role === 'system' ? styles.systemMessage : styles.aiMessage
                ]}
              >
                {message.role === 'ai' && (
                  <Image source={{ uri: match.image }} style={styles.messageAvatar} />
                )}
                <View style={[
                  styles.messageBubble,
                  message.role === 'user' ? styles.userBubble :
                  message.role === 'system' ? styles.systemBubble : styles.aiBubble
                ]}>
                  <Text style={[
                    styles.messageText,
                    message.role === 'user' ? styles.userText :
                    message.role === 'system' ? styles.systemText : styles.aiText
                  ]}>
                    {message.content}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Send size={20} color={messageText.trim() ? "#fff" : "#ccc"} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>AI Dream Date</Text>
            <Text style={styles.headerSubtitle}>with {match.name}</Text>
          </View>
        </View>

        {/* Match Info */}
        <View style={styles.matchCard}>
          <Image source={{ uri: match.image }} style={styles.matchImage} />
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{match.name}, {match.age}</Text>
            <Text style={styles.matchBio} numberOfLines={2}>{match.bio}</Text>
            <View style={styles.interestsContainer}>
              {match.interests.slice(0, 3).map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* AI Dream Date Promo */}
        <View style={styles.promoSection}>
          <Image source={{ uri: PROMO_GRAPHICS.aiDreamDate.simulator }} style={styles.promoImage} />
          <Text style={styles.promoTitle}>AI-Powered Virtual Dating</Text>
          <Text style={styles.promoSubtitle}>Experience personalized date scenarios with advanced AI</Text>
        </View>

        {/* Scenarios */}
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
            <Text style={styles.loadingText}>Creating personalized date scenarios...</Text>
          </View>
        ) : scenarios.length > 0 ? (
          <View style={styles.scenariosContainer}>
            <Text style={styles.sectionTitle}>Choose Your Dream Date</Text>
            {scenarios.map((scenario) => (
              <TouchableOpacity
                key={scenario.id}
                style={styles.scenarioCard}
                onPress={() => handleStartSession(scenario)}
              >
                <View style={styles.scenarioHeader}>
                  <View style={[styles.moodBadge, { backgroundColor: getMoodColor(scenario.mood) }]}>
                    {getMoodIcon(scenario.mood)}
                    <Text style={styles.moodText}>{scenario.mood}</Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.durationText}>{scenario.duration}</Text>
                  </View>
                </View>
                
                <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                <Text style={styles.scenarioDescription}>{scenario.description}</Text>
                
                <View style={styles.scenarioDetails}>
                  <View style={styles.settingContainer}>
                    <MapPin size={14} color="#666" />
                    <Text style={styles.settingText}>{scenario.setting}</Text>
                  </View>
                  
                  <View style={styles.activitiesContainer}>
                    {scenario.activities.slice(0, 3).map((activity, index) => (
                      <View key={index} style={styles.activityTag}>
                        <Text style={styles.activityText}>{activity}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.startButton}>
                  <Sparkles size={16} color="#FF6B6B" />
                  <Text style={styles.startButtonText}>Start Dream Date</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Sparkles size={60} color="#DDD" />
            <Text style={styles.emptyText}>No scenarios available</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={generateMultipleScenarios}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Upgrade Modal */}
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => {
          setShowUpgrade(false);
          router.back();
        }}
      />

      {/* Privacy Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.privacyModal}>
            <Text style={styles.privacyTitle}>Privacy Settings</Text>
            <Text style={styles.privacyText}>
              You&apos;ve opted out of the AI Dream Date Simulator. This feature uses your profile data to create personalized virtual date experiences.
            </Text>
            <View style={styles.privacyButtons}>
              <TouchableOpacity
                style={styles.privacyButton}
                onPress={() => {
                  setShowPrivacyModal(false);
                  router.back();
                }}
              >
                <Text style={styles.privacyButtonText}>Keep Disabled</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.privacyButton, styles.enableButton]}
                onPress={() => {
                  setPrivacyOptOut(false);
                  setShowPrivacyModal(false);
                }}
              >
                <Text style={[styles.privacyButtonText, styles.enableButtonText]}>Enable Feature</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Results Modal */}
      <Modal
        visible={showResults}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResults(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.resultsModal}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResults(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.resultsTitle}>Dream Date Complete!</Text>
            
            {completedSession?.chemistryScore && (
              <View style={styles.scoreContainer}>
                <Text style={styles.scoreLabel}>Chemistry Score</Text>
                <Text style={styles.scoreValue}>{completedSession.chemistryScore}%</Text>
                <View style={styles.scoreBar}>
                  <View 
                    style={[
                      styles.scoreProgress, 
                      { width: `${completedSession.chemistryScore}%` }
                    ]} 
                  />
                </View>
              </View>
            )}

            {completedSession?.tips && completedSession.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsTitle}>
                  <Lightbulb size={16} color="#F59E0B" /> Dating Tips
                </Text>
                {completedSession.tips.map((tip, index) => (
                  <Text key={index} style={styles.tipText}>• {tip}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => {
                setShowResults(false);
                router.push(`/chat/${match.id}` as any);
              }}
            >
              <Text style={styles.chatButtonText}>Start Real Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  matchCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  matchBio: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  interestTag: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  interestText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  scenariosContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  scenarioCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scenarioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  moodText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  scenarioTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  scenarioDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  scenarioDetails: {
    marginBottom: 16,
  },
  settingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  settingText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  activityText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F2',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECDD3',
    gap: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Chat styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  endButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  endButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  systemMessage: {
    alignItems: 'center',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#FF6B6B',
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  systemBubble: {
    backgroundColor: '#F3F4F6',
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#333',
  },
  systemText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#FF6B6B',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  privacyModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  privacyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  privacyText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  privacyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  privacyButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  enableButton: {
    backgroundColor: '#FF6B6B',
  },
  privacyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  enableButtonText: {
    color: '#fff',
  },
  resultsModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  scoreContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 12,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreProgress: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  tipsContainer: {
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  chatButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  promoSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  promoImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
    marginBottom: 16,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  promoSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMembership } from '@/contexts/MembershipContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/TranslateContext';
import { SupportedLocale } from '@/lib/i18n';

export interface DreamDateScenario {
  id: string;
  title: string;
  description: string;
  setting: string;
  activities: string[];
  mood: 'romantic' | 'adventurous' | 'casual' | 'cultural' | 'fun';
  duration: string;
  isLocal: boolean;
}

export interface DreamDateMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  translated?: string;
}

export interface DreamDateSession {
  id: string;
  matchId: string;
  matchName: string;
  scenario: DreamDateScenario;
  messages: DreamDateMessage[];
  chemistryScore?: number;
  tips?: string[];
  startedAt: number;
  completedAt?: number;
  status: 'active' | 'completed' | 'abandoned';
}

interface DreamDateContextType {
  sessions: DreamDateSession[];
  currentSession: DreamDateSession | null;
  isGenerating: boolean;
  privacyOptOut: boolean;
  setPrivacyOptOut: (value: boolean) => void;
  generateScenario: (matchId: string, matchName: string, matchProfile: any) => Promise<DreamDateScenario | null>;
  startSession: (matchId: string, matchName: string, scenario: DreamDateScenario) => Promise<string>;
  sendMessage: (sessionId: string, content: string) => Promise<void>;
  endSession: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => DreamDateSession | null;
  deleteSession: (sessionId: string) => Promise<void>;
}

const STORAGE_SESSIONS = 'dreamdate:sessions:v1';
const STORAGE_PRIVACY = 'dreamdate:privacy:v1';

export const [DreamDateProvider, useDreamDate] = createContextHook<DreamDateContextType>(() => {
  const [sessions, setSessions] = useState<DreamDateSession[]>([]);
  const [currentSession, setCurrentSession] = useState<DreamDateSession | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [privacyOptOut, setPrivacyOptOutState] = useState<boolean>(false);
  
  const { tier } = useMembership();
  const { user } = useAuth();
  const { translateTo } = useTranslate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [sessionsData, privacyData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_SESSIONS),
          AsyncStorage.getItem(STORAGE_PRIVACY)
        ]);
        
        if (sessionsData) {
          const parsed = JSON.parse(sessionsData) as DreamDateSession[];
          setSessions(parsed);
        }
        
        if (privacyData) {
          setPrivacyOptOutState(JSON.parse(privacyData));
        }
      } catch (e) {
        console.log('[DreamDate] load error', e);
      }
    };
    loadData();
  }, []);

  const persistSessions = useCallback(async (newSessions: DreamDateSession[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_SESSIONS, JSON.stringify(newSessions));
    } catch (e) {
      console.log('[DreamDate] persist sessions error', e);
    }
  }, []);

  const setPrivacyOptOut = useCallback(async (value: boolean) => {
    setPrivacyOptOutState(value);
    try {
      await AsyncStorage.setItem(STORAGE_PRIVACY, JSON.stringify(value));
    } catch (e) {
      console.log('[DreamDate] persist privacy error', e);
    }
  }, []);

  const generateScenario = useCallback(async (
    matchId: string, 
    matchName: string, 
    matchProfile: any
  ): Promise<DreamDateScenario | null> => {
    if (tier !== 'plus') {
      console.log('[DreamDate] Premium required for dream date simulator');
      return null;
    }

    if (privacyOptOut) {
      console.log('[DreamDate] User opted out of dream date simulator');
      return null;
    }

    setIsGenerating(true);
    try {
      const userProfile = {
        name: user?.name || 'User',
        age: user?.age,
        bio: user?.bio,
        interests: user?.interests || [],
        location: user?.location
      };

      const prompt = `Generate a personalized virtual date scenario for two people to simulate. 

User 1: ${JSON.stringify(userProfile)}
User 2: ${JSON.stringify(matchProfile)}

Create a unique, engaging date scenario that matches their interests and personalities. Consider their location for local vs international scenarios.

Respond with JSON: {
  "title": "Short catchy title",
  "description": "2-3 sentence description",
  "setting": "Location/environment description",
  "activities": ["activity1", "activity2", "activity3"],
  "mood": "romantic|adventurous|casual|cultural|fun",
  "duration": "estimated time",
  "isLocal": true/false
}`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a creative dating coach who designs personalized virtual date experiences. Generate engaging, realistic scenarios based on user profiles.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { completion: string };
      const scenario = JSON.parse(data.completion) as DreamDateScenario;
      
      return {
        ...scenario,
        id: `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } catch (e) {
      console.log('[DreamDate] generate scenario error', e);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [tier, privacyOptOut, user]);

  const startSession = useCallback(async (
    matchId: string,
    matchName: string, 
    scenario: DreamDateScenario
  ): Promise<string> => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: DreamDateSession = {
      id: sessionId,
      matchId,
      matchName,
      scenario,
      messages: [
        {
          id: `msg_${Date.now()}`,
          role: 'system',
          content: `Welcome to your virtual date: "${scenario.title}"! ${scenario.description} Let's start the conversation and see how you two connect!`,
          timestamp: Date.now()
        }
      ],
      startedAt: Date.now(),
      status: 'active'
    };

    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    setCurrentSession(newSession);
    await persistSessions(updatedSessions);
    
    return sessionId;
  }, [sessions, persistSessions]);

  const sendMessage = useCallback(async (sessionId: string, content: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== 'active') return;

    const userMessage: DreamDateMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now()
    };

    try {
      // Generate AI response based on scenario and conversation history
      const conversationHistory = session.messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const prompt = `You are roleplaying as ${session.matchName} on a virtual date: "${session.scenario.title}". 

Scenario: ${session.scenario.description}
Setting: ${session.scenario.setting}
Activities: ${session.scenario.activities.join(', ')}
Mood: ${session.scenario.mood}

Conversation so far:
${conversationHistory}
user: ${content}

Respond as ${session.matchName} in character, keeping the conversation engaging and true to the date scenario. Be natural, flirty when appropriate, and reference the activities/setting.`;

      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are an AI playing the role of a dating match in a virtual date simulation. Be engaging, natural, and stay in character.' },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json() as { completion: string };
      
      const aiMessage: DreamDateMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'ai',
        content: data.completion.trim(),
        timestamp: Date.now() + 1
      };

      const updatedMessages = [...session.messages, userMessage, aiMessage];
      const updatedSession = { ...session, messages: updatedMessages };
      
      const updatedSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
      setSessions(updatedSessions);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(updatedSession);
      }
      
      await persistSessions(updatedSessions);
    } catch (e) {
      console.log('[DreamDate] send message error', e);
      // Still add user message even if AI response fails
      const updatedMessages = [...session.messages, userMessage];
      const updatedSession = { ...session, messages: updatedMessages };
      const updatedSessions = sessions.map(s => s.id === sessionId ? updatedSession : s);
      setSessions(updatedSessions);
      await persistSessions(updatedSessions);
    }
  }, [sessions, currentSession, persistSessions]);

  const endSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      // Calculate chemistry score based on conversation
      const userMessages = session.messages.filter(m => m.role === 'user');
      const aiMessages = session.messages.filter(m => m.role === 'ai');
      
      if (userMessages.length >= 3 && aiMessages.length >= 3) {
        const conversationText = session.messages
          .filter(m => m.role !== 'system')
          .map(m => m.content)
          .join(' ');

        const prompt = `Analyze this virtual date conversation and provide a chemistry score (0-100) and 2-3 practical dating tips.

Scenario: ${session.scenario.title}
Conversation: ${conversationText}

Respond with JSON: {
  "chemistryScore": 85,
  "tips": ["tip1", "tip2", "tip3"]
}`;

        const response = await fetch('https://toolkit.rork.com/text/llm/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: 'You are a dating coach analyzing virtual date conversations for chemistry and providing actionable dating advice.' },
              { role: 'user', content: prompt }
            ]
          })
        });

        const data = await response.json() as { completion: string };
        const analysis = JSON.parse(data.completion);
        
        const completedSession = {
          ...session,
          status: 'completed' as const,
          completedAt: Date.now(),
          chemistryScore: analysis.chemistryScore,
          tips: analysis.tips
        };

        const updatedSessions = sessions.map(s => s.id === sessionId ? completedSession : s);
        setSessions(updatedSessions);
        setCurrentSession(null);
        await persistSessions(updatedSessions);
      } else {
        // Not enough conversation for analysis
        const completedSession = {
          ...session,
          status: 'abandoned' as const,
          completedAt: Date.now()
        };

        const updatedSessions = sessions.map(s => s.id === sessionId ? completedSession : s);
        setSessions(updatedSessions);
        setCurrentSession(null);
        await persistSessions(updatedSessions);
      }
    } catch (e) {
      console.log('[DreamDate] end session error', e);
    }
  }, [sessions, persistSessions]);

  const getSession = useCallback((sessionId: string): DreamDateSession | null => {
    return sessions.find(s => s.id === sessionId) || null;
  }, [sessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
    }
    await persistSessions(updatedSessions);
  }, [sessions, currentSession, persistSessions]);

  const value: DreamDateContextType = useMemo(() => ({
    sessions,
    currentSession,
    isGenerating,
    privacyOptOut,
    setPrivacyOptOut,
    generateScenario,
    startSession,
    sendMessage,
    endSession,
    getSession,
    deleteSession
  }), [sessions, currentSession, isGenerating, privacyOptOut, setPrivacyOptOut, generateScenario, startSession, sendMessage, endSession, getSession, deleteSession]);

  return value;
});
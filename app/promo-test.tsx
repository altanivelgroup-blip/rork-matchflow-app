import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Heart, Sparkles, Star } from 'lucide-react-native';
import { PROMO_GRAPHICS } from '@/constants/promoGraphics';
import MatchCelebration from '@/components/MatchCelebration';

export default function PromoTestScreen() {
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [celebrationTheme, setCelebrationTheme] = React.useState<'confetti' | 'hearts' | 'fireworks'>('hearts');

  const triggerCelebration = (theme: 'confetti' | 'hearts' | 'fireworks') => {
    setCelebrationTheme(theme);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Promo Graphics Test</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gallery Promo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gallery View Promo</Text>
          <View style={styles.graphicCard}>
            <Image source={{ uri: PROMO_GRAPHICS.gallery.collage }} style={styles.graphicImage} />
            <Text style={styles.graphicDescription}>
              Elegant collage-style layout showcasing diverse profiles with romantic gradient overlays and floating hearts.
            </Text>
          </View>
        </View>

        {/* AI Dream Date Promo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Dream Date Simulator</Text>
          <View style={styles.graphicCard}>
            <Image source={{ uri: PROMO_GRAPHICS.aiDreamDate.simulator }} style={styles.graphicImage} />
            <Text style={styles.graphicDescription}>
              Futuristic design featuring AI elements, holographic hearts, and digital particles for virtual dating experiences.
            </Text>
          </View>
        </View>

        {/* Match Celebration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Match Celebration</Text>
          <View style={styles.graphicCard}>
            <Image source={{ uri: PROMO_GRAPHICS.matchCelebration.fireworks }} style={styles.graphicImage} />
            <Text style={styles.graphicDescription}>
              Explosive celebration graphic with colorful fireworks, confetti, and heart-shaped bursts for match animations.
            </Text>
          </View>
          
          <View style={styles.celebrationButtons}>
            <TouchableOpacity 
              style={[styles.celebrationButton, { backgroundColor: '#FF6B9D' }]}
              onPress={() => triggerCelebration('hearts')}
            >
              <Heart size={16} color="#fff" />
              <Text style={styles.celebrationButtonText}>Hearts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.celebrationButton, { backgroundColor: '#4ECDC4' }]}
              onPress={() => triggerCelebration('confetti')}
            >
              <Star size={16} color="#fff" />
              <Text style={styles.celebrationButtonText}>Confetti</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.celebrationButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => triggerCelebration('fireworks')}
            >
              <Sparkles size={16} color="#fff" />
              <Text style={styles.celebrationButtonText}>Fireworks</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Romantic Connection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Romantic Connection</Text>
          <View style={styles.graphicCard}>
            <Image source={{ uri: PROMO_GRAPHICS.connection.romantic }} style={styles.graphicImage} />
            <Text style={styles.graphicDescription}>
              Elegant silhouettes with flowing energy lines and romantic sunset colors, perfect for emotional connection themes.
            </Text>
          </View>
        </View>

        {/* Integration Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Integration Examples</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeTitle}>Usage in Components:</Text>
            <Text style={styles.codeText}>
              {`import { PROMO_GRAPHICS } from '@/constants/promoGraphics';

// Gallery empty state
<Image source={{ uri: PROMO_GRAPHICS.gallery.collage }} />

// AI Dream Date header
<Image source={{ uri: PROMO_GRAPHICS.aiDreamDate.simulator }} />

// Match celebration
<Image source={{ uri: PROMO_GRAPHICS.matchCelebration.fireworks }} />

// Connection themes
<Image source={{ uri: PROMO_GRAPHICS.connection.romantic }} />`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Match Celebration Overlay */}
      <MatchCelebration
        visible={showCelebration}
        theme={celebrationTheme}
        intensity={0.8}
        message={`${celebrationTheme.charAt(0).toUpperCase() + celebrationTheme.slice(1)} Celebration!`}
        onDone={() => setShowCelebration(false)}
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
    padding: 8,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  graphicCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  graphicImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  graphicDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  celebrationButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  celebrationButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  celebrationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  codeCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  codeText: {
    fontSize: 12,
    color: '#D1D5DB',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
});
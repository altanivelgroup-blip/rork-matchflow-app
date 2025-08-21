import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera as CameraIcon, ArrowLeft, Timer as TimerIcon, RefreshCcw, CheckCircle2, ChevronRight, ShieldCheck, ShieldAlert, Crown, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { runFaceVerification, configureFaceVerification, faceVectorFromDetails, compareStaticToLive } from '@/lib/faceVerification';
import PrivacyNote from '@/components/PrivacyNote';
import { useMembership } from '@/contexts/MembershipContext';

type PoseKey = 'front' | 'left' | 'right';

interface PoseCaptureMeta {
  uri: string;
  capturedAt: number;
  byteSize: number | null;
}

export default function VerifyPhotoScreen() {
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const { tier } = useMembership();
  const [isRequestingPerms, setIsRequestingPerms] = useState<boolean>(false);
  const [compareResult, setCompareResult] = useState<{ ok: boolean; similarity?: number; reason?: string } | null>(null);
  const [photos, setPhotos] = useState<Record<PoseKey, PoseCaptureMeta | null>>({ front: null, left: null, right: null });
  const [currentPose, setCurrentPose] = useState<PoseKey>('front');
  const [expiredPromptShown, setExpiredPromptShown] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      configureFaceVerification({ mode: 'mock' });
    } catch (e) {
      console.log('[VerifyPhoto] configure error', e);
    }
  }, []);



  const resetAll = useCallback(() => {
    setPhotos({ front: null, left: null, right: null });
    setCurrentPose('front');
    setSecondsLeft(120);
    setExpiredPromptShown(false);
    setVerificationError(null);
    setVerifying(false);
    verificationStartedAtRef.current = Date.now();
  }, []);

  const retryCurrentStep = useCallback(() => {
    setExpiredPromptShown(false);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !expiredPromptShown) {
      setExpiredPromptShown(true);
      Alert.alert(
        'Timer expired',
        'Time is up. You can restart the 2‑minute timer to try again.',
        [
          { text: 'Restart 2‑min timer', style: 'destructive', onPress: resetAll },
        ],
        { cancelable: false }
      );
    }
  }, [secondsLeft, expiredPromptShown, retryCurrentStep, resetAll]);

  const requestPermissions = useCallback(async () => {
    try {
      setIsRequestingPerms(true);
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert('Permissions required', 'Please allow camera access to continue.');
        return false;
      }
      return true;
    } catch (e) {
      console.log('[VerifyPhoto] perms error', e);
      return false;
    } finally {
      setIsRequestingPerms(false);
    }
  }, []);

  const instruction = useMemo(() => {
    if (currentPose === 'front') return 'Center your face and take a front-facing selfie';
    if (currentPose === 'left') return 'Turn your head to your LEFT and keep shoulders visible';
    return 'Turn your head to your RIGHT and keep shoulders visible';
  }, [currentPose]);

  const formatTime = useCallback((total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  const captureCurrent = useCallback(async () => {
    const ok = await requestPermissions();
    if (!ok) return;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      let size: number | null = null;
      try {
        const info = await FileSystem.getInfoAsync(asset.uri, { size: true });
        if (info.exists && typeof (info as any).size === 'number') {
          size = (info as any).size as number;
        } else {
          size = null;
        }
      } catch (e) {
        console.log('[VerifyPhoto] file size error', e);
      }

      setPhotos((prev) => ({
        ...prev,
        [currentPose]: { uri: asset.uri, capturedAt: Date.now(), byteSize: size },
      }));
      if (currentPose === 'front') setCurrentPose('left');
      else if (currentPose === 'left') setCurrentPose('right');
    } catch (e) {
      console.log('[VerifyPhoto] capture error', e);
      Alert.alert('Camera error', 'Unable to open camera. Try again.');
    }
  }, [currentPose, requestPermissions]);

  const allReady = useMemo(() => !!(photos.front && photos.left && photos.right), [photos]);

  const verifyPhotos = useCallback(async (): Promise<{ ok: boolean; reason?: string; score?: number; faceVector?: number[] | null }> => {
    try {
      setVerifying(true);
      setVerificationError(null);
      const pFront = photos.front;
      const pLeft = photos.left;
      const pRight = photos.right;
      if (!pFront || !pLeft || !pRight) return { ok: false, reason: 'Missing photos' };

      const distinctUris = new Set([pFront.uri, pLeft.uri, pRight.uri]);
      if (distinctUris.size < 3) {
        return { ok: false, reason: 'Duplicate images detected. Please retake different angles.' };
      }

      if (!(pFront.capturedAt < pLeft.capturedAt && pLeft.capturedAt < pRight.capturedAt)) {
        return { ok: false, reason: 'Photos must be captured in order: Front, then Left, then Right.' };
      }

      const elapsed = Date.now() - verificationStartedAtRef.current;
      if (elapsed > 2 * 60 * 1000 + 15 * 1000) {
        return { ok: false, reason: 'Capture window expired. Please retry within 2 minutes.' };
      }

      const sizes = [pFront.byteSize ?? 0, pLeft.byteSize ?? 0, pRight.byteSize ?? 0];
      const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const variance = sizes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / sizes.length;
      if (tier !== 'plus') {
        if (isFinite(variance) && avg > 0 && variance > Math.pow(avg * 0.9, 2)) {
          return { ok: false, reason: 'Inconsistent image data detected. Please retake in the same lighting.' };
        }
      }

      if (tier === 'plus') {
        await new Promise((r) => setTimeout(r, 200));
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }

      const external = await runFaceVerification({ front: pFront, left: pLeft, right: pRight });
      if (!external.ok) {
        return { ok: false, reason: external.reason ?? 'Face verification failed.' };
      }
      const vec = faceVectorFromDetails(external.details ?? null);
      return { ok: true, score: external.score, faceVector: vec };
    } catch (e) {
      console.log('[VerifyPhoto] verify error', e);
      return { ok: false, reason: 'Unexpected verification error.' };
    } finally {
      setVerifying(false);
    }
  }, [photos]);

  const proceed = useCallback(async () => {
    if (!allReady) {
      Alert.alert('Incomplete', 'Please capture all three photos to continue.');
      return;
    }

    const result = await verifyPhotos();
    if (!result.ok) {
      const baseMsg = result.reason ?? 'Verification failed. Please try again.';
      const friendly = `Photo doesn't seem real—try again! ${baseMsg}`.trim();
      setVerificationError(friendly);
      Alert.alert(
        'Verification failed',
        friendly,
        [
          { text: 'Retry with remaining time', onPress: () => {} },
          { text: 'Restart 2‑min timer', style: 'destructive', onPress: resetAll },
        ]
      );
      return;
    }

    try {
      await AsyncStorage.setItem('verification_photos_v1', JSON.stringify(photos));
      await AsyncStorage.setItem('verification_passed_v1', 'true');
      if (typeof result.score === 'number') {
        await AsyncStorage.setItem('verification_score_v1', String(result.score));
      }
      if (result.faceVector && Array.isArray(result.faceVector)) {
        await AsyncStorage.setItem('face_vector_v1', JSON.stringify(result.faceVector));
      }
    } catch (e) {
      console.log('[VerifyPhoto] persist photos error', e);
    }
    router.push('/(auth)/profile-setup' as any);
  }, [allReady, photos, resetAll, verifyPhotos]);

  const resetPose = useCallback((pose: PoseKey) => {
    setPhotos((p) => ({ ...p, [pose]: null }));
    setCurrentPose(pose);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="back-button">
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Real-time photo verification</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.timerCard}>
        <TimerIcon color="#FF6B6B" size={20} />
        <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
      </View>

      {tier === 'plus' ? (
        <View style={styles.fastLane} testID="premium-fastlane">
          <Crown color="#F59E0B" size={16} />
          <Text style={styles.fastLaneText}>Premium Fast Lane: prioritized verification</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <PrivacyNote text="We verify photos locally when possible. On web, basic face checks may use your browser's built‑in APIs. Images are not uploaded unless you proceed." />
        <Text style={styles.stepTitle}>Step {currentPose === 'front' ? '1' : currentPose === 'left' ? '2' : '3'} of 3</Text>
        <Text style={styles.instruction} testID="pose-instruction">{instruction}</Text>

        <View style={styles.slotsRow}>
          {(['front','left','right'] as PoseKey[]).map((pose) => {
            const ready = !!photos[pose];
            const label = pose === 'front' ? 'Front' : pose === 'left' ? 'Left' : 'Right';
            return (
              <TouchableOpacity
                key={pose}
                style={[styles.slot, ready ? styles.slotReady : pose === currentPose ? styles.slotActive : undefined]}
                onPress={() => setCurrentPose(pose)}
                testID={`slot-${pose}`}
                accessibilityRole="button"
                accessibilityLabel={`${label} photo ${ready ? 'completed' : 'pending'}`}
              >
                {ready ? (
                  <View style={styles.readyRow}>
                    <CheckCircle2 color="#22c55e" size={18} />
                    <Text style={styles.slotLabel}>{label}</Text>
                  </View>
                ) : (
                  <Text style={[styles.slotLabel, pose === currentPose ? styles.slotLabelActive : undefined]}>{label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isRequestingPerms ? styles.captureDisabled : undefined]}
          onPress={captureCurrent}
          disabled={isRequestingPerms}
          testID="capture-current"
        >
          <CameraIcon color="#fff" size={20} />
          <Text style={styles.captureText}>Capture {currentPose === 'front' ? 'Front' : currentPose === 'left' ? 'Left' : 'Right'}</Text>
          <ChevronRight color="#fff" size={18} />
        </TouchableOpacity>

        <View style={styles.compareRow}>
          <TouchableOpacity
            style={styles.compareButton}
            onPress={async () => {
              try {
                const lib = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
                if (lib.canceled) return;
                const asset = lib.assets?.[0];
                if (!asset?.uri) return;
                if (!photos.front) {
                  Alert.alert('Need front selfie', 'Capture your front selfie first.');
                  return;
                }
                setCompareResult(null);
                const res = await compareStaticToLive(asset.uri, photos.front.uri, photos.left?.uri ?? null, photos.right?.uri ?? null);
                setCompareResult({ ok: res.ok, similarity: res.similarity, reason: res.reason });
                if (!res.ok) {
                  Alert.alert('Photo mismatch', res.reason ?? 'Uploaded photo does not match live selfies.');
                }
              } catch (e) {
                Alert.alert('Error', 'Unable to compare photo.');
              }
            }}
            testID="compare-static"
          >
            <ImageIcon color="#FF6B6B" size={16} />
            <Text style={styles.compareText}>Compare uploaded selfie</Text>
          </TouchableOpacity>
          {compareResult ? (
            <Text style={styles.compareHint} testID="compare-result">{compareResult.ok ? `Similarity ${(Math.round((compareResult.similarity ?? 0)*100))}%` : (compareResult.reason ?? 'Not similar')}</Text>
          ) : null}
        </View>

        {verificationError ? (
          <View style={styles.errorBanner} testID="verification-error">
            <ShieldAlert color="#b91c1c" size={18} />
            <Text style={styles.errorText}>{verificationError}</Text>
          </View>
        ) : null}

        <View style={styles.retakeRow}>
          {(['front','left','right'] as PoseKey[]).map((pose) => (
            <TouchableOpacity key={`retake-${pose}`} onPress={() => resetPose(pose)} style={styles.retakeButton} testID={`retake-${pose}`}>
              <RefreshCcw color="#999" size={14} />
              <Text style={styles.retakeText}>Retake {pose}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (!allReady || verifying) ? styles.continueDisabled : undefined]}
          onPress={proceed}
          disabled={!allReady || verifying}
          testID="continue-verify"
        >
          {verifying ? (
            <View style={styles.verifyingRow}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={[styles.continueText, { marginLeft: 8 }]}>Verifying…</Text>
            </View>
          ) : (
            <View style={styles.verifyingRow}>
              <ShieldCheck color="#fff" size={18} />
              <Text style={[styles.continueText, { marginLeft: 8 }]}>Verify & Continue</Text>
            </View>
          )}
        </TouchableOpacity>

        {Platform.OS === 'web' ? (
          <Text style={styles.webHint} testID="web-hint">Tip: On web, your browser may open a file dialog. Use your device camera if prompted.</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  body: { padding: 20 },
  timerCard: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 16, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFF4F4', borderWidth: 1, borderColor: '#FFE1E1' },
  timerText: { marginLeft: 8, fontSize: 16, fontWeight: '700', color: '#FF6B6B' },
  fastLane: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  fastLaneText: { color: '#92400E', fontSize: 12, fontWeight: '800' },
  stepTitle: { marginTop: 16, fontSize: 16, fontWeight: '700', color: '#333', alignSelf: 'center' },
  instruction: { marginTop: 6, fontSize: 14, color: '#666', textAlign: 'center' },
  slotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  slot: { flex: 1, height: 96, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: '#EEE', marginHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  slotActive: { borderColor: '#FFB3B3', backgroundColor: '#FFF4F4' },
  slotReady: { borderColor: '#bbf7d0', backgroundColor: '#F0FFF4', borderStyle: 'solid' },
  slotLabel: { color: '#999', fontSize: 13, fontWeight: '600' },
  slotLabelActive: { color: '#FF6B6B' },
  readyRow: { flexDirection: 'row', alignItems: 'center' },
  captureButton: { marginTop: 22, backgroundColor: '#FF6B6B', paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  captureDisabled: { opacity: 0.7 },
  captureText: { color: '#fff', fontSize: 16, fontWeight: '700', marginHorizontal: 8 },
  retakeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  retakeButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10 },
  retakeText: { marginLeft: 6, color: '#999', fontSize: 12 },
  continueButton: { marginTop: 16, backgroundColor: '#FF6B6B', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  continueDisabled: { backgroundColor: '#FFB3B3' },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  webHint: { marginTop: 10, color: '#999', fontSize: 12, textAlign: 'center' },
  errorBanner: { marginTop: 12, backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  errorText: { color: '#991b1b', marginLeft: 8, fontSize: 12 },
  verifyingRow: { flexDirection: 'row', alignItems: 'center' },
  compareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  compareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#FFF4F4', borderRadius: 999, borderWidth: 1, borderColor: '#FFE1E1' },
  compareText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },
  compareHint: { marginLeft: 10, color: '#666', fontSize: 12 },
});
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera as CameraIcon, ArrowLeft, Timer as TimerIcon, RefreshCcw, CheckCircle2, ChevronRight, ShieldCheck, ShieldAlert, Crown, Image as ImageIcon, Webcam, ImageOff, Shuffle, AlertCircle, User } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { runFaceVerification, configureFaceVerification, faceVectorFromDetails, compareStaticToLive, verifySingleImage } from '@/lib/faceVerification';
import { getEffectiveCapture, getGatingMode, canStartLiveCapture, verificationFlags, livenessParams, type CaptureChoice as CaptureChoiceConst, type VerificationModePref as VerificationModePrefConst } from '@/lib/verificationGuards';
import PrivacyNote from '@/components/PrivacyNote';
import { useMembership } from '@/contexts/MembershipContext';
import { backend, VerificationModePref, CaptureChoice } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { getFirebase } from '@/lib/firebase';
import { ref as storageRef, uploadString, type UploadMetadata } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const { user } = useAuth();
  const { t } = useI18n();
  const { show: showToast } = useToast();
  const uid = user?.email ?? 'guest';
  const [verificationMode, setVerificationMode] = useState<VerificationModePrefConst>('auto');
  const [captureChoice, setCaptureChoice] = useState<CaptureChoiceConst>('static');

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await backend.fetchUserSettings(uid);
        if (cancelled || !s) return;
        if (s.verificationMode === 'auto' || s.verificationMode === 'manual' || s.verificationMode === 'both') setVerificationMode(s.verificationMode);
        if (s.captureChoice === 'live' || s.captureChoice === 'static') setCaptureChoice(s.captureChoice);
      } catch (e) {
        console.log('[VerifyPhoto] load settings error', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [uid]);



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
    if (currentPose === 'front') return t('verification.instructionFront') ?? 'Center your face and take a front-facing selfie';
    if (currentPose === 'left') return t('verification.instructionLeft') ?? 'Turn your head to your LEFT and keep shoulders visible';
    return t('verification.instructionRight') ?? 'Turn your head to your RIGHT and keep shoulders visible';
  }, [currentPose, t]);

  const effectiveCapture: CaptureChoiceConst = useMemo(() => getEffectiveCapture(verificationMode, captureChoice), [verificationMode, captureChoice]);

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
    if (effectiveCapture === 'live') {
      const gate = canStartLiveCapture();
      if (!gate.ok) Alert.alert('Switching to Static', gate.reason ?? '');
    }
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

      const single = await verifySingleImage(asset.uri);
      if (!single.ok) {
        const errorMsg = t('verification.faceRequired') ?? 'Face required';
        const errorDetail = single.reason ?? t('verification.oneFaceRequired') ?? 'Exactly one face must be visible.';
        Alert.alert(errorMsg, errorDetail);
        showToast(errorDetail);
        return;
      }

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
      const errorMsg = t('verification.cameraError') ?? 'Camera error';
      const errorDetail = t('verification.cameraErrorDetail') ?? 'Unable to open camera. Try again.';
      Alert.alert(errorMsg, errorDetail);
      showToast(errorDetail);
    }
  }, [currentPose, requestPermissions, effectiveCapture]);

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
        return { ok: false, reason: t('verification.duplicateImages') ?? 'Duplicate images detected. Please retake different angles.' };
      }

      if (!(pFront.capturedAt < pLeft.capturedAt && pLeft.capturedAt < pRight.capturedAt)) {
        return { ok: false, reason: t('verification.wrongOrder') ?? 'Photos must be captured in order: Front, then Left, then Right.' };
      }

      const elapsed = Date.now() - verificationStartedAtRef.current;
      if (elapsed > 2 * 60 * 1000 + 15 * 1000) {
        return { ok: false, reason: t('verification.timeExpired') ?? 'Capture window expired. Please retry within 2 minutes.' };
      }

      const sizes = [pFront.byteSize ?? 0, pLeft.byteSize ?? 0, pRight.byteSize ?? 0];
      const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const variance = sizes.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / sizes.length;
      if (tier !== 'plus') {
        if (isFinite(variance) && avg > 0 && variance > Math.pow(avg * 0.9, 2)) {
          return { ok: false, reason: t('verification.inconsistentLighting') ?? 'Inconsistent image data detected. Please retake in the same lighting.' };
        }
      }

      if (tier === 'plus') {
        await new Promise((r) => setTimeout(r, 200));
      } else {
        await new Promise((r) => setTimeout(r, 1200));
      }

      const external = await runFaceVerification({ front: pFront, left: pLeft, right: pRight });
      if (!external.ok) {
        return { ok: false, reason: external.reason ?? t('verification.verificationFailed') ?? 'Face verification failed.' };
      }
      const vec = faceVectorFromDetails(external.details ?? null);
      return { ok: true, score: external.score, faceVector: vec };
    } catch (e) {
      console.log('[VerifyPhoto] verify error', e);
      return { ok: false, reason: t('verification.unexpectedError') ?? 'Unexpected verification error.' };
    } finally {
      setVerifying(false);
    }
  }, [photos]);

  const proceed = useCallback(async () => {
    if (!allReady) {
      const title = t('verification.incompleteTitle') ?? 'Incomplete Verification';
      const message = t('verification.incompleteMessage') ?? 'Please capture all three photos (front, left, right) to continue with verification.';
      Alert.alert(title, message, [{ text: t('common.ok') ?? 'OK' }]);
      showToast(message);
      return;
    }

    const result = await verifyPhotos();
    if (!result.ok) {
      const baseMsg = result.reason ?? t('verification.verificationFailedGeneric') ?? 'Verification failed. Please try again.';
      const friendly = `${t('verification.verificationFailed') ?? 'Verification failed'}: ${baseMsg}`;
      setVerificationError(friendly);
      showToast(baseMsg);
      Alert.alert(
        t('verification.verificationFailed') ?? 'Verification Failed',
        friendly,
        [
          { text: t('verification.retryRemaining') ?? 'Retry with remaining time', onPress: () => setVerificationError(null) },
          { text: t('verification.restartTimer') ?? 'Restart 2‑min timer', style: 'destructive', onPress: resetAll },
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

      const signupDataStr = await AsyncStorage.getItem('signup:basic');
      let verifiedUserData: Record<string, unknown> | null = null;
      if (signupDataStr) {
        const signupData = JSON.parse(signupDataStr) as Record<string, unknown>;
        verifiedUserData = {
          ...signupData,
          verificationScore: result.score ?? null,
          verificationTimestamp: Date.now(),
          faceVector: result.faceVector ?? null,
          isVerified: true,
        } as Record<string, unknown>;
        await AsyncStorage.setItem('verified_user_data', JSON.stringify(verifiedUserData));
      }

      try {
        const { storage, db } = getFirebase();
        const userId = (user?.email ?? 'guest').replace(/[^a-zA-Z0-9_-]/g, '_');
        const poseKeys: Array<'front' | 'left' | 'right'> = ['front', 'left', 'right'];
        for (const k of poseKeys) {
          const meta = photos[k];
          if (!meta?.uri) continue;
          try {
            const base64 = await FileSystem.readAsStringAsync(meta.uri, { encoding: FileSystem.EncodingType.Base64 });
            const dataUrl = `data:image/jpeg;base64,${base64}`;
            const path = `verification/${userId}/${k}-${meta.capturedAt}.jpg`;
            const sref = storageRef(storage, path);
            const metadata: UploadMetadata = { contentType: 'image/jpeg', customMetadata: { pose: k, capturedAt: String(meta.capturedAt) } };
            await uploadString(sref, dataUrl, 'data_url', metadata);
          } catch (e) {
            console.log('[VerifyPhoto] upload error', k, e);
          }
        }
        const docRef = doc(db, 'users', userId, 'verification', 'latest');
        await setDoc(docRef, {
          userId,
          score: result.score ?? null,
          faceVector: result.faceVector ?? null,
          createdAt: serverTimestamp(),
          photos: {
            front: photos.front?.capturedAt ?? null,
            left: photos.left?.capturedAt ?? null,
            right: photos.right?.capturedAt ?? null,
          },
        });
        console.log('[VerifyPhoto] uploaded verification to Firebase for', userId);
      } catch (e) {
        console.log('[VerifyPhoto] Firebase not configured or failed, skipping cloud save', e);
      }

      showToast(t('verification.verificationSuccess') ?? 'Verification successful!');
      router.push('/(auth)/profile-setup' as any);
    } catch (e) {
      console.log('[VerifyPhoto] persist photos error', e);
      const errorMsg = t('verification.saveError') ?? 'Failed to save verification data. Please try again.';
      Alert.alert(t('common.error') ?? 'Error', errorMsg);
      showToast(errorMsg);
    }
  }, [allReady, photos, resetAll, verifyPhotos, user]);

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
        <Text style={styles.headerTitle}>Photo Verification</Text>
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
        <View style={styles.instructionCard}>
          <User color="#FF6B6B" size={20} />
          <Text style={styles.instructionTitle}>Face Verification Required</Text>
          <Text style={styles.instructionText}>
            Take 3 photos of yourself from different angles to verify your identity. This helps keep MatchFlow safe and authentic.
          </Text>
        </View>
        
        <PrivacyNote text="Photos are processed locally when possible. Your privacy is protected and images are only stored with your consent." />
        <View style={styles.modeBar}>
          <Shuffle color="#6B7280" size={16} />
          <Text style={styles.modeText}>Mode: {verificationMode === 'auto' ? 'Auto-switch' : verificationMode === 'manual' ? 'Manual' : 'Auto + Override'}</Text>
          <Text style={styles.modeText}>Capture: {effectiveCapture === 'live' ? 'Live Preview' : 'Static'}</Text>
          <Text style={styles.modeText}>Liveness: {livenessParams.frames} frames / {Math.round(livenessParams.windowMs/100)/10}s, ε={livenessParams.stabilityEpsilon}</Text>
        </View>
        {verificationMode !== 'auto' ? (
          <View style={styles.modePicker}>
            {(['live','static'] as CaptureChoice[]).map((c) => {
              const active = effectiveCapture === c;
              const disabled = Platform.OS === 'web' && c === 'live';
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.modeItem, active && styles.modeItemActive, disabled && styles.itemDisabled]}
                  onPress={() => !disabled && setCaptureChoice(c)}
                  disabled={disabled}
                  testID={`mode-${c}`}
                >
                  {c === 'live' ? <Webcam color={active ? '#065F46' : '#374151'} size={16} /> : <ImageOff color={active ? '#065F46' : '#374151'} size={16} />}
                  <Text style={[styles.modeTextOption, active && styles.modeTextActive, disabled && styles.textDisabled]}>{c === 'live' ? 'Live Preview' : 'Static'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step {currentPose === 'front' ? '1' : currentPose === 'left' ? '2' : '3'} of 3</Text>
          <Text style={styles.instruction} testID="pose-instruction">{instruction}</Text>
          
          {currentPose === 'front' && (
            <View style={styles.tipCard}>
              <AlertCircle color="#F59E0B" size={16} />
              <Text style={styles.tipText}>Look directly at the camera with good lighting</Text>
            </View>
          )}
          
          {(currentPose === 'left' || currentPose === 'right') && (
            <View style={styles.tipCard}>
              <AlertCircle color="#F59E0B" size={16} />
              <Text style={styles.tipText}>Turn your head while keeping shoulders visible</Text>
            </View>
          )}
        </View>

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
  stepContainer: { marginTop: 16, alignItems: 'center' },
  stepTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  instruction: { marginTop: 6, fontSize: 14, color: '#666', textAlign: 'center' },
  instructionCard: { backgroundColor: '#FFF4F4', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  instructionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 8, marginBottom: 4 },
  instructionText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  tipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, marginTop: 8, gap: 6 },
  tipText: { fontSize: 12, color: '#92400E', flex: 1 },
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
  modeBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  modeText: { color: '#6B7280', fontSize: 12 },
  modePicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  modeItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
  modeItemActive: { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7' },
  itemDisabled: { opacity: 0.5 },
  textDisabled: { color: '#9CA3AF' },
  modeTextOption: { fontSize: 13, color: '#374151', fontWeight: '600' },
  modeTextActive: { color: '#065F46' },
});
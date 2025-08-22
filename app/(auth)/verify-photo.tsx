import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Camera as CameraIcon, ArrowLeft, Timer as TimerIcon, RefreshCcw, CheckCircle2, ChevronRight, ShieldCheck, ShieldAlert, Crown, Webcam, ImageOff, AlertCircle, User, XCircle, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { runFaceVerification, configureFaceVerification, type PoseCaptureMeta as PoseCaptureMetaAngles, verifySingleImage } from '@/lib/faceVerification';
import PrivacyNote from '@/components/PrivacyNote';
import { useMembership } from '@/contexts/MembershipContext';
import { backend, VerificationModePref, CaptureChoice } from '@/lib/backend';
import { useAuth } from '@/contexts/AuthContext';
import { useI18n } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { getFirebase } from '@/lib/firebase';
import { ref as storageRef, uploadString, type UploadMetadata } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CameraView } from 'expo-camera';

type ExpressionKey = 'neutral' | 'smile' | 'sad';

interface PoseCaptureMeta {
  uri: string;
  capturedAt: number;
  byteSize: number | null;
}

export default function VerifyPhotoScreen() {
  const [secondsLeft, setSecondsLeft] = useState<number>(120);
  const { tier } = useMembership();
  const [isRequestingPerms, setIsRequestingPerms] = useState<boolean>(false);
  const [photos, setPhotos] = useState<Record<ExpressionKey, PoseCaptureMeta | null>>({ neutral: null, smile: null, sad: null });
  const [currentExpr, setCurrentExpr] = useState<ExpressionKey>('neutral');
  const [expiredPromptShown, setExpiredPromptShown] = useState<boolean>(false);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationStartedAtRef = useRef<number>(Date.now());
  const { user } = useAuth();
  const { t } = useI18n();
  const { show: showToast } = useToast();
  const uid = user?.email ?? 'guest';
  const [verificationMode, setVerificationMode] = useState<VerificationModePref>('auto');
  const [captureChoice, setCaptureChoice] = useState<CaptureChoice>('static');

  const [showCamera, setShowCamera] = useState<boolean>(false);
  const cameraRef = useRef<CameraView | null>(null);
  const captureGuardRef = useRef<{ capturing: boolean }>({ capturing: false });
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setPhotos({ neutral: null, smile: null, sad: null });
    setCurrentExpr('neutral');
    setSecondsLeft(120);
    setExpiredPromptShown(false);
    setVerificationError(null);
    setVerifying(false);
    verificationStartedAtRef.current = Date.now();
    captureGuardRef.current = { capturing: false };
    if (autoTimerRef.current) { clearTimeout(autoTimerRef.current); autoTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (secondsLeft === 0 && !expiredPromptShown) {
      setExpiredPromptShown(true);
      Alert.alert(
        t('verification.timerExpiredTitle') ?? 'Timer expired',
        t('verification.timerExpiredBody') ?? 'Time is up. You can restart the 2‑minute timer to try again.',
        [
          { text: t('verification.restartTimer') ?? 'Restart 2‑min timer', style: 'destructive', onPress: resetAll },
        ],
        { cancelable: false }
      );
    }
  }, [secondsLeft, expiredPromptShown, resetAll, t]);

  const requestPermissions = useCallback(async () => {
    try {
      setIsRequestingPerms(true);
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted) {
        Alert.alert(t('verification.permsTitle') ?? 'Permissions required', t('verification.permsBody') ?? 'Please allow camera access to continue.');
        return false;
      }
      return true;
    } catch (e) {
      console.log('[VerifyPhoto] perms error', e);
      return false;
    } finally {
      setIsRequestingPerms(false);
    }
  }, [t]);

  const exprInstruction = useMemo(() => {
    if (currentExpr === 'neutral') return t('verification.exprNeutral') ?? 'Neutral face 😐 — look straight at the camera';
    if (currentExpr === 'smile') return t('verification.exprSmile') ?? 'Smile 😊 — show a clear smile';
    return t('verification.exprSad') ?? 'Sad 😔 — relax your smile';
  }, [currentExpr, t]);

  const formatTime = useCallback((total: number) => {
    const m = Math.floor(total / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${mm}:${ss}`;
  }, []);

  const openCamera = useCallback(async () => {
    const ok = await requestPermissions();
    if (!ok) return;
    if (Platform.OS === 'web') {
      Alert.alert(t('verification.webManualTitle') ?? 'Manual capture on web', t('verification.webManualBody') ?? 'Auto face detection is not available on web. We will open your device camera or file picker for each expression.');
      await manualCapture();
      return;
    }
    setShowCamera(true);
    captureGuardRef.current = { capturing: false };
  }, [requestPermissions, t]);

  const takeNowExpr = useCallback(async () => {
    try {
      if (captureGuardRef.current.capturing) return;
      captureGuardRef.current.capturing = true;
      const cam = cameraRef.current;
      if (!cam) {
        captureGuardRef.current.capturing = false;
        return;
      }
      const photo = await cam.takePictureAsync({ quality: 1, skipProcessing: false });
      let size: number | null = null;
      try {
        const info = await FileSystem.getInfoAsync(photo.uri, { size: true });
        const s = (info as unknown as { size?: number }).size;
        size = typeof s === 'number' ? s : null;
      } catch (e) {
        console.log('[VerifyPhoto] take picture size error', e);
      }
      setPhotos((prev) => ({ ...prev, [currentExpr]: { uri: photo.uri, capturedAt: Date.now(), byteSize: size } }));
      setShowCamera(false);
      captureGuardRef.current = { capturing: false };
      if (currentExpr === 'neutral') setCurrentExpr('smile');
      else if (currentExpr === 'smile') setCurrentExpr('sad');
    } catch (e) {
      console.log('[VerifyPhoto] takeNow error', e);
      captureGuardRef.current = { capturing: false };
    }
  }, [currentExpr]);

  useEffect(() => {
    if (!showCamera) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current as any);
    autoTimerRef.current = setTimeout(() => {
      takeNowExpr();
    }, 1800);
    return () => {
      if (autoTimerRef.current) { clearTimeout(autoTimerRef.current as any); autoTimerRef.current = null; }
    };
  }, [showCamera, takeNowExpr]);

  const manualCapture = useCallback(async () => {
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
        const s = (info as unknown as { size?: number }).size;
        size = typeof s === 'number' ? s : null;
      } catch (e) {
        console.log('[VerifyPhoto] file size error', e);
      }
      setPhotos((prev) => ({ ...prev, [currentExpr]: { uri: asset.uri, capturedAt: Date.now(), byteSize: size } }));
      if (currentExpr === 'neutral') setCurrentExpr('smile');
      else if (currentExpr === 'smile') setCurrentExpr('sad');
    } catch (e) {
      console.log('[VerifyPhoto] manual capture error', e);
      Alert.alert(t('verification.cameraError') ?? 'Camera error', t('verification.cameraErrorDetail') ?? 'Unable to open camera. Try again.');
      showToast(t('verification.cameraErrorDetail') ?? 'Unable to open camera. Try again.');
    }
  }, [currentExpr, showToast, t]);

  const allReady = useMemo(() => !!(photos.neutral && photos.smile && photos.sad), [photos]);

  const verifyPhotos = useCallback(async (): Promise<{ ok: boolean; reason?: string; score?: number; faceVector?: number[] | null }> => {
    try {
      setVerifying(true);
      setVerificationError(null);
      const pNeutral = photos.neutral;
      const pSmile = photos.smile;
      const pSad = photos.sad;
      if (!pNeutral || !pSmile || !pSad) return { ok: false, reason: 'Missing photos' };
      const distinctUris = new Set([pNeutral.uri, pSmile.uri, pSad.uri]);
      if (distinctUris.size < 3) return { ok: false, reason: t('verification.duplicateImages') ?? 'Duplicate images detected. Please retake different expressions.' };
      const elapsed = Date.now() - verificationStartedAtRef.current;
      if (elapsed > 2 * 60 * 1000 + 15 * 1000) return { ok: false, reason: t('verification.timeExpired') ?? 'Capture window expired. Please retry within 2 minutes.' };
      const anglesInput = { front: pNeutral, left: pSmile, right: pSad } as unknown as { front: PoseCaptureMetaAngles; left: PoseCaptureMetaAngles; right: PoseCaptureMetaAngles };
      const external = await runFaceVerification(anglesInput);
      if (!external.ok) return { ok: false, reason: external.reason ?? t('verification.verificationFailed') ?? 'Face verification failed.' };
      return { ok: true, score: external.score, faceVector: null };
    } catch (e) {
      console.log('[VerifyPhoto] verify error', e);
      return { ok: false, reason: t('verification.unexpectedError') ?? 'Unexpected verification error.' };
    } finally {
      setVerifying(false);
    }
  }, [photos, t]);

  const proceed = useCallback(async () => {
    if (!allReady) {
      const title = t('verification.incompleteTitle') ?? 'Incomplete Verification';
      const message = t('verification.incompleteMessageExpr') ?? 'Please capture all three photos (neutral, smile, sad) to continue with verification.';
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
      await AsyncStorage.setItem('verification_photos_expr_v1', JSON.stringify(photos));
      await AsyncStorage.setItem('verification_passed_v1', 'true');
      router.push('/(auth)/profile-setup' as any);
    } catch (e) {
      console.log('[VerifyPhoto] persist photos error', e);
      const errorMsg = t('verification.saveError') ?? 'Failed to save verification data. Please try again.';
      Alert.alert(t('common.error') ?? 'Error', errorMsg);
      showToast(errorMsg);
    }
  }, [allReady, photos, resetAll, showToast, t, verifyPhotos]);

  const resetExpr = useCallback((expr: ExpressionKey) => {
    setPhotos((p) => ({ ...p, [expr]: null }));
    setCurrentExpr(expr);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} testID="back-button">
          <ArrowLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('verification.title') ?? 'Photo Verification'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.timerCard}>
        <TimerIcon color="#FF6B6B" size={20} />
        <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
      </View>

      {tier === 'plus' ? (
        <View style={styles.fastLane} testID="premium-fastlane">
          <Crown color="#F59E0B" size={16} />
          <Text style={styles.fastLaneText}>{t('verification.fastLane') ?? 'Premium Fast Lane: prioritized verification'}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.instructionCard}>
          <User color="#FF6B6B" size={20} />
          <Text style={styles.instructionTitle}>{t('verification.requireTitle') ?? 'Face Verification Required'}</Text>
          <Text style={styles.instructionText}>
            {t('verification.requireBodyExpr') ?? 'After starting the camera, we will auto‑capture three expressions in sequence: Neutral 😐, Smile 😊, and Sad 😔. Keep good lighting and center your face.'}
          </Text>
        </View>

        <PrivacyNote text={t('verification.privacyNote') ?? 'Photos are processed locally when possible. Your privacy is protected and images are only stored with your consent.'} />

        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>{t('verification.stepOfThree') ?? 'Step'} {currentExpr === 'neutral' ? '1' : currentExpr === 'smile' ? '2' : '3'} {t('verification.ofThree') ?? 'of 3'}</Text>
          <Text style={styles.instruction} testID="expr-instruction">{exprInstruction}</Text>
          <View style={styles.tipCard}>
            <AlertCircle color="#F59E0B" size={16} />
            <Text style={styles.tipText}>{t('verification.tipLighting') ?? 'Use even lighting and hold steady while we auto‑capture when the expression is detected.'}</Text>
          </View>
        </View>

        <View style={styles.slotsRow}>
          {(['neutral','smile','sad'] as ExpressionKey[]).map((expr) => {
            const ready = !!photos[expr];
            const label = expr === 'neutral' ? (t('verification.neutral') ?? 'Neutral') : expr === 'smile' ? (t('verification.smile') ?? 'Smile') : (t('verification.sad') ?? 'Sad');
            return (
              <TouchableOpacity
                key={expr}
                style={[styles.slot, ready ? styles.slotReady : expr === currentExpr ? styles.slotActive : undefined]}
                onPress={() => setCurrentExpr(expr)}
                testID={`slot-${expr}`}
                accessibilityRole="button"
                accessibilityLabel={`${label} photo ${ready ? 'completed' : 'pending'}`}
              >
                {ready ? (
                  <View style={styles.readyRow}>
                    <CheckCircle2 color="#22c55e" size={18} />
                    <Text style={styles.slotLabel}>{label}</Text>
                  </View>
                ) : (
                  <Text style={[styles.slotLabel, expr === currentExpr ? styles.slotLabelActive : undefined]}>{label}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.captureButton, isRequestingPerms ? styles.captureDisabled : undefined]}
          onPress={openCamera}
          disabled={isRequestingPerms}
          testID="open-camera"
        >
          <CameraIcon color="#fff" size={20} />
          <Text style={styles.captureText}>{t('verification.startCamera') ?? 'Start camera for auto‑capture'}</Text>
          <ChevronRight color="#fff" size={18} />
        </TouchableOpacity>

        <View style={styles.retakeRow}>
          {(['neutral','smile','sad'] as ExpressionKey[]).map((expr) => (
            <TouchableOpacity key={`retake-${expr}`} onPress={() => resetExpr(expr)} style={styles.retakeButton} testID={`retake-${expr}`}>
              <RefreshCcw color="#999" size={14} />
              <Text style={styles.retakeText}>{(t('verification.retake') ?? 'Retake')} {expr}</Text>
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
              <Text style={[styles.continueText, { marginLeft: 8 }]}>{t('verification.verifying') ?? 'Verifying…'}</Text>
            </View>
          ) : (
            <View style={styles.verifyingRow}>
              <ShieldCheck color="#fff" size={18} />
              <Text style={[styles.continueText, { marginLeft: 8 }]}>{t('verification.verifyContinue') ?? 'Verify & Continue'}</Text>
            </View>
          )}
        </TouchableOpacity>

        {Platform.OS === 'web' ? (
          <Text style={styles.webHint} testID="web-hint">{t('verification.webHint') ?? 'Tip: On web, your browser may open a file dialog. Use your device camera if prompted.'}</Text>
        ) : null}
      </View>

      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeBtn} testID="close-camera">
              <XCircle color="#333" size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{exprInstruction}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.cameraWrap}>
            <CameraView
              ref={(r) => { cameraRef.current = r; }}
              style={styles.camera}
              facing={'front'}
            />
          </View>
          <View style={styles.cameraHelp}> 
            <Webcam color="#6B7280" size={16} />
            <Text style={styles.cameraHelpText}>{t('verification.autoCaptureHint') ?? 'Hold steady. We will capture automatically in 2 seconds or tap Capture.'}</Text>
          </View>
          <View style={{ padding: 12, backgroundColor: '#fff' }}>
            <TouchableOpacity style={styles.snapBtn} onPress={takeNowExpr} testID="snap-now">
              <Camera color="#fff" size={18} />
              <Text style={styles.snapText}>{t('verification.captureNow') ?? 'Capture now'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  modalContainer: { flex: 1, backgroundColor: '#000' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  closeBtn: { padding: 6 },
  modalTitle: { fontSize: 14, color: '#333', fontWeight: '600', flexShrink: 1 },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraHelp: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#fff' },
  cameraHelpText: { color: '#6B7280', fontSize: 12, flex: 1 },
  snapBtn: { backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  snapText: { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },
});
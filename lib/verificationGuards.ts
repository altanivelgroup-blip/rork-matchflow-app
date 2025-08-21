import { Platform } from 'react-native';

export type VerificationModePref = 'auto' | 'manual' | 'both';
export type CaptureChoice = 'live' | 'static';

interface LivenessParams {
  frames: number;
  windowMs: number;
  requireSingleFace: boolean;
  requireStableLandmarks: boolean;
  stabilityEpsilon: number;
  requireEyeMouthMovement: boolean;
}

interface VerificationFlags {
  devClientFaceDetectorEnabled: boolean;
  gating: 'auto-only' | 'manual-only' | 'auto+manual';
  liveness: LivenessParams;
}

export const verificationFlags: VerificationFlags = {
  devClientFaceDetectorEnabled: false,
  gating: 'auto+manual',
  liveness: {
    frames: 12,
    windowMs: 2000,
    requireSingleFace: true,
    requireStableLandmarks: true,
    stabilityEpsilon: 3.5,
    requireEyeMouthMovement: true,
  },
};

export function getEffectiveCapture(mode: VerificationModePref, userChoice: CaptureChoice): CaptureChoice {
  if (mode === 'auto') {
    if (Platform.OS === 'web') return 'static';
    return verificationFlags.devClientFaceDetectorEnabled ? 'live' : 'static';
  }
  if (mode === 'both') {
    if (Platform.OS === 'web' && userChoice === 'live') return 'static';
    if (!verificationFlags.devClientFaceDetectorEnabled && userChoice === 'live') return 'static';
    return userChoice;
  }
  if (mode === 'manual') {
    if (Platform.OS === 'web' && userChoice === 'live') return 'static';
    if (!verificationFlags.devClientFaceDetectorEnabled && userChoice === 'live') return 'static';
    return userChoice;
  }
  return 'static';
}

export function canStartLiveCapture(): { ok: boolean; reason?: string } {
  if (Platform.OS === 'web') {
    return { ok: false, reason: 'Live preview not available on web. Using Static capture.' };
  }
  if (!verificationFlags.devClientFaceDetectorEnabled) {
    return { ok: false, reason: 'Live preview requires Dev Client with face detector enabled.' };
  }
  return { ok: true };
}

export function getGatingMode(): 'auto-only' | 'manual-only' | 'auto+manual' {
  return verificationFlags.gating;
}

export const livenessParams: LivenessParams = verificationFlags.liveness;

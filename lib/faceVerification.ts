import * as FileSystem from 'expo-file-system';
import { Image, Platform } from 'react-native';

export type PoseKey = 'front' | 'left' | 'right';

export interface PoseCaptureMeta {
  uri: string;
  capturedAt: number;
  byteSize: number | null;
}

export interface VerificationInput {
  front: PoseCaptureMeta;
  left: PoseCaptureMeta;
  right: PoseCaptureMeta;
}

export interface VerificationResult {
  ok: boolean;
  score?: number;
  reason?: string;
  details?: Record<string, unknown>;
}

export type VerificationMode = 'mock' | 'thirdPartyDirect' | 'backend';

interface VerificationConfig {
  mode: VerificationMode;
  endpoint?: string;
  apiKey?: string;
}

let config: VerificationConfig = {
  mode: 'mock',
};

async function uriToBase64(uri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return base64;
  } catch (e) {
    console.log('[faceVerification] uriToBase64 error', e);
    return null;
  }
}

function simpleMockHeuristics(input: VerificationInput): VerificationResult {
  try {
    const times = [input.front.capturedAt, input.left.capturedAt, input.right.capturedAt];
    const inOrder = times[0] < times[1] && times[1] < times[2];
    const sizes = [input.front.byteSize ?? 0, input.left.byteSize ?? 0, input.right.byteSize ?? 0];
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const sizeOk = minSize > 10_000 && maxSize / Math.max(minSize, 1) < 3;
    const movementLikely = Math.abs((sizes[1] - sizes[0])) > 1500 || Math.abs((sizes[2] - sizes[0])) > 1500;
    const consistencyScore = (inOrder ? 0.4 : 0.0) + (sizeOk ? 0.3 : 0.0) + (movementLikely ? 0.3 : 0.0);
    const ok = consistencyScore >= 0.7;
    return {
      ok,
      score: Math.min(0.95, Math.max(0.4, consistencyScore)),
      reason: ok ? undefined : 'Basic checks failed. Ensure order Front→Left→Right, good lighting, and slight movement between shots.',
      details: { inOrder, sizeOk, sizes, movementLikely },
    };
  } catch (e) {
    console.log('[faceVerification] mock heuristics error', e);
    return { ok: false, reason: 'Mock verification failed unexpectedly.' };
  }
}

async function webDetectFaces(uri: string): Promise<{ count: number; boxes: Array<{ x: number; y: number; width: number; height: number }> } | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const g: Record<string, unknown> = globalThis as unknown as Record<string, unknown>;
    const FaceDetectorCtor = g.FaceDetector as any;
    if (!FaceDetectorCtor) {
      console.log('[faceVerification] Shape Detection API FaceDetector not available');
      return null;
    }
    const detector = new FaceDetectorCtor();
    const img: any = typeof Image !== 'undefined' ? new (Image as any)() : null;
    if (!img) return null;
    const loadImage = () => new Promise<any>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = (err: unknown) => reject(err);
    });
    img.src = uri;
    const el = await loadImage();
    const faces: any[] = await detector.detect(el);
    const boxes = (faces ?? []).map((f: any) => {
      const box = f.boundingBox ?? f.boundingClientRect ?? {};
      return {
        x: Number((box as any).x ?? 0),
        y: Number((box as any).y ?? 0),
        width: Number((box as any).width ?? 0),
        height: Number((box as any).height ?? 0),
      };
    });
    return { count: boxes.length, boxes };
  } catch (e) {
    console.log('[faceVerification] webDetectFaces error', e);
    return null;
  }
}

function scoreFromFaceCounts(frontCount: number, leftCount: number, rightCount: number): { ok: boolean; score: number; reason?: string } {
  if (frontCount !== 1 || leftCount !== 1 || rightCount !== 1) {
    return { ok: false, score: 0.4, reason: 'Exactly one face must be visible in each photo.' };
  }
  return { ok: true, score: 0.8 };
}

async function webCanvasLoad(uri: string): Promise<any | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const img: any = typeof Image !== 'undefined' ? new (Image as any)() : null;
    if (!img) return null;
    const load = () => new Promise<any>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = (err: unknown) => reject(err);
    });
    img.crossOrigin = 'anonymous';
    img.src = uri;
    const el = await load();
    return el;
  } catch (e) {
    console.log('[faceVerification] webCanvasLoad error', e);
    return null;
  }
}

function cropBox(box: { x: number; y: number; width: number; height: number }, pad: number, w: number, h: number) {
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const width = Math.min(Math.floor(box.width + pad * 2), w - x);
  const height = Math.min(Math.floor(box.height + pad * 2), h - y);
  return { x, y, width, height };
}

async function webComputeAHash(uri: string, faceBox?: { x: number; y: number; width: number; height: number }): Promise<string | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const img: any = await webCanvasLoad(uri);
    if (!img) return null;
    const w = Number((img as any).naturalWidth ?? (img as any).width ?? 0);
    const h = Number((img as any).naturalHeight ?? (img as any).height ?? 0);
    if (w <= 0 || h <= 0) return null;
    const cnv: any = document.createElement('canvas');
    const ctx: any = cnv.getContext('2d');
    const box = faceBox ? cropBox(faceBox, 10, w, h) : { x: 0, y: 0, width: w, height: h };
    cnv.width = 8;
    cnv.height = 8;
    ctx.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, 8, 8);
    const data = ctx.getImageData(0, 0, 8, 8).data as Uint8ClampedArray;
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray.push(g);
    }
    const avg = gray.reduce((a, b) => a + b, 0) / gray.length;
    let bits = '';
    for (let i = 0; i < gray.length; i++) bits += gray[i] > avg ? '1' : '0';
    return bits;
  } catch (e) {
    console.log('[faceVerification] webComputeAHash error', e);
    return null;
  }
}

function hamming(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < len; i++) if (a[i] !== b[i]) d++;
  return d + Math.abs(a.length - b.length);
}

async function webImageDiff(uriA: string, uriB: string): Promise<number | null> {
  if (Platform.OS !== 'web') return null;
  try {
    const a: any = await webCanvasLoad(uriA);
    const b: any = await webCanvasLoad(uriB);
    if (!a || !b) return null;
    const w = Math.min(Number(a.naturalWidth ?? a.width ?? 0), Number(b.naturalWidth ?? b.width ?? 0), 128);
    const h = Math.min(Number(a.naturalHeight ?? a.height ?? 0), Number(b.naturalHeight ?? b.height ?? 0), 128);
    if (w <= 0 || h <= 0) return null;
    const ca: any = document.createElement('canvas');
    const cb: any = document.createElement('canvas');
    const cctxA: any = ca.getContext('2d');
    const cctxB: any = cb.getContext('2d');
    ca.width = w;
    ca.height = h;
    cb.width = w;
    cb.height = h;
    cctxA.drawImage(a, 0, 0, w, h);
    cctxB.drawImage(b, 0, 0, w, h);
    const da = cctxA.getImageData(0, 0, w, h).data as Uint8ClampedArray;
    const db = cctxB.getImageData(0, 0, w, h).data as Uint8ClampedArray;
    let diff = 0;
    const total = w * h;
    for (let i = 0; i < da.length && i < db.length; i += 4) {
      const dr = Math.abs(da[i] - db[i]);
      const dg = Math.abs(da[i + 1] - db[i + 1]);
      const dbb = Math.abs(da[i + 2] - db[i + 2]);
      diff += (dr + dg + dbb) / 3;
    }
    const mean = diff / total;
    const norm = mean / 255;
    return norm;
  } catch (e) {
    console.log('[faceVerification] webImageDiff error', e);
    return null;
  }
}

export function configureFaceVerification(partial: Partial<VerificationConfig>) {
  config = { ...config, ...partial };
  console.log('[faceVerification] configured', { mode: config.mode, endpoint: !!config.endpoint });
}

export async function runFaceVerification(input: VerificationInput): Promise<VerificationResult> {
  console.log('[faceVerification] mode', config.mode);
  if (Platform.OS === 'web') {
    try {
      const [front, left, right] = await Promise.all([
        webDetectFaces(input.front.uri),
        webDetectFaces(input.left.uri),
        webDetectFaces(input.right.uri),
      ]);
      const [diffFL, diffFR, diffLR] = await Promise.all([
        webImageDiff(input.front.uri, input.left.uri),
        webImageDiff(input.front.uri, input.right.uri),
        webImageDiff(input.left.uri, input.right.uri),
      ]);
      let aHashFront: string | null = null;
      let aHashLeft: string | null = null;
      let aHashRight: string | null = null;
      if (front && left && right) {
        const fb = front.boxes?.[0];
        const lb = left.boxes?.[0];
        const rb = right.boxes?.[0];
        aHashFront = await webComputeAHash(input.front.uri, fb);
        aHashLeft = await webComputeAHash(input.left.uri, lb);
        aHashRight = await webComputeAHash(input.right.uri, rb);
      }
      if (front && left && right) {
        const countsScore = scoreFromFaceCounts(front.count, left.count, right.count);
        if (!countsScore.ok) {
          return { ok: false, score: countsScore.score, reason: countsScore.reason, details: { front, left, right } };
        }
        const basic = simpleMockHeuristics(input);
        let movementOk = false;
        if (typeof diffFL === 'number' && typeof diffFR === 'number' && typeof diffLR === 'number') {
          movementOk = diffFL > 0.08 && diffFR > 0.08 && diffLR > 0.05;
        }
        let identityOk = false;
        let identityScore = 0.0;
        if (aHashFront && aHashLeft && aHashRight) {
          const dFL = hamming(aHashFront, aHashLeft);
          const dFR = hamming(aHashFront, aHashRight);
          const dLR = hamming(aHashLeft, aHashRight);
          const avgD = (dFL + dFR + dLR) / 3;
          identityOk = avgD <= 22;
          identityScore = Math.max(0, 1 - avgD / 32);
        }
        const combined = (
          (countsScore.score * 0.4) +
          ((basic.score ?? 0.6) * 0.25) +
          ((movementOk ? 0.9 : 0.4) * 0.2) +
          ((identityOk ? Math.max(0.6, identityScore) : 0.4) * 0.15)
        );
        const ok = combined >= 0.7 && movementOk;
        if (!ok) {
          const reason = !movementOk ? 'Liveness check failed. Please blink or turn your head between shots.' : 'Face similarity across angles was insufficient. Retake in good lighting.';
          return { ok: false, score: combined, reason, details: { front, left, right, diffFL, diffFR, diffLR, aHashFront, aHashLeft, aHashRight } };
        }
        return { ok: true, score: Math.min(0.96, combined), details: { front, left, right, diffFL, diffFR, diffLR, aHashFront, aHashLeft, aHashRight } };
      }
    } catch (e) {
      console.log('[faceVerification] web verification flow error', e);
    }
  }
  if (config.mode === 'mock') {
    return simpleMockHeuristics(input);
  }
  if (config.mode === 'backend') {
    return { ok: false, reason: 'Backend not configured. Enable Backend to proceed.' };
  }
  if (config.mode === 'thirdPartyDirect') {
    if (!config.endpoint || !config.apiKey) {
      return { ok: false, reason: 'Face verification API not configured. Please set endpoint and API key.' };
    }
    if (Platform.OS === 'web') {
      console.log('[faceVerification] third-party direct not supported on web without proper CORS');
      return { ok: false, reason: 'Web verification not available without CORS-enabled endpoint. Try on device or configure backend.' };
    }
    const [frontB64, leftB64, rightB64] = await Promise.all([
      uriToBase64(input.front.uri),
      uriToBase64(input.left.uri),
      uriToBase64(input.right.uri),
    ]);
    if (!frontB64 || !leftB64 || !rightB64) {
      return { ok: false, reason: 'Failed to read images for verification.' };
    }
    try {
      const res = await fetch(config.endpoint as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          images: {
            front: { base64: frontB64 },
            left: { base64: leftB64 },
            right: { base64: rightB64 },
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        console.log('[faceVerification] API error', res.status, text);
        return { ok: false, reason: `Verification API error (${res.status}).` };
      }
      const data = (await res.json()) as { ok?: boolean; score?: number; reason?: string; details?: Record<string, unknown> };
      if (data.ok) return { ok: true, score: data.score ?? 0.9, details: data.details };
      return { ok: false, reason: data.reason ?? 'Face verification failed.', details: data.details };
    } catch (e) {
      console.log('[faceVerification] fetch error', e);
      return { ok: false, reason: 'Network error during face verification.' };
    }
  }
  return { ok: false, reason: 'Unsupported verification mode.' };
}

export function faceVectorFromDetails(details?: Record<string, unknown> | null): number[] | null {
  try {
    if (!details) return null;
    const aFront = (details as Record<string, unknown>).aHashFront as unknown as string | undefined;
    const bits = typeof aFront === 'string' && aFront.length >= 64 ? aFront.slice(0, 64) : null;
    if (!bits) return null;
    const vec: number[] = [];
    for (let i = 0; i < bits.length; i++) {
      const b = bits[i] === '1' ? 1 : 0;
      vec.push(b);
    }
    let norm = 0;
    for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  } catch (e) {
    console.log('[faceVerification] faceVectorFromDetails error', e);
    return null;
  }
}

export async function verifySingleImage(uri: string): Promise<VerificationResult> {
  try {
    if (Platform.OS === 'web') {
      const faces = await webDetectFaces(uri);
      if (faces) {
        const ok = faces.count === 1;
        return ok ? { ok: true, score: 0.8, details: faces } : { ok: false, score: 0.4, reason: 'Exactly one human face must be visible.' };
      }
    }
    let byteSize: number | null = null;
    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      const maybeSize = (info as unknown as { size?: number }).size;
      byteSize = typeof maybeSize === 'number' ? maybeSize : null;
    } catch (e) {
      console.log('[faceVerification] getInfoAsync error', e);
    }
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      try {
        Image.getSize(
          uri,
          (w: number, h: number) => resolve({ width: w, height: h }),
          () => resolve(null)
        );
      } catch (e) {
        resolve(null);
      }
    });
    const w = dims?.width ?? 0;
    const h = dims?.height ?? 0;
    const minPx = 180;
    const aspect = w > 0 && h > 0 ? w / h : 1;
    const sizeOk = (byteSize ?? 0) > 15000;
    const dimsOk = w >= minPx && h >= minPx;
    const aspectOk = aspect > 0.6 && aspect < 1.9;
    const score = (sizeOk ? 0.35 : 0) + (dimsOk ? 0.35 : 0) + (aspectOk ? 0.2 : 0);
    const ok = score >= 0.7;
    return ok ? { ok: true, score } : { ok: false, score, reason: "This photo doesn't pass our security check—please upload a real one." };
  } catch (e) {
    console.log('[faceVerification] verifySingleImage error', e);
    return { ok: false, reason: 'Verification failed. Please try again.' };
  }
}

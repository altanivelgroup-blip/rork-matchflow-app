import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

function getRequiredEnv(key: string): string {
  const value = (process.env as Record<string, string | undefined>)[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getFirebase() {
  if (!getApps().length) {
    console.log('[firebase] initializing app');
    const config: FirebaseOptions = {
      apiKey: getRequiredEnv('EXPO_PUBLIC_FB_API_KEY'),
      authDomain: getRequiredEnv('EXPO_PUBLIC_FB_AUTH_DOMAIN'),
      projectId: getRequiredEnv('EXPO_PUBLIC_FB_PROJECT_ID'),
      storageBucket: getRequiredEnv('EXPO_PUBLIC_FB_STORAGE_BUCKET'),
      messagingSenderId: getRequiredEnv('EXPO_PUBLIC_FB_MESSAGING_SENDER_ID'),
      appId: getRequiredEnv('EXPO_PUBLIC_FB_APP_ID'),
      ...(process.env.EXPO_PUBLIC_FB_MEASUREMENT_ID
        ? { measurementId: process.env.EXPO_PUBLIC_FB_MEASUREMENT_ID }
        : {}),
    };
    app = initializeApp(config);
  } else {
    console.log('[firebase] reusing existing app instance');
    app = getApps()[0]!;
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  return { app, auth, db, storage } as const;
}

export type { FirebaseApp };

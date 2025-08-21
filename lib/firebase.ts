import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

export function getFirebase() {
  if (!getApps().length) {
    console.log('[firebase] initializing app');
    app = initializeApp({
      apiKey: 'AIzaSyC62mXV0PZo5iSkOgu9kMleXbRrPJKTanw',
      authDomain: 'matchflow-5be7b.firebaseapp.com',
      projectId: 'matchflow-5be7b',
      storageBucket: 'matchflow-5be7b.firebasestorage.app',
      messagingSenderId: '444386070878',
      appId: '1:444386070878:web:655ee31a7bb9fc2e4b3fcf',
    });
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

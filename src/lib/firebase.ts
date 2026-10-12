import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Resolve environment variables safely in both Vite (browser) and Node (test scripts).
// In Vite, import.meta.env is always defined. In Node/tsx, it may be undefined, so
// we fall back to process.env which test scripts populate from .env.local.
const _env: Record<string, string | undefined> =
  (typeof import.meta !== 'undefined' && (import.meta as any).env)
    ? (import.meta as any).env
    : (typeof process !== 'undefined' ? process.env : {});

// Your web app's Firebase configuration
// We use import.meta.env for Vite environment variables
const firebaseConfig = {
  apiKey:            _env.VITE_FIREBASE_API_KEY            || 'dummy_key',
  authDomain:        _env.VITE_FIREBASE_AUTH_DOMAIN        || 'dummy_domain',
  projectId:         _env.VITE_FIREBASE_PROJECT_ID         || 'dummy_project',
  storageBucket:     _env.VITE_FIREBASE_STORAGE_BUCKET     || 'dummy_bucket',
  messagingSenderId: _env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'dummy_sender',
  appId:             _env.VITE_FIREBASE_APP_ID             || 'dummy_app',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Initialize Cloud Functions and get a reference to the service
export const functions = getFunctions(app, 'us-central1');

// Connect to emulators if in development mode
const isDev = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env.DEV 
  : process.env.NODE_ENV !== 'production';

if (isDev) {
  console.log('Connecting to Firebase Emulators...');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}



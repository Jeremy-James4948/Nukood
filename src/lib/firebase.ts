import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

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
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);



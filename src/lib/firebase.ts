import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// We use import.meta.env for Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy_domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy_project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy_bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy_sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy_app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);



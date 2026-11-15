// Firebase Integration with Full Offline & Local Fallback
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalSnapLensApp12345",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "snaplens-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "snaplens-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "snaplens-app.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "965162169493",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:965162169493:web:4403d1184e561ec8bd579c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0C7K8W7DX3"
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let isFirebaseConfigured = false;

try {
  // Initialize Firebase when valid non-dummy API key is present
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    !import.meta.env.VITE_FIREBASE_API_KEY.includes('Dummy')
  ) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isFirebaseConfigured = true;
  }
} catch (err) {
  console.warn("Firebase live connection initialized with fallback:", err);
}

export { app, auth, db, storage, isFirebaseConfigured, firebaseConfig };

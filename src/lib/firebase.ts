import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, type Firestore } from 'firebase/firestore';
import { getDatabase, type Database } from 'firebase/database';

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _rtdb: Database | null = null;

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'travel-agent-management-29c27.firebaseapp.com',
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://travel-agent-management-29c27-default-rtdb.firebaseio.com/`,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'travel-agent-management-29c27',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'travel-agent-management-29c27.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '387994411670',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:387994411670:web:5591a4bc9e4befb09f18b7',
  };
}

function initializeFirebaseApp() {
  if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    if (!app) {
      app = getApps().length > 0 ? getApps()[0] : initializeApp(getFirebaseConfig());
    }
  }
  return app;
}

export const getFirebaseAppInstance = (): FirebaseApp | null => {
  initializeFirebaseApp();
  return app;
};

export const getAuthInstance = (): Auth | null => {
  if (!_auth) {
    const firebaseApp = initializeFirebaseApp();
    if (firebaseApp) {
      _auth = getAuth(firebaseApp);
      if (typeof window !== 'undefined') {
        setPersistence(_auth, browserLocalPersistence).catch((err) => {
          console.warn('[Firebase Auth] Persistence configuration notice:', err);
        });
      }
    }
  }
  return _auth;
};

export const getDbInstance = (): Firestore | null => {
  if (!_db) {
    const firebaseApp = initializeFirebaseApp();
    if (firebaseApp) {
      try {
        // Use long-polling to prevent 10s backend connection timeouts caused by WebChannel streaming
        // issues with certain ISPs, VPNs, proxies, antivirus, or browser extensions
        _db = initializeFirestore(firebaseApp, {
          experimentalForceLongPolling: true,
        });
      } catch {
        _db = getFirestore(firebaseApp);
      }
    }
  }
  return _db;
};

export const getRtdbInstance = (): Database | null => {
  if (!_rtdb) {
    const firebaseApp = initializeFirebaseApp();
    if (firebaseApp) {
      _rtdb = getDatabase(firebaseApp);
    }
  }
  return _rtdb;
};

export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null;
  const { getMessaging, isSupported } = await import('firebase/messaging');
  const supported = await isSupported();
  if (!supported) return null;
  const firebaseApp = initializeFirebaseApp();
  if (!firebaseApp) return null;
  return getMessaging(firebaseApp);
};

// For backward compatibility, but these will be null during SSR/build time
export const auth = getAuthInstance();
export const db = getDbInstance();
export const rtdb = getRtdbInstance();

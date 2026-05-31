import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Clean up stale internal Firestore tab sync keys to free up localStorage constraints
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const key = window.localStorage.key(i);
      if (key && (
        key.startsWith('firestore_mutations_') || 
        key.startsWith('firestore_targets_') || 
        key.startsWith('firestore_offline_') || 
        key.includes('ai-studio-bf578380-822c-4e9e-ab4d-6aae72eb23d9')
      )) {
        window.localStorage.removeItem(key);
      }
    }
  }
} catch (e) {
  console.warn("Unable to clear stale internal Firestore cache keys:", e);
}

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache()
}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);
const storage = getStorage(app);

// Messaging initialization
let messaging = null;
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
     messaging = getMessaging(app);
  }
} catch (e) {
  console.warn("Firebase Messaging not supported in this environment:", e);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// CRITICAL: Validate connection to Firestore
// (Removed to avoid triggering unhandled quota exception loops)
export { db, auth, app, messaging, storage };

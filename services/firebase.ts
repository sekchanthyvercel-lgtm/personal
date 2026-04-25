import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDocFromServer } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'; 
import { AppData, BackupEntry } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // CRITICAL: Database ID
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

enum OperationType {
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const DOC_PATH = 'portal/data';

let isOffline = false;

// Authenticate via Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-in Error:", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Sign-out Error:", error);
  }
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
      isOffline = true;
    }
  }
}
testConnection();

// 4. Real-time Subscription logic needed by App.tsx
export const subscribeToData = (
  userId: string,
  onData: (data: AppData) => void,
  onError: (error: any) => void
) => {
  if (!userId) {
    onError(new Error("User not authenticated"));
    return () => {};
  }
  
  const docRef = doc(db, 'users', userId, 'appData', 'data');
  
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data() as AppData;
      // Provide defaults if missing
      onData({
        ...data,
        students: data.students || [],
        attendance: data.attendance || {},
        systemLocked: data.systemLocked || false
      });
    } else {
      // Document doesn't exist yet, initialize it
      const initialData: AppData = { students: [], attendance: {}, systemLocked: false };
      setDoc(docRef, initialData).catch((err) => handleFirestoreError(err, OperationType.WRITE, docRef.path));
      onData(initialData);
    }
  }, (error) => {
    isOffline = true;
    handleFirestoreError(error, OperationType.GET, docRef.path);
  });

  return unsubscribe;
};

export const saveData = async (userId: string, data: AppData) => {
  if (!userId) return;
  const docRef = doc(db, 'users', userId, 'appData', 'data');
  try {
    await setDoc(docRef, data, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path);
  }
};

export const createCloudBackup = async (data: AppData, type: 'Auto' | 'Manual' = 'Manual') => {
  console.log(`Local backup created (${type})`);
  const historyKey = 'dps_backups_local';
  const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
  history.unshift({
    timestamp: new Date().toISOString(),
    data: data,
    type: type,
    id: Math.random().toString(36).substr(2, 9)
  });
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 10)));
};

export const getCloudBackups = async (): Promise<Partial<BackupEntry>[]> => {
  const historyKey = 'dps_backups_local';
  return JSON.parse(localStorage.getItem(historyKey) || '[]');
};

export const getSyncStatus = () => !isOffline;

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDocFromServer, collection, writeBatch } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'; 
import { AppData, BackupEntry, Student } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // CRITICAL: Database ID
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Auth Helpers
export { signInWithEmailAndPassword, createUserWithEmailAndPassword };

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
// Aggregates data from subcollections to keep AppData interface compatible
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
  const unsubscribes: (() => void)[] = [];
  
  let currentData: AppData = { 
    students: [], 
    attendance: {}, 
    systemLocked: false,
    expenses: [],
    journalEntries: {},
    dpssTopics: [],
    dailyTasks: {},
    habitCompletions: {},
    dailyNotes: {}
  };

  const notifyChange = () => {
    onData({ ...currentData });
  };

  // 1. Subscribe to main settings document
  const unsubMain = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const mainData = docSnap.data();
      currentData = { ...currentData, ...mainData };
      notifyChange();
    } else {
      const initialData: AppData = { students: [], attendance: {}, systemLocked: false };
      setDoc(docRef, initialData).catch((err) => handleFirestoreError(err, OperationType.WRITE, docRef.path));
    }
  }, (err) => handleFirestoreError(err, OperationType.GET, docRef.path));
  unsubscribes.push(unsubMain);

  // 2. Subscribe to Students collection
  const studentsRef = collection(db, 'users', userId, 'students');
  const unsubStudents = onSnapshot(studentsRef, (querySnap) => {
    currentData.students = querySnap.docs.map(d => d.data() as Student).sort((a, b) => (a.order || 0) - (b.order || 0));
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, studentsRef.path));
  unsubscribes.push(unsubStudents);

  // 3. Subscribe to Expenses collection
  const expensesRef = collection(db, 'users', userId, 'expenses');
  const unsubExpenses = onSnapshot(expensesRef, (querySnap) => {
    currentData.expenses = querySnap.docs.map(d => d.data() as any);
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, expensesRef.path));
  unsubscribes.push(unsubExpenses);

  // 4. Subscribe to Journal collection
  const journalRef = collection(db, 'users', userId, 'journal');
  const unsubJournal = onSnapshot(journalRef, (querySnap) => {
    const entries: any = {};
    querySnap.docs.forEach(d => { entries[d.id] = d.data(); });
    currentData.journalEntries = entries;
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, journalRef.path));
  unsubscribes.push(unsubJournal);

  // 5. Subscribe to Attendance collection
  const attendanceRef = collection(db, 'users', userId, 'attendance');
  const unsubAttendance = onSnapshot(attendanceRef, (querySnap) => {
    const attendance: any = {};
    querySnap.docs.forEach(d => { attendance[d.id] = d.data(); });
    currentData.attendance = attendance;
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, attendanceRef.path));
  unsubscribes.push(unsubAttendance);

  // 6. Subscribe to Daily Tasks collection
  const dailyTasksRef = collection(db, 'users', userId, 'dailyTasks');
  const unsubDailyTasks = onSnapshot(dailyTasksRef, (querySnap) => {
    const tasks: any = {};
    querySnap.docs.forEach(d => { tasks[d.id] = d.data(); });
    currentData.dailyTasks = tasks;
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, dailyTasksRef.path));
  unsubscribes.push(unsubDailyTasks);

  // 7. Subscribe to DPSS Topics collection
  const topicsRef = collection(db, 'users', userId, 'dpssTopics');
  const unsubTopics = onSnapshot(topicsRef, (querySnap) => {
    currentData.dpssTopics = querySnap.docs.map(d => d.data() as any);
    notifyChange();
  }, (err) => handleFirestoreError(err, OperationType.GET, topicsRef.path));
  unsubscribes.push(unsubTopics);

  return () => unsubscribes.forEach(u => u());
};

export const saveData = async (userId: string, data: AppData) => {
  if (!userId) return;
  
  const { 
    students, 
    expenses, 
    journalEntries, 
    dpssTopics, 
    dailyTasks, 
    attendance,
    habitCompletions, 
    dailyNotes,
    ...mainSettings 
  } = data;

  const docRef = doc(db, 'users', userId, 'appData', 'data');
  const batch = writeBatch(db);

  try {
    batch.set(docRef, mainSettings, { merge: true });

    // For full updates (like from settings), we still save the core.
    // For lists, the UI components should use the specialized functions below.
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docRef.path);
  }
};

// Specialized save functions
export const saveStudent = async (userId: string, student: Student) => {
  if (!userId || !student.id) return;
  const docRef = doc(db, 'users', userId, 'students', student.id);
  await setDoc(docRef, student, { merge: true });
};

export const saveAttendance = async (userId: string, date: string, data: Record<string, number>) => {
  if (!userId || !date) return;
  const docRef = doc(db, 'users', userId, 'attendance', date);
  await setDoc(docRef, data, { merge: true });
};

export const saveExpense = async (userId: string, expense: any) => {
  if (!userId || !expense.id) return;
  const docRef = doc(db, 'users', userId, 'expenses', expense.id);
  await setDoc(docRef, expense, { merge: true });
};

export const saveJournalEntry = async (userId: string, date: string, entry: any) => {
  if (!userId || !date) return;
  const docRef = doc(db, 'users', userId, 'journal', date);
  await setDoc(docRef, entry, { merge: true });
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

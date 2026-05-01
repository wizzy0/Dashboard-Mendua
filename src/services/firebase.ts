import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, getDoc } from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

const CONFIG = firebaseConfig && firebaseConfig.apiKey ? firebaseConfig : {
  apiKey: 'mock-key',
  authDomain: 'mock-auth',
  projectId: 'mock-project',
  storageBucket: 'mock-storage',
  messagingSenderId: 'mock-sender',
  appId: 'mock-app',
  firestoreDatabaseId: '(default)'
};

const app = initializeApp(CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app, (CONFIG as any).firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

export const signIn = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

// Firestore Error Handler as per integration[firebase] guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

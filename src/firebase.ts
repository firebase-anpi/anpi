import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import {
  Functions,
  getFunctions,
  connectFunctionsEmulator,
} from 'firebase/functions';
import {
  FirebaseStorage,
  getStorage,
  connectStorageEmulator,
} from 'firebase/storage';

const firebaseConfig = {
  // [Note] Firebaseにデプロイする際は、自身のFirebaseプロジェクトの値を以下に設定してください
  apiKey: '*****',
  authDomain: 'anpi-prod.firebaseapp.com',
  projectId: 'anpi-prod',
  storageBucket: 'anpi-prod.appspot.com',
  messagingSenderId: '*****',
  appId: '*****',
  measurementId: '*****',
};

const firebase: FirebaseApp = initializeApp(firebaseConfig);
const region = 'asia-northeast1';

const auth: Auth = getAuth();
const db: Firestore = getFirestore();
const storage: FirebaseStorage = getStorage();
// Emulator上のFunctionsのリージョンは、明示しないとus-central1になる
const functions: Functions = getFunctions(firebase, region);

const useEmulator = window.location.hostname === 'localhost';
if (useEmulator) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { firebase, auth, db, storage, functions };

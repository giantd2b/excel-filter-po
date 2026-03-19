import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type Auth,
} from 'firebase/auth';

let getReactNativePersistence: any;
let AsyncStorage: any;

try {
  // Firebase Auth v10.12+ exports from firebase/auth
  getReactNativePersistence = require('firebase/auth').getReactNativePersistence;
} catch {
  try {
    // Older versions export from firebase/auth/react-native
    getReactNativePersistence = require('firebase/auth/react-native').getReactNativePersistence;
  } catch {}
}

try {
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch {}

const firebaseConfig = {
  apiKey: 'AIzaSyDBe0f0rsRhNqXIvVoU6fR-yHbG4nSbZRU',
  authDomain: 'excel-filter-po.firebaseapp.com',
  projectId: 'excel-filter-po',
  storageBucket: 'excel-filter-po.appspot.com',
  messagingSenderId: '818715663979',
  appId: '1:818715663979:web:19ef1b6a914b19b65adb2e',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: Auth;
try {
  if (getReactNativePersistence && AsyncStorage) {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } else {
    auth = getAuth(app);
  }
} catch {
  // Already initialized — just get existing instance
  auth = getAuth(app);
}

export { auth, signInWithEmailAndPassword, signOut, type User };
export default app;

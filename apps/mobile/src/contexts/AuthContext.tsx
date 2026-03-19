import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { connectSocket, disconnectSocket } from '../services/socket';
import api from '../services/api';

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  biometricEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometric: () => Promise<boolean>;
  logout: () => Promise<void>;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  biometricEnabled: false,
  login: async () => {},
  loginWithBiometric: async () => false,
  logout: async () => {},
  enableBiometric: async () => {},
  disableBiometric: async () => {},
});

const BIOMETRIC_CRED_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

function safeSecureStore(method: 'get' | 'set' | 'delete', key: string, value?: string): Promise<any> {
  try {
    if (method === 'get') return SecureStore.getItemAsync(key).catch(() => null);
    if (method === 'set' && value !== undefined) return SecureStore.setItemAsync(key, value).catch(() => {});
    if (method === 'delete') return SecureStore.deleteItemAsync(key).catch(() => {});
  } catch {}
  return Promise.resolve(null);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const isLoggingIn = useRef(false);

  // Check biometric status on mount
  useEffect(() => {
    safeSecureStore('get', BIOMETRIC_ENABLED_KEY).then((v) => setBiometricEnabled(v === 'true'));
  }, []);

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Don't use async callback — handle everything with .then/.catch
      if (firebaseUser) {
        firebaseUser.getIdToken()
          .then((idToken) => safeSecureStore('set', 'firebaseToken', idToken))
          .then(() => {
            const adminUser: AdminUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            };
            safeSecureStore('set', 'user', JSON.stringify(adminUser));
            setUser(adminUser);
            // Connect socket (non-blocking)
            try { connectSocket().catch(() => {}); } catch {}
          })
          .catch((err) => {
            console.error('[Auth] Token error:', err);
          })
          .finally(() => setLoading(false));
      } else {
        safeSecureStore('delete', 'firebaseToken');
        safeSecureStore('delete', 'user');
        try { disconnectSocket(); } catch {}
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    isLoggingIn.current = true;
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the rest

    // Save credentials for biometric
    safeSecureStore('set', BIOMETRIC_CRED_KEY, JSON.stringify({ email, password }));

    // Prompt biometric after delay
    setTimeout(async () => {
      try {
        const alreadyEnabled = await safeSecureStore('get', BIOMETRIC_ENABLED_KEY);
        if (alreadyEnabled === 'true' || alreadyEnabled === 'asked') return;

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) return;

        await safeSecureStore('set', BIOMETRIC_ENABLED_KEY, 'asked');
        Alert.alert(
          'เข้าสู่ระบบด้วย Face ID',
          'ต้องการใช้ Face ID / Touch ID เข้าสู่ระบบครั้งต่อไปหรือไม่?',
          [
            { text: 'ไม่ใช้', style: 'cancel' },
            {
              text: 'เปิดใช้งาน',
              onPress: () => {
                safeSecureStore('set', BIOMETRIC_ENABLED_KEY, 'true');
                setBiometricEnabled(true);
              },
            },
          ],
        );
      } catch {}
      isLoggingIn.current = false;
    }, 2000);

    // Log auth event
    setTimeout(() => {
      const platform = Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android';
      api.post('/admins/auth-log', { action: 'login', platform }).catch(() => {});
    }, 3000);
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const enabled = await safeSecureStore('get', BIOMETRIC_ENABLED_KEY);
      if (enabled !== 'true') return false;

      const credStr = await safeSecureStore('get', BIOMETRIC_CRED_KEY);
      if (!credStr) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'เข้าสู่ระบบ IRIS CRM',
        cancelLabel: 'ใช้รหัสผ่าน',
        disableDeviceFallback: false,
      });

      if (!result.success) return false;

      const { email, password } = JSON.parse(credStr);
      await signInWithEmailAndPassword(auth, email, password);

      setTimeout(() => {
        const platform = Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android';
        api.post('/admins/auth-log', { action: 'login_biometric', platform }).catch(() => {});
      }, 3000);

      return true;
    } catch (err) {
      console.error('[Auth] Biometric login error:', err);
      return false;
    }
  }, []);

  const enableBiometric = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('ไม่รองรับ', 'อุปกรณ์นี้ไม่รองรับ Face ID / Touch ID');
        return;
      }
      await safeSecureStore('set', BIOMETRIC_ENABLED_KEY, 'true');
      setBiometricEnabled(true);
    } catch {}
  }, []);

  const disableBiometric = useCallback(async () => {
    await safeSecureStore('set', BIOMETRIC_ENABLED_KEY, 'false');
    await safeSecureStore('delete', BIOMETRIC_CRED_KEY);
    setBiometricEnabled(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      const platform = Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android';
      api.post('/admins/auth-log', { action: 'logout', platform }).catch(() => {});
    } catch {}
    try { disconnectSocket(); } catch {}
    try { await signOut(auth); } catch {}
    safeSecureStore('delete', 'firebaseToken');
    safeSecureStore('delete', 'user');
    setUser(null);
  }, []);

  // Register global force logout handler
  useEffect(() => {
    (global as any).__forceLogout = () => {
      try { signOut(auth); } catch {}
      safeSecureStore('delete', 'firebaseToken');
      safeSecureStore('delete', 'user');
      try { disconnectSocket(); } catch {}
      setUser(null);
    };
    return () => { delete (global as any).__forceLogout; };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, loading, biometricEnabled,
        login, loginWithBiometric, logout,
        enableBiometric, disableBiometric,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

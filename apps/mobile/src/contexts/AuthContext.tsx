import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  auth,
  signInWithEmailAndPassword,
  signOut,
} from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { connectSocket, disconnectSocket } from '../services/socket';

interface AdminUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });

        // Store token for API calls
        firebaseUser.getIdToken().then((token) => {
          SecureStore.setItemAsync('firebaseToken', token).catch(() => {});
        }).catch(() => {});

        // Connect WebSocket for real-time updates
        connectSocket().catch(() => {});
      } else {
        setUser(null);
        SecureStore.deleteItemAsync('firebaseToken').catch(() => {});
        try { disconnectSocket(); } catch {}
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // OS suspends the socket in background — make sure we're reconnected (with a
  // fresh token) as soon as the app comes back to the foreground.
  useEffect(() => {
    if (!user) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        connectSocket().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    try { disconnectSocket(); } catch {}
    await signOut(auth);
  }, []);

  const contextValue = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

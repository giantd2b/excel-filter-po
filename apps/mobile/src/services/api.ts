import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { auth } from './firebase';

const API_BASE_URL = 'https://harmonious-presence-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/**
 * Get a fresh Firebase ID token.
 * If the cached token is still valid, Firebase SDK returns it from cache.
 * Otherwise it refreshes automatically.
 */
let cachedToken: string | null = null;

async function getFreshToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken(/* forceRefresh */ false);
      // Only write to SecureStore when token actually changes
      if (idToken !== cachedToken) {
        cachedToken = idToken;
        SecureStore.setItemAsync('firebaseToken', idToken).catch(() => {});
      }
      return idToken;
    } catch {
      // Firebase SDK refresh failed, try stored token
    }
  }
  if (cachedToken) return cachedToken;
  return SecureStore.getItemAsync('firebaseToken');
}

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const token = await getFreshToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 - force refresh token, then retry once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      auth.currentUser
    ) {
      originalRequest._retry = true;

      try {
        const freshToken = await auth.currentUser.getIdToken(/* forceRefresh */ true);
        await SecureStore.setItemAsync('firebaseToken', freshToken);
        originalRequest.headers.Authorization = `Bearer ${freshToken}`;
        return api(originalRequest);
      } catch {
        // Token refresh failed - force logout
        await SecureStore.deleteItemAsync('firebaseToken');
        if ((global as any).__forceLogout) {
          (global as any).__forceLogout();
        }
      }
    }
    return Promise.reject(error);
  },
);

export { API_BASE_URL };
export default api;

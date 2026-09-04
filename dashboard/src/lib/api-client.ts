import { auth } from "./firebase";

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { signal }),

  post: <T>(path: string, body: unknown, signal?: AbortSignal) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      signal,
    }),

  put: <T>(path: string, body: unknown, signal?: AbortSignal) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(body),
      signal,
    }),

  patch: <T>(path: string, body: unknown, signal?: AbortSignal) =>
    request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(body),
      signal,
    }),

  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: "DELETE", signal }),

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const user = auth.currentUser;
    const headers: Record<string, string> = {};
    if (user) {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(error.message || `Upload error: ${res.status}`);
    }
    return res.json();
  },
};

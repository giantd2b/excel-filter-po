import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api-client";

export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "AGENT";

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  role: AdminRole;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminContextType {
  admin: AdminProfile | null;
  loading: boolean;
  isSuper: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  hasRole: (...roles: AdminRole[]) => boolean;
  refreshAdmin: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdmin = useCallback(async () => {
    if (!user) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.get<AdminProfile>("/admins/me");
      setAdmin(data);
    } catch (err) {
      console.error("Failed to fetch admin profile:", err);
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch admin on auth change
  useEffect(() => {
    setLoading(true);
    fetchAdmin();
  }, [fetchAdmin]);

  // Heartbeat every 2 minutes
  useEffect(() => {
    if (!admin) return;

    const sendHeartbeat = () => {
      api.post("/admins/heartbeat", {}).catch(() => {});
    };

    // Send immediately on mount
    sendHeartbeat();

    const interval = setInterval(sendHeartbeat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [admin?.id]);

  const isSuper = admin?.role === "SUPER_ADMIN";
  const isAdmin = admin?.role === "ADMIN" || admin?.role === "SUPER_ADMIN";
  const isAgent = admin?.role === "AGENT";

  const hasRole = useCallback(
    (...roles: AdminRole[]) => {
      if (!admin) return false;
      return roles.includes(admin.role);
    },
    [admin]
  );

  return (
    <AdminContext.Provider
      value={{
        admin,
        loading,
        isSuper,
        isAdmin,
        isAgent,
        hasRole,
        refreshAdmin: fetchAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
}

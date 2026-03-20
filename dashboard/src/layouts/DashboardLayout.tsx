import { useEffect } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useGlobalNotifications } from "@/hooks/useGlobalNotifications";
import Navbar from "@/components/Navbar";

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isInbox = pathname.startsWith("/dashboard/inbox");

  // Global notification listener — works on ALL pages
  useGlobalNotifications();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Noto Sans Thai', sans-serif" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/20 animate-pulse">
            <span className="text-[10px] font-black text-white tracking-tight">IR</span>
          </div>
          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Noto Sans Thai', sans-serif" }}>
      <Navbar />
      {isInbox ? (
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      ) : (
        <main className="flex-1 overflow-auto max-w-7xl w-full mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      )}
    </div>
  );
}

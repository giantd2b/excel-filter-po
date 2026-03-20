import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-50 text-purple-600 ring-1 ring-purple-500/10",
  ADMIN: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/10",
  AGENT: "bg-slate-50 text-slate-500 ring-1 ring-slate-500/10",
};

export default function Navbar() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const { admin, isAgent } = useAdmin();

  const navItems = [
    { href: "/dashboard/inbox", label: "Inbox" },
    { href: "/dashboard", label: "สถิติ" },
    { href: "/dashboard/new-customers", label: "ลูกค้าใหม่" },
    { href: "/dashboard/users", label: "รายชื่อ Users" },
    { href: "/dashboard/slip-report", label: "รายงานสลิป" },
    // Only show admin management and analytics for non-agents
    ...(!isAgent
      ? [
          { href: "/dashboard/analytics", label: "วิเคราะห์" },
          { href: "/dashboard/templates", label: "เทมเพลต" },
          { href: "/dashboard/knowledge", label: "ฐานความรู้" },
          { href: "/dashboard/admins", label: "ผู้ดูแลระบบ" },
        ]
      : []),
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/dashboard" && pathname?.startsWith(href));

  return (
    <nav className="bg-white border-b border-slate-200/60 shadow-[0_1px_2px_rgba(0,0,0,0.03)]" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Noto Sans Thai', sans-serif" }}>
      <div className="w-full px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-500/20">
                <span className="text-[11px] font-black text-white tracking-tight">IR</span>
              </div>
              <span className="text-[15px] font-bold text-slate-800 tracking-tight">
                IRIS
              </span>
            </div>

            {/* Center: Nav links */}
            <div className="hidden sm:flex items-center gap-0.5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`inline-flex items-center px-2.5 py-1.5 text-[13px] font-medium rounded-md transition-all duration-150 ${
                    isActive(item.href)
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Profile + Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {admin?.avatar ? (
                <img
                  src={admin.avatar}
                  alt={admin.name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : admin ? (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {admin.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : null}
              <div className="hidden sm:block">
                <p className="text-[13px] font-medium text-slate-700 leading-tight">
                  {admin?.name || admin?.email}
                </p>
                {admin && (
                  <span
                    className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-md mt-0.5 ${
                      ROLE_BADGE_COLORS[admin.role] || "bg-slate-50 text-slate-500"
                    }`}
                  >
                    {ROLE_LABELS[admin.role] || admin.role}
                  </span>
                )}
              </div>
            </div>
            <div className="w-px h-6 bg-slate-200/60" />
            <button
              onClick={handleSignOut}
              className="text-[13px] font-medium text-slate-400 hover:text-red-500 px-2.5 py-1.5 rounded-md hover:bg-red-50 transition-all duration-150"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

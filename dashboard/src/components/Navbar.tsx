import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useAdmin } from "@/context/AdminContext";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  AGENT: "bg-slate-100 text-slate-600",
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

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-indigo-600 tracking-tight">
                IRIS CRM
              </span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname?.startsWith(item.href))
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin profile section */}
            <div className="flex items-center gap-2">
              {admin?.avatar ? (
                <img
                  src={admin.avatar}
                  alt={admin.name}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ) : admin ? (
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-2 ring-white shadow-sm">
                  <span className="text-sm font-semibold text-indigo-600">
                    {admin.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              ) : null}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-700 leading-tight">
                  {admin?.name || admin?.email}
                </p>
                {admin && (
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      ROLE_BADGE_COLORS[admin.role] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ROLE_LABELS[admin.role] || admin.role}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

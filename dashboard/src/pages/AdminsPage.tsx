import { useEffect, useState } from "react";
import { useAdmin, AdminProfile, AdminRole } from "@/context/AdminContext";
import { api } from "@/lib/api-client";
import { Shield, ShieldCheck, User, Plus, X } from "lucide-react";

interface OnlineAdmin {
  id: string;
  name: string;
  lastSeenAt: string;
}

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

const ROLE_COLORS: Record<AdminRole, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-indigo-100 text-indigo-700",
  AGENT: "bg-slate-100 text-slate-600",
};

export default function AdminsPage() {
  const { admin: currentAdmin, isSuper } = useAdmin();
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form
  const [addForm, setAddForm] = useState({
    email: "",
    name: "",
    role: "AGENT" as AdminRole,
    password: "",
  });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const [adminsData, onlineData] = await Promise.all([
        api.get<AdminProfile[]>("/admins"),
        api.get<OnlineAdmin[]>("/admins/online"),
      ]);
      setAdmins(adminsData);
      setOnlineIds(new Set(onlineData.map((a) => a.id)));
    } catch {
      setError("ไม่สามารถโหลดข้อมูลผู้ดูแลระบบได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();

    // Refresh online status every 30 seconds
    const interval = setInterval(async () => {
      try {
        const onlineData = await api.get<OnlineAdmin[]>("/admins/online");
        setOnlineIds(new Set(onlineData.map((a) => a.id)));
      } catch {
        // ignore
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  const handleAdd = async () => {
    if (!addForm.email || !addForm.name || !addForm.password) return;
    setSaving(true);
    try {
      await api.post("/admins", addForm);
      setShowAddModal(false);
      setAddForm({ email: "", name: "", role: "AGENT", password: "" });
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเพิ่มผู้ดูแล");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (adminId: string, newRole: AdminRole) => {
    try {
      await api.put(`/admins/${adminId}`, { role: newRole });
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการเปลี่ยน role");
    }
  };

  const handleDeactivate = async (adminId: string) => {
    if (!confirm("ยืนยันการปิดใช้งานผู้ดูแลนี้?")) return;
    try {
      await api.post(`/admins/${adminId}/deactivate`, {});
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleActivate = async (adminId: string) => {
    try {
      await api.post(`/admins/${adminId}/activate`, {});
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleEditSave = async () => {
    if (!editingAdmin) return;
    setSaving(true);
    try {
      await api.put(`/admins/${editingAdmin.id}`, {
        name: editingAdmin.name,
        avatar: editingAdmin.avatar,
      });
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err: any) {
      alert(err.message || "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const formatLastSeen = (lastSeenAt: string | null) => {
    if (!lastSeenAt) return "ไม่เคยเข้าสู่ระบบ";
    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffMinutes < 1) return "ออนไลน์";
    if (diffMinutes < 5) return `${diffMinutes} นาทีที่แล้ว`;
    if (diffMinutes < 60) return `${diffMinutes} นาทีที่แล้ว`;
    if (diffMinutes < 1440)
      return `${Math.floor(diffMinutes / 60)} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            จัดการผู้ดูแลระบบ
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            จัดการสิทธิ์และบทบาทของผู้ดูแลระบบ
          </p>
        </div>
        {isSuper && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มผู้ดูแล
          </button>
        )}
      </div>

      {/* Online admins summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          ออนไลน์ตอนนี้
        </h3>
        <div className="flex flex-wrap gap-3">
          {admins
            .filter((a) => onlineIds.has(a.id) && a.isActive)
            .map((a) => (
              <div
                key={a.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {a.avatar ? (
                  <img
                    src={a.avatar}
                    alt={a.name}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-emerald-700">
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span className="text-sm text-emerald-800 font-medium">
                  {a.name}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ROLE_COLORS[a.role]}`}
                >
                  {ROLE_LABELS[a.role]}
                </span>
              </div>
            ))}
          {admins.filter((a) => onlineIds.has(a.id) && a.isActive).length ===
            0 && (
            <span className="text-sm text-gray-400">
              ไม่มีผู้ดูแลออนไลน์
            </span>
          )}
        </div>
      </div>

      {/* Admins table */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ผู้ดูแล
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  บทบาท
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  เข้าใช้ล่าสุด
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((a) => (
                <tr
                  key={a.id}
                  className={!a.isActive ? "bg-gray-50 opacity-60" : ""}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {a.avatar ? (
                          <img
                            src={a.avatar}
                            alt={a.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-sm font-semibold text-indigo-600">
                              {a.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        {onlineIds.has(a.id) && a.isActive && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {a.name}
                          {a.id === currentAdmin?.id && (
                            <span className="ml-2 text-xs text-gray-400">
                              (คุณ)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSuper && a.id !== currentAdmin?.id ? (
                      <select
                        value={a.role}
                        onChange={(e) =>
                          handleRoleChange(a.id, e.target.value as AdminRole)
                        }
                        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="AGENT">Agent</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[a.role]}`}
                      >
                        {a.role === "SUPER_ADMIN" ? (
                          <ShieldCheck className="w-3 h-3" />
                        ) : a.role === "ADMIN" ? (
                          <Shield className="w-3 h-3" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        {ROLE_LABELS[a.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {a.isActive ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ใช้งาน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        ปิดใช้งาน
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatLastSeen(a.lastSeenAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingAdmin({ ...a })}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        แก้ไข
                      </button>
                      {isSuper && a.id !== currentAdmin?.id && (
                        <>
                          {a.isActive ? (
                            <button
                              onClick={() => handleDeactivate(a.id)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              ปิดใช้งาน
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(a.id)}
                              className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                            >
                              เปิดใช้งาน
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                เพิ่มผู้ดูแลระบบ
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({ ...addForm, email: e.target.value })
                  }
                  placeholder="admin@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({ ...addForm, name: e.target.value })
                  }
                  placeholder="ชื่อผู้ดูแล"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่าน
                </label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) =>
                    setAddForm({ ...addForm, password: e.target.value })
                  }
                  placeholder="รหัสผ่านอย่างน้อย 6 ตัว"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  บทบาท
                </label>
                <select
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      role: e.target.value as AdminRole,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                >
                  <option value="AGENT">Agent</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleAdd}
                disabled={
                  saving ||
                  !addForm.email ||
                  !addForm.name ||
                  !addForm.password
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "กำลังบันทึก..." : "เพิ่มผู้ดูแล"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                แก้ไขข้อมูลผู้ดูแล
              </h2>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อ
                </label>
                <input
                  type="text"
                  value={editingAdmin.name}
                  onChange={(e) =>
                    setEditingAdmin({ ...editingAdmin, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL รูปโปรไฟล์
                </label>
                <input
                  type="url"
                  value={editingAdmin.avatar || ""}
                  onChange={(e) =>
                    setEditingAdmin({
                      ...editingAdmin,
                      avatar: e.target.value || null,
                    })
                  }
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingAdmin(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEditSave}
                disabled={saving || !editingAdmin.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

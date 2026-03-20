import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { Loader2, Plus, Copy, Check, Eye, EyeOff, Trash2, Power } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchKeys = async () => {
    try {
      const data = await api.get<ApiKey[]>("/admins/api-keys");
      setKeys(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/admins/api-keys", { name: newName.trim() });
      setNewName("");
      setShowForm(false);
      fetchKeys();
    } catch {
      alert("ไม่สามารถสร้าง API Key ได้");
    }
    setCreating(false);
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.post(`/admins/api-keys/${id}/${isActive ? "deactivate" : "activate"}`, {});
      fetchKeys();
    } catch {}
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบ API Key "${name}" หรือไม่? การลบจะไม่สามารถกู้คืนได้`)) return;
    try {
      await api.post(`/admins/api-keys/${id}/delete`, {});
      fetchKeys();
    } catch {}
  };

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleVisible = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.substring(0, 12) + "•".repeat(20) + key.substring(key.length - 4);

  const formatDate = (d: string | null) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">API Keys</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            จัดการ API Keys สำหรับ External API
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          สร้าง Key ใหม่
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            ชื่อ API Key
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="เช่น IRIS HR, Catering App..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-indigo-500 text-white text-sm font-semibold rounded-lg hover:bg-indigo-600 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "สร้าง"
              )}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : keys.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-400 text-sm">ยังไม่มี API Key</p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`bg-white rounded-xl border p-4 ${
                k.isActive
                  ? "border-slate-200"
                  : "border-red-100 bg-red-50/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">
                      {k.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        k.isActive
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      {k.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded font-mono">
                      {visibleKeys.has(k.id) ? k.key : maskKey(k.key)}
                    </code>
                    <button
                      onClick={() => toggleVisible(k.id)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title={visibleKeys.has(k.id) ? "ซ่อน" : "แสดง"}
                    >
                      {visibleKeys.has(k.id) ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => copyKey(k.id, k.key)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                      title="คัดลอก"
                    >
                      {copiedId === k.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span>สร้างเมื่อ: {formatDate(k.createdAt)}</span>
                    <span>
                      ใช้ล่าสุด: {formatDate(k.lastUsedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggle(k.id, k.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      k.isActive
                        ? "text-amber-500 hover:bg-amber-50"
                        : "text-emerald-500 hover:bg-emerald-50"
                    }`}
                    title={k.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(k.id, k.name)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    title="ลบ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Usage info */}
      <div className="mt-6 bg-slate-50 rounded-xl p-4 border border-slate-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
          วิธีใช้
        </h4>
        <code className="text-xs text-slate-600 block">
          curl -H "X-API-Key: YOUR_KEY" \<br />
          &nbsp;&nbsp;"https://harmonious-presence-production.up.railway.app/api/external/customers"
        </code>
      </div>
    </div>
  );
}

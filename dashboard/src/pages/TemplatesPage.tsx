import { useState, useEffect } from "react";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  ReplyTemplate,
} from "@/lib/api-service";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Zap,
  X,
  Save,
  MessageSquare,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  ทักทาย: "bg-emerald-50 text-emerald-600 border-emerald-200",
  ทั่วไป: "bg-slate-50 text-slate-600 border-slate-200",
  ชำระเงิน: "bg-blue-50 text-blue-600 border-blue-200",
  สั่งอาหาร: "bg-amber-50 text-amber-600 border-amber-200",
  จัดส่ง: "bg-purple-50 text-purple-600 border-purple-200",
  ปิดการขาย: "bg-rose-50 text-rose-600 border-rose-200",
};

function getCategoryStyle(category?: string) {
  return (
    CATEGORY_COLORS[category || ""] ||
    "bg-indigo-50 text-indigo-600 border-indigo-200"
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", text: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.text.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, form);
      } else {
        await createTemplate(form);
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ title: "", text: "", category: "" });
      fetchTemplates();
    } catch (err) {
      console.error("Failed to save template:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template: ReplyTemplate) => {
    setForm({
      title: template.title,
      text: template.text,
      category: template.category || "",
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบเทมเพลตนี้?")) return;
    setDeleting(id);
    try {
      await deleteTemplate(id);
      fetchTemplates();
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: "", text: "", category: "" });
  };

  // Group by category
  const grouped = templates.reduce<Record<string, ReplyTemplate[]>>(
    (acc, t) => {
      const cat = t.category || "ไม่มีหมวดหมู่";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  const categories = [
    ...new Set(templates.map((t) => t.category).filter(Boolean)),
  ] as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Quick Reply Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการเทมเพลตข้อความสำเร็จรูปสำหรับตอบกลับลูกค้า
          </p>
        </div>
        <button
          onClick={() => {
            setForm({ title: "", text: "", category: "" });
            setEditingId(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          เพิ่มเทมเพลต
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            {editingId ? "แก้ไขเทมเพลต" : "เพิ่มเทมเพลตใหม่"}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ชื่อเทมเพลต *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  placeholder="เช่น ทักทายลูกค้า"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  หมวดหมู่
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    placeholder="เช่น ทักทาย, ชำระเงิน"
                    list="categories"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <datalist id="categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                ข้อความ *
              </label>
              <textarea
                value={form.text}
                onChange={(e) =>
                  setForm({ ...form, text: e.target.value })
                }
                placeholder="ข้อความที่ต้องการส่ง..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Preview */}
            {form.text && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-[10px] font-medium text-slate-400 uppercase mb-1.5">
                  Preview
                </p>
                <div className="flex justify-end">
                  <div className="bg-indigo-500 text-white rounded-2xl rounded-br-lg px-4 py-2.5 max-w-[70%]">
                    <p className="text-[13px] whitespace-pre-wrap">
                      {form.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.title.trim() || !form.text.trim() || saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingId ? "บันทึก" : "เพิ่ม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-600 mb-1">
            ยังไม่มีเทมเพลต
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            เพิ่มเทมเพลตข้อความสำเร็จรูปเพื่อตอบกลับลูกค้าได้เร็วขึ้น
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มเทมเพลตแรก
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryStyle(
                    category
                  )}`}
                >
                  {category}
                </span>
                <span className="text-xs text-slate-400">
                  {items.length} เทมเพลต
                </span>
              </div>
              <div className="grid gap-3">
                {items.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-800">
                          {template.title}
                        </h4>
                        <p className="text-[13px] text-slate-500 mt-1 whitespace-pre-wrap line-clamp-3">
                          {template.text}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(template)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                          title="แก้ไข"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          disabled={deleting === template.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="ลบ"
                        >
                          {deleting === template.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

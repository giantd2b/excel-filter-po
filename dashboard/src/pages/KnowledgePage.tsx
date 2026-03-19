import { useState, useEffect, useMemo } from "react";
import {
  getKnowledgeEntries,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  deleteKnowledgeEntry,
  bulkImportKnowledge,
  KnowledgeEntry,
} from "@/lib/api-service";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  BookOpen,
  X,
  Save,
  Upload,
  Eye,
  EyeOff,
  ChevronDown,
  BarChart3,
} from "lucide-react";

const SERVICES = [
  "งานบุญ/พิธีสงฆ์",
  "อาหารไทยบุฟเฟต์",
  "โต๊ะจีน",
  "Cocktail/Canapé",
  "งานแต่งงาน",
  "International Buffet",
];

const SERVICE_COLORS: Record<string, string> = {
  "งานบุญ/พิธีสงฆ์": "bg-amber-50 text-amber-700 border-amber-200",
  "อาหารไทยบุฟเฟต์": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "โต๊ะจีน": "bg-red-50 text-red-700 border-red-200",
  "Cocktail/Canapé": "bg-purple-50 text-purple-700 border-purple-200",
  "งานแต่งงาน": "bg-pink-50 text-pink-700 border-pink-200",
  "International Buffet": "bg-blue-50 text-blue-700 border-blue-200",
};

const SERVICE_SHORT: Record<string, string> = {
  "งานบุญ/พิธีสงฆ์": "งานบุญ",
  "อาหารไทยบุฟเฟต์": "บุฟเฟต์",
  "โต๊ะจีน": "โต๊ะจีน",
  "Cocktail/Canapé": "Cocktail",
  "งานแต่งงาน": "งานแต่ง",
  "International Buffet": "International",
};

function getServiceStyle(service: string) {
  return SERVICE_COLORS[service] || "bg-slate-50 text-slate-600 border-slate-200";
}

interface FormData {
  service: string;
  category: string;
  question: string;
  answer: string;
  keywords: string;
  sortOrder: number;
  isActive: boolean;
}

const EMPTY_FORM: FormData = {
  service: SERVICES[0],
  category: "",
  question: "",
  answer: "",
  keywords: "",
  sortOrder: 0,
  isActive: true,
};

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const data = await getKnowledgeEntries();
      setEntries(data);
    } catch (err) {
      console.error("Failed to fetch knowledge entries:", err);
    } finally {
      setLoading(false);
    }
  };

  // Derived data
  const categories = useMemo(() => {
    const cats = new Set<string>();
    entries.forEach((e) => cats.add(e.category));
    return Array.from(cats).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (serviceFilter !== "all" && e.service !== serviceFilter) return false;
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.question.toLowerCase().includes(q) ||
          e.answer.toLowerCase().includes(q) ||
          (e.keywords && e.keywords.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [entries, serviceFilter, categoryFilter, searchQuery]);

  const serviceStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number }> = {};
    entries.forEach((e) => {
      if (!stats[e.service]) stats[e.service] = { total: 0, active: 0 };
      stats[e.service].total++;
      if (e.isActive) stats[e.service].active++;
    });
    return stats;
  }, [entries]);

  // Handlers
  const handleSubmit = async () => {
    if (!form.question.trim() || !form.answer.trim() || !form.service) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateKnowledgeEntry(editingId, {
          service: form.service,
          category: form.category,
          question: form.question,
          answer: form.answer,
          keywords: form.keywords || null,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
      } else {
        await createKnowledgeEntry({
          service: form.service,
          category: form.category,
          question: form.question,
          answer: form.answer,
          keywords: form.keywords || null,
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      fetchEntries();
    } catch (err) {
      console.error("Failed to save:", err);
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setForm({
      service: entry.service,
      category: entry.category,
      question: entry.question,
      answer: entry.answer,
      keywords: entry.keywords || "",
      sortOrder: entry.sortOrder,
      isActive: entry.isActive,
    });
    setEditingId(entry.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบรายการนี้?")) return;
    setDeleting(id);
    try {
      await deleteKnowledgeEntry(id);
      fetchEntries();
    } catch (err) {
      console.error("Failed to delete:", err);
      alert("ลบไม่สำเร็จ");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (entry: KnowledgeEntry) => {
    setToggling(entry.id);
    try {
      await updateKnowledgeEntry(entry.id, { isActive: !entry.isActive });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, isActive: !e.isActive } : e
        )
      );
    } catch (err) {
      console.error("Failed to toggle:", err);
    } finally {
      setToggling(null);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    setImporting(true);
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        alert("JSON ต้องเป็น array");
        return;
      }
      const result = await bulkImportKnowledge(parsed);
      alert(`นำเข้าสำเร็จ ${result.count} รายการ`);
      setShowImport(false);
      setImportJson("");
      fetchEntries();
    } catch (err: any) {
      console.error("Import failed:", err);
      alert(`นำเข้าไม่สำเร็จ: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            ฐานความรู้ (Knowledge Base)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            จัดการข้อมูลสำหรับ AI แนะนำคำตอบ ({entries.length} รายการ)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            สถิติ
          </button>
          <button
            onClick={() => setShowImport(!showImport)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            นำเข้า
          </button>
          <button
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </button>
        </div>
      </div>

      {/* Stats */}
      {showStats && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            จำนวนรายการตามบริการ
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SERVICES.map((svc) => {
              const stat = serviceStats[svc] || { total: 0, active: 0 };
              return (
                <div
                  key={svc}
                  className={`rounded-lg border p-3 ${getServiceStyle(svc)}`}
                >
                  <p className="text-xs font-semibold truncate">
                    {SERVICE_SHORT[svc] || svc}
                  </p>
                  <p className="text-lg font-bold mt-1">{stat.total}</p>
                  <p className="text-[10px] opacity-70">
                    ใช้งาน {stat.active} / ทั้งหมด {stat.total}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bulk Import */}
      {showImport && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            นำเข้าข้อมูล (JSON Array)
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            วาง JSON array ที่มี: service, category, question, answer, keywords
            (optional), sortOrder (optional)
          </p>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            rows={6}
            placeholder={`[
  { "service": "งานบุญ/พิธีสงฆ์", "category": "ราคา", "question": "แพคเกจครบวงจร 20 ท่าน", "answer": "19,490 บาท" }
]`}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono resize-none"
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowImport(false);
                setImportJson("");
              }}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleImport}
              disabled={!importJson.trim() || importing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 text-sm font-medium"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              นำเข้า
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            {editingId ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  บริการ *
                </label>
                <div className="relative">
                  <select
                    value={form.service}
                    onChange={(e) =>
                      setForm({ ...form, service: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none bg-white"
                  >
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  หมวดหมู่ *
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="เช่น ราคา, FAQ, ข้อมูลทั่วไป"
                  list="kb-categories"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <datalist id="kb-categories">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Keywords (optional)
                </label>
                <input
                  type="text"
                  value={form.keywords}
                  onChange={(e) =>
                    setForm({ ...form, keywords: e.target.value })
                  }
                  placeholder="คำค้นหา, คั่นด้วยคอมม่า"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                คำถาม / หัวข้อ *
              </label>
              <input
                type="text"
                value={form.question}
                onChange={(e) =>
                  setForm({ ...form, question: e.target.value })
                }
                placeholder="เช่น แพคเกจครบวงจร 20 ท่าน ราคาเท่าไหร่"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                คำตอบ *
              </label>
              <textarea
                value={form.answer}
                onChange={(e) =>
                  setForm({ ...form, answer: e.target.value })
                }
                placeholder="ข้อมูลคำตอบสำหรับ AI..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-500">
                  ลำดับ:
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })
                  }
                  className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="rounded border-slate-300 text-indigo-500 focus:ring-indigo-500/20"
                />
                <span className="text-xs font-medium text-slate-500">
                  เปิดใช้งาน
                </span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  !form.question.trim() ||
                  !form.answer.trim() ||
                  !form.category.trim() ||
                  saving
                }
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Service tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setServiceFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              serviceFilter === "all"
                ? "bg-indigo-500 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ทั้งหมด ({entries.length})
          </button>
          {SERVICES.map((svc) => {
            const count = entries.filter((e) => e.service === svc).length;
            if (count === 0) return null;
            return (
              <button
                key={svc}
                onClick={() => setServiceFilter(svc)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  serviceFilter === svc
                    ? "bg-indigo-500 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {SERVICE_SHORT[svc] || svc} ({count})
              </button>
            );
          })}
        </div>

        {/* Category filter + Search */}
        <div className="flex gap-2 sm:ml-auto">
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {(serviceFilter !== "all" ||
        categoryFilter !== "all" ||
        searchQuery) && (
        <p className="text-xs text-slate-400 mb-3">
          แสดง {filteredEntries.length} จาก {entries.length} รายการ
        </p>
      )}

      {/* Entries list */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-600 mb-1">
            {entries.length === 0 ? "ยังไม่มีข้อมูล" : "ไม่พบรายการ"}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            {entries.length === 0
              ? "เพิ่มข้อมูลฐานความรู้เพื่อให้ AI แนะนำคำตอบได้แม่นยำ"
              : "ลองเปลี่ยนตัวกรองหรือคำค้นหา"}
          </p>
          {entries.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายการแรก
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow group ${
                entry.isActive
                  ? "border-slate-200"
                  : "border-slate-200 opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getServiceStyle(
                        entry.service
                      )}`}
                    >
                      {SERVICE_SHORT[entry.service] || entry.service}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                      {entry.category}
                    </span>
                    {!entry.isActive && (
                      <span className="text-[10px] font-medium text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                        ปิดใช้งาน
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-0.5">
                    {entry.question}
                  </h4>
                  <p className="text-[13px] text-slate-500 line-clamp-2 whitespace-pre-wrap">
                    {entry.answer}
                  </p>
                  {entry.keywords && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Keywords: {entry.keywords}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => handleToggleActive(entry)}
                    disabled={toggling === entry.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title={entry.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                  >
                    {toggling === entry.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : entry.isActive ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(entry)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                    title="แก้ไข"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    disabled={deleting === entry.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="ลบ"
                  >
                    {deleting === entry.id ? (
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
      )}
    </div>
  );
}

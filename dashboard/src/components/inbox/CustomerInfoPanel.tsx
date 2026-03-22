import { useState, useEffect, useRef } from "react";
import {
  getCustomerDetails,
  getCustomerNotes,
  addCustomerNote,
  deleteCustomerNote,
  addCustomerTag,
  removeCustomerTag,
  getAllTags,
  assignCustomer,
  unassignCustomer,
  setCustomerStatus,
  setCustomerNickname,
  getCustomerJobs,
} from "@/lib/api-service";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api-client";
import {
  Loader2,
  User,
  Phone,
  MessageCircle,
  Calendar,
  CreditCard,
  Copy,
  Check,
  Plus,
  X,
  Tag,
  StickyNote,
  Send,
  Trash2,
  UserCheck,
  UserX,
  Circle,
  Briefcase,
  ExternalLink,
  FileText,
} from "lucide-react";

interface CustomerInfoPanelProps {
  userId: string | null;
  onStatusChange?: () => void;
}

export function CustomerInfoPanel({
  userId,
  onStatusChange,
}: CustomerInfoPanelProps) {
  const { user: authUser } = useAuth();
  const [details, setDetails] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState<any[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  // Nickname
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameValue, setNicknameValue] = useState("");

  // Notes
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Jobs
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Quotations (FlowAccount)
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(false);

  // Cache tags across conversation switches
  const tagsCacheRef = useRef<any[] | null>(null);

  useEffect(() => {
    if (!userId) {
      setDetails(null);
      setNotes([]);
      setJobs([]);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setJobs([]);
    setQuotations([]);

    // Use cached tags if available, otherwise fetch
    const tagsPromise = tagsCacheRef.current
      ? Promise.resolve(tagsCacheRef.current)
      : getAllTags();

    Promise.all([
      getCustomerDetails(userId),
      getCustomerNotes(userId),
      tagsPromise,
    ])
      .then(([d, n, t]) => {
        if (cancelled) return;
        setDetails(d);
        tagsCacheRef.current = t;
        // Auto-fetch jobs if customer has phone
        if (d?.phoneNumber) {
          setJobsLoading(true);
          getCustomerJobs(userId)
            .then((res) => { if (!cancelled) setJobs(res.jobs || []); })
            .catch(() => { if (!cancelled) setJobs([]); })
            .finally(() => { if (!cancelled) setJobsLoading(false); });
        }
        // Auto-fetch quotations from FlowAccount
        setQuotationsLoading(true);
        api.get<{ data: any[]; total: number }>(`/users/${userId}/quotations`)
          .then((res) => { if (!cancelled) setQuotations(res.data || []); })
          .catch(() => { if (!cancelled) setQuotations([]); })
          .finally(() => { if (!cancelled) setQuotationsLoading(false); });
        setNotes(n);
        setAllTags(t);
        setNicknameValue(d?.nickname || "");
      })
      .catch(() => { if (!cancelled) setDetails(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId]);

  const refresh = async () => {
    if (!userId) return;
    const [d, n] = await Promise.all([
      getCustomerDetails(userId),
      getCustomerNotes(userId),
    ]);
    setDetails(d);
    setNotes(n);
  };

  const copyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const formatDate = (ts: number | string) => {
    if (!ts) return "\u2014";
    const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
    return d.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleAddTag = async () => {
    if (!userId || !newTagName.trim()) return;
    await addCustomerTag(userId, newTagName.trim());
    setNewTagName("");
    setShowTagInput(false);
    refresh();
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!userId) return;
    await removeCustomerTag(userId, tagId);
    refresh();
  };

  const handleAddNote = async () => {
    if (!userId || !newNote.trim()) return;
    setAddingNote(true);
    await addCustomerNote(userId, newNote.trim());
    setNewNote("");
    setAddingNote(false);
    refresh();
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteCustomerNote(noteId);
    refresh();
  };

  const handleAssign = async () => {
    if (!userId || !authUser) return;
    await assignCustomer(
      userId,
      authUser.uid,
      authUser.displayName || authUser.email || "Admin"
    );
    refresh();
    onStatusChange?.();
  };

  const handleUnassign = async () => {
    if (!userId) return;
    await unassignCustomer(userId);
    refresh();
    onStatusChange?.();
  };

  const handleSetStatus = async (
    status: "OPEN" | "FOLLOW_UP" | "RESOLVED"
  ) => {
    if (!userId) return;
    await setCustomerStatus(userId, status);
    refresh();
    onStatusChange?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-center px-6">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-2.5">
          <User className="w-5 h-5 text-slate-300" />
        </div>
        <p className="text-[12px] text-slate-400">
          Select a customer to view details
        </p>
      </div>
    );
  }

  const statusConfig: Record<string, { bg: string; text: string; activeBg: string; activeBorder: string }> = {
    OPEN: { bg: "bg-white", text: "text-blue-600", activeBg: "bg-blue-50", activeBorder: "border-blue-200" },
    FOLLOW_UP: { bg: "bg-white", text: "text-amber-600", activeBg: "bg-amber-50", activeBorder: "border-amber-200" },
    RESOLVED: { bg: "bg-white", text: "text-emerald-600", activeBg: "bg-emerald-50", activeBorder: "border-emerald-200" },
  };
  const statusLabels: Record<string, string> = {
    OPEN: "Open",
    FOLLOW_UP: "Follow up",
    RESOLVED: "Resolved",
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-y-auto">
      {/* Profile header */}
      <div className="px-5 py-5 text-center border-b border-slate-100">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 mx-auto ring-[3px] ring-white shadow-md">
          {details.pictureUrl ? (
            <img
              src={details.pictureUrl}
              alt={details.displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-6 h-6 text-slate-400" />
            </div>
          )}
        </div>
        <h3 className="text-[14px] font-semibold text-slate-800 mt-2.5 tracking-[-0.01em]">
          {details.nickname || details.displayName}
        </h3>
        {details.nickname && (
          <p className="text-[10px] text-slate-400 italic mt-0.5">({details.displayName})</p>
        )}
        {editingNickname ? (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              placeholder="ตั้งชื่อเรียก..."
              className="w-28 text-[11px] px-2.5 py-1 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/15 focus:border-brand-300 transition-all"
              autoFocus
            />
            <button
              onClick={async () => {
                await setCustomerNickname(userId!, nicknameValue.trim() || null);
                setDetails((prev: any) => ({ ...prev, nickname: nicknameValue.trim() || null }));
                setEditingNickname(false);
              }}
              className="text-[10px] px-2 py-1 bg-brand-500 text-white rounded-lg hover:bg-brand-600 font-medium transition-colors"
            >
              บันทึก
            </button>
            <button
              onClick={() => setEditingNickname(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNickname(true)}
            className="text-[10px] text-brand-500 hover:text-brand-600 font-medium mt-1 transition-colors"
          >
            {details.nickname ? "แก้ไขชื่อเรียก" : "ตั้งชื่อเรียก"}
          </button>
        )}
        <div className="mt-1.5">
          <span
            className={`inline-flex items-center text-[10px] font-semibold px-2 py-[3px] rounded-md ${
              details.channelType === "line" || details.channelType === "LINE"
                ? "bg-emerald-50 text-emerald-600"
                : "bg-blue-50 text-blue-600"
            }`}
          >
            {details.channelType === "line" || details.channelType === "LINE"
              ? "LINE"
              : "Facebook"}{" "}
            &middot;{" "}
            {(details.channel || "").replace("Line_", "").replace("FB_", "")}
          </span>
        </div>
      </div>

      {/* Status & Assignment */}
      <div className="px-4 py-3.5 border-b border-slate-100 space-y-3">
        {/* Status buttons */}
        <div className="flex gap-1.5">
          {(["OPEN", "FOLLOW_UP", "RESOLVED"] as const).map((s) => {
            const cfg = statusConfig[s];
            const isActive = details.status === s;
            return (
              <button
                key={s}
                onClick={() => handleSetStatus(s)}
                className={`flex-1 text-[10px] font-semibold py-[6px] rounded-lg border transition-all duration-150 ${
                  isActive
                    ? `${cfg.activeBg} ${cfg.text} ${cfg.activeBorder}`
                    : "bg-white text-slate-400 border-slate-200/80 hover:border-slate-300 hover:text-slate-500"
                }`}
              >
                {statusLabels[s]}
              </button>
            );
          })}
        </div>

        {/* Assignment */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.06em]">
            Assigned
          </span>
          {details.assignedToName ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-700">
                {details.assignedToName}
              </span>
              <button
                onClick={handleUnassign}
                className="p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors"
                title="Unassign"
              >
                <UserX className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAssign}
              className="flex items-center gap-1 text-[11px] font-medium text-brand-500 hover:text-brand-600 transition-colors"
            >
              <UserCheck className="w-3 h-3" />
              Assign to me
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3.5 border-b border-slate-100 space-y-3">
        {/* Phone */}
        {details.phoneNumber && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-slate-300" />
              <span className="text-[12px] text-slate-700 font-medium tabular-nums">
                {details.phoneNumber}
              </span>
            </div>
            <button
              onClick={() => copyPhone(details.phoneNumber)}
              className="p-1 rounded-md text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all duration-150"
            >
              {copiedPhone ? (
                <Check className="w-3 h-3 text-emerald-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50/80 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <MessageCircle className="w-3 h-3 text-slate-300" />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
                Messages
              </span>
            </div>
            <p className="text-[15px] font-bold text-slate-800 tabular-nums tracking-tight">
              {details.totalMessages?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-slate-50/80 rounded-lg px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="w-3 h-3 text-slate-300" />
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
                First msg
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-800">
              {formatDate(details.firstContactAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-slate-300" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
              Tags
            </span>
          </div>
          <button
            onClick={() => setShowTagInput(!showTagInput)}
            className="p-0.5 rounded-md text-slate-300 hover:text-brand-500 hover:bg-brand-50 transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Existing tags */}
        <div className="flex flex-wrap gap-1.5">
          {details.tags?.map((ct: any) => (
            <span
              key={ct.tag?.id || ct.id}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-[3px] rounded-full border"
              style={{
                borderColor: `${ct.tag?.color || ct.color || "#6366f1"}30`,
                color: ct.tag?.color || ct.color || "#6366f1",
                backgroundColor: `${ct.tag?.color || ct.color || "#6366f1"}08`,
              }}
            >
              {ct.tag?.name || ct.name}
              <button
                onClick={() => handleRemoveTag(ct.tag?.id || ct.id)}
                className="hover:opacity-60 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {(!details.tags || details.tags.length === 0) && !showTagInput && (
            <span className="text-[11px] text-slate-300 italic">No tags</span>
          )}
        </div>

        {/* Add tag input */}
        {showTagInput && (
          <div className="flex gap-1.5 mt-2.5">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Tag name..."
              className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 border-0 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-brand-500 text-white text-[10px] font-medium disabled:opacity-40 hover:bg-brand-600 transition-colors"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <StickyNote className="w-3 h-3 text-slate-300" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
            Notes
          </span>
          <span className="text-[9px] text-slate-300 ml-0.5 tabular-nums">
            ({notes.length})
          </span>
        </div>

        {/* Add note */}
        <div className="flex gap-1.5 mb-2.5">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            placeholder="Add a note..."
            className="flex-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-50 border-0 focus:outline-none focus:ring-2 focus:ring-brand-500/15 transition-all placeholder:text-slate-300"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="p-1.5 rounded-lg bg-brand-500 text-white disabled:opacity-40 hover:bg-brand-600 transition-colors"
          >
            {addingNote ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Notes list */}
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {notes.map((note: any) => (
            <div
              key={note.id}
              className="group bg-amber-50/40 rounded-lg px-2.5 py-2 relative border border-amber-100/40"
            >
              <p className="text-[11px] text-slate-700 leading-relaxed pr-5">
                {note.text}
              </p>
              <p className="text-[9px] text-slate-400 mt-1">
                {note.authorName} &middot; {formatDate(note.createdAt)}
              </p>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="absolute top-2 right-2 p-0.5 rounded text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-[11px] text-slate-300 text-center py-3 italic">
              No notes yet
            </p>
          )}
        </div>
      </div>

      {/* IRIS Jobs */}
      {(jobs.length > 0 || jobsLoading) && (
        <div className="px-4 py-3.5 border-b border-slate-100/80">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Briefcase className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.06em]">
              งานที่จอง
            </span>
            <span className="text-[9px] text-brand-500 font-semibold ml-1">
              {jobs.length}
            </span>
          </div>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any, i: number) => (
                <div
                  key={job.id || i}
                  className="bg-brand-50/50 rounded-lg px-3 py-2.5 border border-brand-100/50"
                >
                  <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                    {job.job || job.detail || 'งานจัดเลี้ยง'}
                  </p>
                  {job.due && (
                    <p className="text-[10px] text-brand-500 font-semibold mt-1">
                      📅 {job.due}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {job.revenue && (
                      <span className="text-[10px] text-slate-500">
                        ฿{Number(job.revenue).toLocaleString()}
                      </span>
                    )}
                    {job.guest && (
                      <span className="text-[10px] text-slate-500">
                        👥 {job.guest} ท่าน
                      </span>
                    )}
                    {job.city && (
                      <span className="text-[10px] text-slate-400">
                        📍 {job.city}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quotations (FlowAccount) */}
      {(quotations.length > 0 || quotationsLoading) && (
        <div className="px-4 py-3.5 border-b border-slate-100/80">
          <div className="flex items-center gap-1.5 mb-2.5">
            <FileText className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.06em]">
              ใบเสนอราคา
            </span>
            <span className="text-[9px] text-amber-500 font-semibold ml-1">
              {quotations.length}
            </span>
          </div>
          {quotationsLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {quotations.map((q: any) => (
                <a
                  key={q.docNo}
                  href={q.editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-amber-50/50 rounded-lg px-3 py-2.5 border border-amber-100/50 hover:bg-amber-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-600">{q.docNo}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      q.status === 'อนุมัติ' || q.status === 'ดำเนินการแล้ว'
                        ? 'bg-emerald-50 text-emerald-600'
                        : q.status === 'ไม่อนุมัติ'
                        ? 'bg-red-50 text-red-500'
                        : q.status === 'มัดจำแล้ว'
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {q.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{q.project || q.customer}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">{q.date}</span>
                    <span className="text-[11px] font-semibold text-slate-700">
                      ฿{Number(q.grandTotal || 0).toLocaleString()}
                    </span>
                  </div>
                  {q.salesName && (
                    <span className="text-[9px] text-slate-400 mt-0.5 block">👤 {q.salesName}</span>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent slips */}
      {details.recentSlips?.length > 0 && (
        <div className="px-4 py-3.5">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CreditCard className="w-3 h-3 text-slate-300" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.06em]">
              Recent Slips
            </span>
          </div>
          <div className="space-y-1">
            {details.recentSlips.map((slip: any) => (
              <a
                key={slip.id}
                href={slip.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-all duration-150 group"
              >
                <img
                  src={slip.imageUrl}
                  alt="Slip"
                  className="w-10 h-10 rounded-lg object-cover bg-slate-100 ring-1 ring-slate-100"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  {slip.amount && (
                    <p className="text-[12px] font-semibold text-slate-800 tabular-nums">
                      ฿
                      {Number(slip.amount).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 truncate">
                    {slip.bankName || ""}
                    {slip.dateTime ? ` \u00b7 ${slip.dateTime}` : ""}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

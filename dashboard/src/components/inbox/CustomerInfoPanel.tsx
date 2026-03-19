import { useState, useEffect } from "react";
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
} from "@/lib/api-service";
import { useAuth } from "@/context/AuthContext";
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

  useEffect(() => {
    if (!userId) {
      setDetails(null);
      setNotes([]);
      return;
    }
    setLoading(true);
    Promise.all([
      getCustomerDetails(userId),
      getCustomerNotes(userId),
      getAllTags(),
    ])
      .then(([d, n, t]) => {
        setDetails(d);
        setNotes(n);
        setAllTags(t);
        setNicknameValue(d?.nickname || "");
      })
      .catch(() => setDetails(null))
      .finally(() => setLoading(false));
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
    if (!ts) return "—";
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
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white text-center px-6">
        <User className="w-8 h-8 text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">
          Select a customer to view details
        </p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    OPEN: "bg-blue-50 text-blue-600 border-blue-200",
    FOLLOW_UP: "bg-amber-50 text-amber-600 border-amber-200",
    RESOLVED: "bg-emerald-50 text-emerald-600 border-emerald-200",
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
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 mx-auto ring-4 ring-white shadow-md">
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
        <h3 className="text-sm font-semibold text-slate-800 mt-2.5">
          {details.nickname || details.displayName}
        </h3>
        {details.nickname && (
          <p className="text-[10px] text-slate-400 italic">({details.displayName})</p>
        )}
        {editingNickname ? (
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              type="text"
              value={nicknameValue}
              onChange={(e) => setNicknameValue(e.target.value)}
              placeholder="ตั้งชื่อเรียก..."
              className="w-28 text-[11px] px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              autoFocus
            />
            <button
              onClick={async () => {
                await setCustomerNickname(userId!, nicknameValue.trim() || null);
                setDetails((prev: any) => ({ ...prev, nickname: nicknameValue.trim() || null }));
                setEditingNickname(false);
              }}
              className="text-[10px] px-2 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
            >
              บันทึก
            </button>
            <button
              onClick={() => setEditingNickname(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600"
            >
              ยกเลิก
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingNickname(true)}
            className="text-[10px] text-indigo-500 hover:text-indigo-600 font-medium mt-0.5"
          >
            {details.nickname ? "แก้ไขชื่อเรียก" : "ตั้งชื่อเรียก"}
          </button>
        )}
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded mt-1 ${
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

      {/* Status & Assignment */}
      <div className="px-4 py-3 border-b border-slate-100 space-y-2.5">
        {/* Status buttons */}
        <div className="flex gap-1.5">
          {(["OPEN", "FOLLOW_UP", "RESOLVED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleSetStatus(s)}
              className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md border transition-all ${
                details.status === s
                  ? statusColors[s]
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
              }`}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>

        {/* Assignment */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Assign
          </span>
          {details.assignedToName ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-700">
                {details.assignedToName}
              </span>
              <button
                onClick={handleUnassign}
                className="p-0.5 rounded text-slate-400 hover:text-red-500"
                title="Unassign"
              >
                <UserX className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAssign}
              className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-600"
            >
              <UserCheck className="w-3 h-3" />
              Assign to me
            </button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-b border-slate-100 space-y-2.5">
        {/* Phone */}
        {details.phoneNumber && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-slate-400" />
              <span className="text-[12px] text-slate-700">
                {details.phoneNumber}
              </span>
            </div>
            <button
              onClick={() => copyPhone(details.phoneNumber)}
              className="p-1 rounded text-slate-400 hover:text-slate-600"
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
          <div className="bg-slate-50 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <MessageCircle className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-medium text-slate-400 uppercase">
                Messages
              </span>
            </div>
            <p className="text-base font-bold text-slate-800 tabular-nums">
              {details.totalMessages?.toLocaleString() || 0}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg px-2.5 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="text-[9px] font-medium text-slate-400 uppercase">
                First msg
              </span>
            </div>
            <p className="text-[12px] font-semibold text-slate-800">
              {formatDate(details.firstContactAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Tags
            </span>
          </div>
          <button
            onClick={() => setShowTagInput(!showTagInput)}
            className="p-0.5 rounded text-slate-400 hover:text-indigo-500"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Existing tags */}
        <div className="flex flex-wrap gap-1.5">
          {details.tags?.map((ct: any) => (
            <span
              key={ct.tag?.id || ct.id}
              className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border"
              style={{
                borderColor: ct.tag?.color || ct.color || "#6366f1",
                color: ct.tag?.color || ct.color || "#6366f1",
                backgroundColor: `${ct.tag?.color || ct.color || "#6366f1"}10`,
              }}
            >
              {ct.tag?.name || ct.name}
              <button
                onClick={() => handleRemoveTag(ct.tag?.id || ct.id)}
                className="hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {(!details.tags || details.tags.length === 0) && !showTagInput && (
            <span className="text-[11px] text-slate-400">No tags</span>
          )}
        </div>

        {/* Add tag input */}
        {showTagInput && (
          <div className="flex gap-1.5 mt-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              placeholder="Tag name..."
              className="flex-1 text-[11px] px-2 py-1 rounded-md bg-slate-50 border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              autoFocus
            />
            <button
              onClick={handleAddTag}
              disabled={!newTagName.trim()}
              className="px-2 py-1 rounded-md bg-indigo-500 text-white text-[10px] font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1 mb-2">
          <StickyNote className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Notes
          </span>
          <span className="text-[9px] text-slate-400 ml-1">
            {notes.length}/1000
          </span>
        </div>

        {/* Add note */}
        <div className="flex gap-1.5 mb-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
            placeholder="Add a note..."
            className="flex-1 text-[11px] px-2.5 py-1.5 rounded-md bg-slate-50 border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
          <button
            onClick={handleAddNote}
            disabled={!newNote.trim() || addingNote}
            className="p-1.5 rounded-md bg-indigo-500 text-white disabled:opacity-50"
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
              className="group bg-amber-50/50 rounded-md px-2.5 py-2 relative"
            >
              <p className="text-[11px] text-slate-700 leading-relaxed pr-5">
                {note.text}
              </p>
              <p className="text-[9px] text-slate-400 mt-1">
                {note.authorName} &middot; {formatDate(note.createdAt)}
              </p>
              <button
                onClick={() => handleDeleteNote(note.id)}
                className="absolute top-1.5 right-1.5 p-0.5 rounded text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {notes.length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-2">
              No notes yet
            </p>
          )}
        </div>
      </div>

      {/* Recent slips */}
      {details.recentSlips?.length > 0 && (
        <div className="px-4 py-3">
          <div className="flex items-center gap-1 mb-2">
            <CreditCard className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              Recent Slips
            </span>
          </div>
          <div className="space-y-1.5">
            {details.recentSlips.map((slip: any) => (
              <a
                key={slip.id}
                href={slip.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <img
                  src={slip.imageUrl}
                  alt="Slip"
                  className="w-9 h-9 rounded object-cover bg-slate-100"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  {slip.amount && (
                    <p className="text-[12px] font-semibold text-slate-800">
                      ฿
                      {Number(slip.amount).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400 truncate">
                    {slip.bankName || ""}
                    {slip.dateTime ? ` · ${slip.dateTime}` : ""}
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

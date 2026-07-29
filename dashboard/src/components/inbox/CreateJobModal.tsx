import { useEffect, useState } from "react";
import { X, Briefcase, ExternalLink, Loader2 } from "lucide-react";
import { createJobCard, getCustomerDetails } from "@/lib/api-service";
import type { ChatUser } from "@/types/inbox";

/**
 * Create an IRIS Jobs card from the current chat customer.
 * The customer's chat profile (name / picture / channel / id) is linked
 * onto the job automatically by the backend.
 */
export default function CreateJobModal({
  user,
  onClose,
}: {
  user: ChatUser;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [due, setDue] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [deposit, setDeposit] = useState("");
  const [balance, setBalance] = useState("");
  const [telno, setTelno] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  // Prefill the phone number from the full customer record
  useEffect(() => {
    getCustomerDetails(user.id)
      .then((d) => {
        if (d?.phoneNumber) setTelno(d.phoneNumber);
      })
      .catch(() => {});
  }, [user.id]);

  const handleSubmit = async () => {
    if (!name.trim() || !due) {
      setError("ต้องระบุชื่องานและวันที่จัดงาน");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await createJobCard(user.id, {
        name: name.trim(),
        due,
        eventTime: eventTime || undefined,
        deposit: parseFloat(deposit) || 0,
        balance: parseFloat(balance) || 0,
        telno: telno.trim() || undefined,
        desc: desc.trim() || undefined,
      });
      if (!res.success) throw new Error(res.error || "สร้างงานไม่สำเร็จ");
      setCreatedId(res.cardId ?? null);
    } catch (err: any) {
      setError(err?.message || "สร้างงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30";
  const labelCls = "text-xs font-medium text-slate-500 mb-1 block";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Briefcase className="h-4 w-4 text-brand-500" />
            สร้างการ์ดงาน (IRIS Jobs)
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {createdId ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-700">
              ✅ สร้างการ์ดงานเรียบร้อยแล้ว — ขึ้นบอร์ด IRIS Jobs (ลิสต์ งานมัดจำใหม่) และการ์ด Trello ถูกสร้างให้ด้วย
            </p>
            <div className="flex items-center justify-center gap-2">
              <a
                href={`https://iris-job.vercel.app/jobs/${createdId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                เปิดงานใน IRIS Jobs
              </a>
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ปิด
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
              {user.pictureUrl && (
                <img src={user.pictureUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              )}
              <div className="min-w-0 text-xs">
                <p className="truncate font-medium text-slate-700">{user.displayName}</p>
                <p className="text-slate-400">{user.channel} · ผูกลูกค้าเข้ากับงานอัตโนมัติ</p>
              </div>
            </div>

            <div>
              <label className={labelCls}>ชื่องาน *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น พิธีสงฆ์พรีเมี่ยม เลี้ยงพระเพล 9 รูป ..."
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>วันที่จัดงาน *</label>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>เวลางาน</label>
                <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>มัดจำ (฿)</label>
                <input type="number" min="0" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>ยอดคงเหลือ (฿)</label>
                <input type="number" min="0" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>เบอร์โทรลูกค้า</label>
              <input value={telno} onChange={(e) => setTelno(e.target.value)} placeholder="08xxxxxxxx" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>รายละเอียดเพิ่มเติม</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={inputCls} />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim() || !due}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Briefcase className="h-3.5 w-3.5" />}
                สร้างการ์ดงาน
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

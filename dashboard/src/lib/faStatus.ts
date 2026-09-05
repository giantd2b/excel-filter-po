/** flowaccount-app quotation statuses (single English set) → Thai labels + badge styles. */
export const FA_STATUS_LABEL: Record<string, string> = {
  DRAFT: "ร่าง", PENDING: "รออนุมัติ", APPROVED: "อนุมัติ", DEPOSITED: "มัดจำแล้ว", REJECTED: "ไม่อนุมัติ",
  ISSUED: "วางบิลแล้ว", PAID: "ชำระแล้ว", VOID: "ยกเลิก",
};
export const faStatusLabel = (s?: string | null) => (s ? FA_STATUS_LABEL[s] || s : "");

const STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING: "bg-amber-50 text-amber-600",
  APPROVED: "bg-emerald-50 text-emerald-600",
  DEPOSITED: "bg-blue-50 text-blue-600",
  REJECTED: "bg-red-50 text-red-500",
  // legacy Thai values still cached from older syncs
  "รออนุมัติ": "bg-amber-50 text-amber-600", "อนุมัติ": "bg-emerald-50 text-emerald-600", "ดำเนินการแล้ว": "bg-emerald-50 text-emerald-600",
  "มัดจำแล้ว": "bg-blue-50 text-blue-600", "ไม่อนุมัติ": "bg-red-50 text-red-500",
};
export const faStatusStyle = (s?: string | null) => (s && STYLE[s]) || "bg-amber-50 text-amber-600";

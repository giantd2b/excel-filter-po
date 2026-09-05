/**
 * Day / month / year selects that produce a plain "YYYY-MM-DD" string.
 * Used instead of <input type="date"> because a mobile picker once produced a value one day
 * off from what sales tapped; three selects leave no room for locale or timezone surprises.
 */
const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

export function fmtThaiDate(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return `${DAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${MONTHS[mo - 1]} ${y + 543}`;
}

interface Props {
  value: string; // "" or YYYY-MM-DD
  onChange: (iso: string) => void;
  className?: string;
}

export default function ThaiDateSelect({ value, onChange, className = "" }: Props) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  const y = m ? Number(m[1]) : 0;
  const mo = m ? Number(m[2]) : 0;
  const d = m ? Number(m[3]) : 0;
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  const daysInMonth = y && mo ? new Date(Date.UTC(y, mo, 0)).getUTCDate() : 31;

  const emit = (ny: number, nmo: number, nd: number) => {
    if (!ny || !nmo || !nd) {
      // keep partial picks in the string only when all three are known
      onChange(ny && nmo && nd ? `${ny}-${String(nmo).padStart(2, "0")}-${String(nd).padStart(2, "0")}` : "");
      return;
    }
    const max = new Date(Date.UTC(ny, nmo, 0)).getUTCDate();
    const dd = Math.min(nd, max);
    onChange(`${ny}-${String(nmo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`);
  };

  const sel = "rounded-lg border border-slate-200 px-2 py-2 text-sm bg-white";
  return (
    <div className={`flex gap-1.5 ${className}`}>
      <select value={d || ""} onChange={(e) => emit(y || thisYear, mo || new Date().getMonth() + 1, Number(e.target.value))} className={`${sel} w-[4.5rem]`}>
        <option value="">วัน</option>
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <select value={mo || ""} onChange={(e) => emit(y || thisYear, Number(e.target.value), d || 1)} className={`${sel} flex-1`}>
        <option value="">เดือน</option>
        {MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>{name}</option>
        ))}
      </select>
      <select value={y || ""} onChange={(e) => emit(Number(e.target.value), mo || new Date().getMonth() + 1, d || 1)} className={`${sel} w-[5.5rem]`}>
        <option value="">ปี</option>
        {years.map((yy) => (
          <option key={yy} value={yy}>{yy + 543}</option>
        ))}
      </select>
    </div>
  );
}

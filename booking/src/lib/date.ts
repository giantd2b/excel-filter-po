/** "2026-09-30" → "พ. 30 ก.ย. 2569" — parsed as plain y-m-d, never through Date timezone maths. */
export function fmtThaiDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${months[mo - 1]} ${y + 543}`;
}

/** today in the visitor's local time as YYYY-MM-DD (the date input's own format) */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** whole days from today to a YYYY-MM-DD date (negative = past) */
export function daysUntil(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const t = todayIso().split('-').map(Number);
  return Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(t[0], t[1] - 1, t[2])) / 86400000);
}

/** "2026-09-30" → "พ. 30 ก.ย. 2569" — parsed as plain y-m-d, never through Date timezone maths. */
export function fmtThaiDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${months[mo - 1]} ${y + 543}`;
}

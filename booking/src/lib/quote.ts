import { PHONE_LABEL, baht } from '../data/packages';
import { addressLine, calc, summary, type BookingForm } from './calc';

// Opens a printable quotation in a new window (matches the design prototype)
export function downloadQuote(f: BookingForm) {
  const c = calc(f);
  const d = new Date();
  const today = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
  const row = (k: string, v: string, b?: boolean) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #e0d3ba;${b ? 'font-weight:700' : ''}">${k}</td><td style="padding:7px 0;border-bottom:1px solid #e0d3ba;text-align:right;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
  const html =
    '<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>ใบเสนอราคา IRIS เติมบุญ</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Charm:wght@700&family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">' +
    '<style>body{font-family:"Noto Sans Thai",sans-serif;color:#201e1d;background:#fff;margin:0;padding:40px;font-size:14px}h1{font-family:Charm,serif;color:#8c491a;font-size:30px;margin:0}table{width:100%;border-collapse:collapse}@media print{body{padding:24px}}</style></head><body>' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #c67139;padding-bottom:14px;margin-bottom:18px">' +
    `<div><h1>IRIS เติมบุญ</h1><div style="color:#6b6459">รับจัดงานบุญ พิธีสงฆ์ครบวงจร<br>โทร ${PHONE_LABEL} · LINE @temboon</div></div>` +
    `<div style="text-align:right"><div style="font-size:20px;font-weight:700;color:#8c491a">ใบเสนอราคา</div><div style="color:#6b6459">วันที่ ${today}</div></div></div>` +
    `<div style="margin-bottom:14px"><b>ลูกค้า:</b> ${f.name || '-'}${f.phone ? ' · ' + f.phone : ''}<br><b>สถานที่จัดงาน:</b> ${addressLine(f)}<br><b>วันเวลา:</b> ${f.date || '-'} · ${f.time} · ${f.occasion}</div>` +
    '<div style="font-weight:700;font-size:16px;margin:14px 0 6px;color:#8c491a">รายการ</div><table>' +
    summary(f).map((s) => row(s.k, s.v)).join('') +
    c.rows.map((r) => row(r.k, r.v + ' บาท')).join('') +
    row('ราคาประเมินรวม', baht(c.total) + ' บาท', true) +
    '</table>' +
    `<div style="font-weight:700;font-size:16px;margin:18px 0 6px;color:#8c491a">สิ่งที่จะได้รับ — ${c.pkg.name}</div><table>` +
    c.pkg.features.map((x) => row(x[0], x[1])).join('') +
    '</table>' +
    `<div style="margin-top:18px;color:#6b6459;font-size:12.5px;line-height:1.7">${c.pkg.kind === 'full' ? 'ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7% · ' : ''}ใบเสนอราคานี้เป็นราคาประเมินเบื้องต้น ทีมงานจะยืนยันราคาสุทธิหลังตรวจสอบรายละเอียดงาน · ใช้ได้ 30 วันนับจากวันที่ออก</div>` +
    '</body></html>';
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.print();
      } catch {
        /* user can print manually */
      }
    }, 600);
  }
}

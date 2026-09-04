import { useState } from 'react';
import { ADDONS, OCCASIONS, TIME_OPTS, baht, pkgById } from '../data/packages';
import { calc, summary, type BookingForm } from '../lib/calc';
import { submitBooking, type BookingLinkInfo } from '../lib/api';
import { FieldLabel, cardStyle, charm, chipStyle, inputStyle } from '../ui';
import AreaSearch from '../components/AreaSearch';
import type { SavedBooking } from '../App';

function fmtThaiDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${days[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()]} ${d} ${months[mo - 1]} ${y + 543}`;
}

interface Props {
  form: BookingForm;
  setForm: (f: BookingForm) => void;
  linkInfo: BookingLinkInfo;
  linkRef: string | null;
  onEditPackage: () => void;
  onDone: (saved: SavedBooking) => void;
}

/**
 * Quick booking: sales already fixed the package in the CRM link. The customer sees the
 * summary + price and only fills in personal details and the event location.
 */
export default function QuickBooking({ form: f, setForm, linkInfo, linkRef, onEditPackage, onDone }: Props) {
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const preset = linkInfo.preset;
  const pkg = pkgById(f.pkg);
  const c = calc(f);
  const hasFood = pkg.kind === 'full';

  const setF = <K extends keyof BookingForm>(k: K, v: BookingForm[K]) => {
    setForm({ ...f, [k]: v });
    setErr('');
  };

  const needDate = !preset?.eventDate;
  const needTime = !preset?.timeSlot;
  const needOccasion = !preset?.occasion;

  const submit = async () => {
    if (!f.name.trim()) return setErr('กรุณากรอกชื่อผู้จอง');
    if (!/[0-9]{9,}/.test(f.phone.replace(/[^0-9]/g, ''))) return setErr('กรุณากรอกเบอร์โทรให้ถูกต้อง');
    if (!f.date) return setErr('กรุณาเลือกวันที่จัดงาน');
    if (!f.tambon && !f.venue.trim()) return setErr('กรุณาระบุสถานที่จัดงาน');
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await submitBooking(f, linkRef);
      onDone({
        code: result.code,
        total: result.estimatedTotal,
        quotationUrl: result.quotationUrl || null,
        quotationDocNo: result.quotationDocNo || null,
        rows: summary(f),
        f: { ...f },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSubmitting(false);
    }
  };

  const chosenAddons = ADDONS.filter((a) => f.addons.includes(a.id));

  return (
    <div>
      <div style={{ padding: '22px 20px 8px' }}>
        <div style={{ ...charm, fontSize: 30, lineHeight: 1.2, color: 'var(--color-accent-900)' }}>ยืนยันการจองงานบุญ</div>
        <div style={{ fontSize: 14, color: 'var(--color-neutral-600)', marginTop: 6, lineHeight: 1.6 }}>
          ทีมงานจัดแพ็กเกจให้คุณ{linkInfo.customerName}แล้ว กรอกข้อมูลติดต่อและสถานที่จัดงาน ระบบจะออกใบเสนอราคาให้ทันที
        </div>
      </div>

      {/* package summary fixed by sales */}
      <div style={{ padding: '10px 20px 0' }}>
        <div
          style={{
            background: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-lg)',
            padding: '18px 20px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ ...charm, fontSize: 23, color: 'var(--color-accent-900)' }}>แพ็กเกจที่จัดให้</div>
            <div onClick={onEditPackage} style={{ fontSize: 12.5, color: 'var(--color-accent-700)', cursor: 'pointer', textDecoration: 'underline' }}>
              ปรับแพ็กเกจเอง
            </div>
          </div>
          {preset?.note && (
            <div
              style={{
                margin: '10px 0 4px',
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--color-accent-2-200)',
                fontSize: 13.5,
                color: 'var(--color-accent-2-800)',
                lineHeight: 1.6,
              }}
            >
              {preset.note}
            </div>
          )}
          {[
            ['แพ็กเกจ', pkg.name],
            ['พระสงฆ์', `${f.monks} รูป`],
            ['อาหาร', hasFood ? (f.foodMode === 'table' ? `โต๊ะจีน ${f.tables} โต๊ะ` : `บุฟเฟต์ ${f.guests} ท่าน`) : 'อาหารถวายพระ (ไม่รวมเลี้ยงแขก)'],
            ['ออปชั่นเสริม', chosenAddons.length ? chosenAddons.map((a) => a.label).join(', ') : '-'],
            ['นิมนต์รับ-ส่งพระ', f.selfTransport ? 'ดำเนินการเอง' : 'ทีมงานดำเนินการ'],
            ...(preset?.occasion ? [['ประเภทงาน', f.occasion]] : []),
            ...(preset?.eventDate ? [['วันเวลา', `${fmtThaiDate(f.date)} · ${f.time}`]] : []),
          ].map(([k, v]) => (
            <div
              key={k}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--color-divider)', fontSize: 14 }}
            >
              <span style={{ color: 'var(--color-neutral-600)', flex: 'none' }}>{k}</span>
              <span style={{ color: 'var(--color-neutral-800)', fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          {c.rows.map((r) => (
            <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13.5, color: 'var(--color-neutral-700)' }}>
              <span>{r.k}</span>
              <span>{r.v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8, paddingTop: 10, borderTop: '1.5px solid var(--color-neutral-300)' }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>ราคาประเมิน</span>
            <span style={{ ...charm, fontSize: 26, color: 'var(--color-accent-700)' }}>{baht(c.total)}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-neutral-600)', marginTop: 4 }}>ราคาก่อนภาษีมูลค่าเพิ่ม ใบเสนอราคาจริงจะแสดงรายละเอียดทุกบรรทัด</div>
        </div>
      </div>

      {/* what the customer fills in */}
      <div style={{ padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <FieldLabel>ชื่อผู้จอง</FieldLabel>
          <input type="text" placeholder="ชื่อ - นามสกุล" value={f.name} onChange={(e) => setF('name', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>เบอร์โทรติดต่อ</FieldLabel>
          <input type="tel" placeholder="08X-XXX-XXXX" value={f.phone} onChange={(e) => setF('phone', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <FieldLabel>ที่อยู่สำหรับออกใบเสนอราคา (ไม่บังคับ)</FieldLabel>
          <textarea
            placeholder="ชื่อบริษัท/บุคคล และที่อยู่ที่ต้องการให้ระบุในใบเสนอราคา หากเว้นว่างจะใช้ที่อยู่สถานที่จัดงาน"
            value={f.customerAddress}
            onChange={(e) => setF('customerAddress', e.target.value)}
            rows={3}
            style={{ ...inputStyle, borderRadius: 22, padding: '14px 18px', resize: 'vertical' }}
          ></textarea>
        </div>

        {needOccasion && (
          <div>
            <FieldLabel>ประเภทงานบุญ</FieldLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {OCCASIONS.map((o) => (
                <div key={o} onClick={() => setF('occasion', o)} style={chipStyle(f.occasion === o)}>
                  {o}
                </div>
              ))}
            </div>
          </div>
        )}
        {needDate && (
          <div>
            <FieldLabel>วันที่จัดงาน</FieldLabel>
            <input type="date" value={f.date} onChange={(e) => setF('date', e.target.value)} style={inputStyle} />
          </div>
        )}
        {needTime && (
          <div>
            <FieldLabel>ช่วงเวลาพิธี</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              {TIME_OPTS.map((tm) => (
                <div key={tm.v} onClick={() => setF('time', tm.v)} style={cardStyle(f.time === tm.v, { flex: 1, padding: 13, textAlign: 'center' })}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-neutral-800)' }}>{tm.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 2 }}>{tm.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AreaSearch
          form={f}
          setForm={(nf) => {
            setForm(nf);
            setErr('');
          }}
        />
        <div>
          <FieldLabel>บ้านเลขที่ / หมู่ / ถนน หรือชื่อสถานที่จัดงาน</FieldLabel>
          <input
            type="text"
            placeholder="เช่น 99/1 ม.5 ถ.สุขุมวิท หรือ ศาลาวัดใหญ่อินทาราม"
            value={f.venue}
            onChange={(e) => setF('venue', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel>รายละเอียดเพิ่มเติม (ไม่บังคับ)</FieldLabel>
          <textarea
            placeholder="เช่น มีผู้สูงอายุต้องการเก้าอี้เพิ่ม"
            value={f.note}
            onChange={(e) => setF('note', e.target.value)}
            rows={2}
            style={{ ...inputStyle, borderRadius: 22, padding: '14px 18px', resize: 'vertical' }}
          ></textarea>
        </div>
      </div>

      <div style={{ padding: '12px 20px 40px' }}>
        <div
          onClick={submit}
          className="hoverable"
          style={{
            padding: 16,
            borderRadius: 999,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            background: 'var(--color-accent)',
            color: '#fff',
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? 'กำลังส่งข้อมูล…' : 'ยืนยันการจองและรับใบเสนอราคา'}
        </div>
        {err && <div style={{ marginTop: 12, fontSize: 13.5, color: '#a3341f', textAlign: 'center' }}>{err}</div>}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { TH_AREAS } from '../data/th-areas';
import type { BookingForm } from '../lib/calc';
import { FieldLabel, inputStyle } from '../ui';

interface Props {
  form: BookingForm;
  setForm: (f: BookingForm) => void;
  label?: string;
}

/** ตำบล/แขวง search over the service-area dataset + read-only อำเภอ/จังหวัด/รหัส chips. */
export default function AreaSearch({ form: f, setForm, label = 'ตำบล / แขวง ที่จัดงาน' }: Props) {
  const [open, setOpen] = useState(false);
  const q = (f.areaQuery || '').trim();

  const suggestions = useMemo(() => {
    if (q.length < 1) return [];
    const starts = TH_AREAS.filter((x) => x.split('|')[0].indexOf(q) === 0);
    const rest = TH_AREAS.filter((x) => !starts.includes(x) && x.includes(q));
    return starts.concat(rest).slice(0, 8).map((x) => {
      const t = x.split('|');
      const bkk = t[2] === 'กรุงเทพฯ';
      return {
        key: x,
        main: (bkk ? 'แขวง' : 'ต.') + t[0],
        sub: (bkk ? t[1] : 'อ.' + t[1]) + ' · จ.' + t[2] + ' · ' + t[3],
        pick: () => {
          setForm({ ...f, areaQuery: t[0], tambon: t[0], amphoe: t[1], province: t[2], zip: t[3] });
          setOpen(false);
        },
      };
    });
  }, [q, f]);

  return (
    <>
      <div style={{ position: 'relative' }}>
        <FieldLabel>{label}</FieldLabel>
        <input
          type="text"
          placeholder="พิมพ์ชื่อตำบล เช่น บ้านสวน"
          value={f.areaQuery}
          onChange={(e) => {
            setForm({ ...f, areaQuery: e.target.value, tambon: '', amphoe: '', province: '', zip: '' });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          style={inputStyle}
        />
        {open && suggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              marginTop: 6,
              zIndex: 20,
              background: 'var(--color-neutral-100)',
              border: '1.5px solid var(--color-neutral-300)',
              borderRadius: 20,
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              maxHeight: 264,
              overflowY: 'auto',
            }}
          >
            {suggestions.map((sg) => (
              <div
                key={sg.key}
                onClick={sg.pick}
                style={{ padding: '12px 18px', cursor: 'pointer', borderBottom: '1px solid var(--color-divider)' }}
              >
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>{sg.main}</div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{sg.sub}</div>
              </div>
            ))}
          </div>
        )}
        {open && q.length >= 2 && suggestions.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 8, lineHeight: 1.6 }}>
            ไม่พบตำบลนี้ในพื้นที่บริการ กรุณาพิมพ์ที่อยู่ในช่องด้านล่าง แล้วทีมงานจะตรวจสอบให้
          </div>
        )}
      </div>
      {!!f.tambon && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 8 }}>
          {[
            ['อำเภอ / เขต', f.amphoe],
            ['จังหวัด', f.province],
            ['รหัสไปรษณีย์', f.zip],
          ].map(([label, val]) => (
            <div
              key={label}
              style={{ background: 'var(--color-accent-2-200)', borderRadius: 'var(--radius-md)', padding: '11px 13px' }}
            >
              <div style={{ fontSize: 11.5, color: 'var(--color-accent-2-700)' }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-accent-2-800)', marginTop: 2 }}>{val}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

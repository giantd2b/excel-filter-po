import { useState } from 'react';
import { LINE_URL, PHONE, PHONE_LABEL, baht } from '../data/packages';
import { charm } from '../ui';
import type { SavedBooking } from '../App';

interface Props {
  saved: SavedBooking;
  onHome: () => void;
}

export default function Done({ saved, onHome }: Props) {
  const [copied, setCopied] = useState(false);

  const copySummary = () => {
    const txt = ['ขอจองงานบุญ ' + saved.code]
      .concat(saved.rows.map((x) => x.k + ': ' + x.v))
      .concat([
        'ราคาประเมิน: ' + baht(saved.total) + ' บาท',
        'ผู้จอง: ' + saved.f.name + ' ' + saved.f.phone,
        saved.f.note ? 'หมายเหตุ: ' + saved.f.note : '',
      ])
      .filter(Boolean)
      .join('\n');
    try {
      navigator.clipboard.writeText(txt);
    } catch {
      /* clipboard unavailable */
    }
    setCopied(true);
  };

  return (
    <div style={{ padding: '34px 20px 40px', animation: 'riseIn .3s ease both' }}>
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: 999,
          background: 'var(--color-accent-2-500)',
          display: 'grid',
          placeItems: 'center',
          marginBottom: 20,
        }}
      >
        <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </div>
      <h1 style={{ ...charm, fontSize: 32, lineHeight: 1.45, margin: '0 0 8px', color: 'var(--color-accent-900)' }}>
        รับคำขอจองแล้ว
      </h1>
      <p style={{ margin: '0 0 20px', fontSize: 15, lineHeight: 1.75, color: 'var(--color-neutral-700)', textWrap: 'pretty' }}>
        ขั้นตอนสุดท้าย กรุณากดปุ่มด้านล่างเพื่อส่งรายละเอียดให้ทีมงานทาง LINE ทีมงานจะตรวจสอบคิววันงานและยืนยันกลับ
      </p>
      <div
        style={{
          background: 'var(--color-neutral-100)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>รหัสการจอง</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-accent-700)', letterSpacing: '.04em' }}>
            {saved.code}
          </div>
        </div>
        {saved.rows
          .concat([{ k: 'ผู้จอง', v: saved.f.name + ' · ' + saved.f.phone }])
          .map((s) => (
            <div
              key={s.k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                padding: '7px 0',
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              <div style={{ fontSize: 14, color: 'var(--color-neutral-600)' }}>{s.k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-800)', textAlign: 'right' }}>
                {s.v}
              </div>
            </div>
          ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 12,
            paddingTop: 12,
            borderTop: '2px solid var(--color-accent-300)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>ราคาประเมิน</div>
          <div style={{ ...charm, fontSize: 28, color: 'var(--color-accent-700)', lineHeight: 1.25 }}>
            {baht(saved.total)} บาท
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
        <a
          href={LINE_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: 16,
            borderRadius: 999,
            background: '#06c755',
            color: '#fff',
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            boxShadow: 'var(--shadow-md)',
            display: 'block',
          }}
        >
          ส่งรายละเอียดทาง LINE @temboon
        </a>
        <div
          onClick={copySummary}
          className="hoverable"
          style={{
            padding: 15,
            borderRadius: 999,
            border: '1.5px solid var(--color-accent-400)',
            color: 'var(--color-accent-700)',
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {copied ? 'คัดลอกแล้ว' : 'คัดลอกรายละเอียดการจอง'}
        </div>
        <a
          href={`tel:${PHONE}`}
          style={{
            padding: 15,
            borderRadius: 999,
            border: '1.5px solid var(--color-neutral-300)',
            color: 'var(--color-neutral-700)',
            textAlign: 'center',
            fontSize: 16,
            fontWeight: 600,
            display: 'block',
          }}
        >
          โทร {PHONE_LABEL}
        </a>
        <div
          onClick={onHome}
          style={{ padding: 14, textAlign: 'center', fontSize: 15, color: 'var(--color-neutral-600)', cursor: 'pointer' }}
        >
          กลับหน้าแรก
        </div>
      </div>
    </div>
  );
}

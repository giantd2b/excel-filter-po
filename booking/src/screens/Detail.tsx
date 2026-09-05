import { DISCOUNTS, baht, type Pkg } from '../data/packages';
import { BackLink, charm } from '../ui';

interface Props {
  pkg: Pkg;
  onBack: () => void;
  onBook: () => void;
}

export default function Detail({ pkg, onBack, onBook }: Props) {
  const tierTables =
    pkg.kind === 'full'
      ? [
          {
            title: 'อาหารบุฟเฟต์',
            note: `เพิ่มจำนวน ${baht(pkg.buffet!.extra)} บาท/ท่าน · ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%`,
            rows: pkg.buffet!.tiers.map((t) => ({ k: `แขก ${t[0]} ท่าน + อาหารพระ 9`, v: baht(t[1]) + '.-' })),
          },
          {
            title: 'อาหารโต๊ะจีน (พร้อมอาหารพระ 9 รูป)',
            note: `เพิ่มจำนวน ${baht(pkg.table!.extra)} บาท/โต๊ะ · ฟรีเครื่องดื่ม · จำนวนแขก 60 ท่านขึ้นไป`,
            rows: pkg.table!.tiers.map((t) => ({ k: `${t[0]} โต๊ะ`, v: baht(t[1]) + '.-' })),
          },
        ]
      : [];

  return (
    <div style={{ animation: 'riseIn .25s ease both' }}>
      <div style={{ padding: '14px 20px 0' }}>
        <BackLink label="ย้อนกลับ" onClick={onBack} />
      </div>
      <div style={{ padding: '12px 20px 20px' }}>
        <div style={{ fontSize: 13, color: 'var(--color-accent-2-700)', fontWeight: 600 }}>
          {pkg.kind === 'full' ? 'พิธีสงฆ์ + อาหารเลี้ยงแขก' : 'พิธีสงฆ์ พร้อมอาหารถวายพระ'}
        </div>
        <h1 style={{ ...charm, fontSize: 33, lineHeight: 1.45, margin: '4px 0 8px', color: 'var(--color-accent-900)' }}>
          {pkg.name}
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--color-neutral-700)' }}>{pkg.tagline}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{pkg.kind === 'full' ? 'เริ่มต้น' : ''}</span>
          <span style={{ ...charm, fontSize: 36, color: 'var(--color-accent-700)', lineHeight: 1.25 }}>
            {baht(pkg.kind === 'full' ? pkg.buffet!.tiers[0][1] : pkg.base!)}
          </span>
          <span style={{ fontSize: 15, color: 'var(--color-neutral-700)' }}>บาท</span>
        </div>
      </div>

      <div style={{ padding: '0 20px 22px' }}>
        <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '1 / 1.414',
              display: 'block',
              backgroundImage: `url("${pkg.img}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'top center',
              filter: 'saturate(.92)',
            }}
          ></div>
        </div>
      </div>

      {tierTables.length > 0 && (
        <div style={{ padding: '0 20px 24px' }}>
          <h2 style={{ ...charm, fontSize: 25, margin: '0 0 12px', color: 'var(--color-accent-900)' }}>ราคาตามจำนวน</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tierTables.map((t) => (
              <div
                key={t.title}
                style={{
                  background: 'var(--color-neutral-100)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-accent-800)', marginBottom: 8 }}>
                  {t.title}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {t.rows.map((row) => (
                    <div
                      key={row.k}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        padding: '9px 0',
                        borderBottom: '1px solid var(--color-divider)',
                      }}
                    >
                      <div style={{ fontSize: 14.5, color: 'var(--color-neutral-800)' }}>{row.k}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-700)', whiteSpace: 'nowrap' }}>
                        {row.v}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 9 }}>{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px 24px' }}>
        <h2 style={{ ...charm, fontSize: 25, margin: '0 0 12px', color: 'var(--color-accent-900)' }}>
          สิ่งที่ได้ในแพ็กเกจ
        </h2>
        <div
          style={{
            background: 'var(--color-neutral-100)',
            borderRadius: 'var(--radius-md)',
            padding: '6px 18px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {pkg.features.map((ft) => (
            <div
              key={ft[0]}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                padding: '11px 0',
                borderBottom: '1px solid var(--color-divider)',
              }}
            >
              <div style={{ fontSize: 14.5, color: 'var(--color-neutral-800)', lineHeight: 1.5 }}>{ft[0]}</div>
              <div
                style={{
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: 'var(--color-accent-2-700)',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                }}
              >
                {ft[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'var(--color-accent-2-200)', borderRadius: 'var(--radius-md)', padding: '15px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-2-800)', marginBottom: 7 }}>
              สิ่งที่ลูกค้าเตรียม
            </div>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--color-accent-2-800)' }}>
              ซองปัจจัย
              <br />
              พระพุทธรูป
            </div>
          </div>
          <div style={{ background: 'var(--color-accent-200)', borderRadius: 'var(--radius-md)', padding: '15px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-800)', marginBottom: 7 }}>ส่วนลด</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--color-accent-800)' }}>
              {pkg.kind === 'full'
                ? `นิมนต์รับ-ส่งพระเอง ลด ${baht(DISCOUNTS.selfTransport)} บาท`
                : `นิมนต์รับ-ส่งพระเอง ลด ${baht(DISCOUNTS.selfTransport)} บาท / พระ 5 รูป ลด ${baht(DISCOUNTS.fiveMonks)} บาท`}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <div
          onClick={onBook}
          className="hoverable"
          style={{
            padding: 16,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: '#fff',
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          ขอใบเสนอราคาแพ็กเกจนี้
        </div>
      </div>
    </div>
  );
}

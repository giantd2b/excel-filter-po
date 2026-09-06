import { DISCOUNTS, DISH_COUNTS, baht, priceUnitLabel, startPrice, type Pkg } from '../data/packages';
import { MENUS, MENU_IMAGES, MENU_INTRO, MERIT_MENU_IMAGES } from '../data/menus';
import { BackLink, charm } from '../ui';

/** menu poster pages: swipe sideways, tap to open full size */
function MenuGallery({ images, title }: { images: string[]; title?: string }) {
  if (!images.length) return null;
  return (
    <div style={{ margin: '0 -20px 14px' }}>
      {title && <div style={{ padding: '0 20px 8px', fontSize: 15, fontWeight: 700, color: 'var(--color-accent-800)' }}>{title}</div>}
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '2px 20px 8px',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {images.map((src, i) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: images.length > 1 ? '0 0 78%' : '0 0 100%',
              scrollSnapAlign: 'center',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              background: 'var(--color-neutral-200)',
              display: 'block',
            }}
          >
            <img
              src={src}
              alt={`${title || 'เมนู'} หน้า ${i + 1}`}
              loading="lazy"
              style={{ width: '100%', aspectRatio: '1 / 1.414', objectFit: 'cover', display: 'block' }}
            />
          </a>
        ))}
      </div>
      <div style={{ padding: '0 20px', fontSize: 12, color: 'var(--color-neutral-600)' }}>
        {images.length > 1 ? `เลื่อนดูเมนูทั้ง ${images.length} หน้า · ` : ''}แตะรูปเพื่อดูขนาดเต็ม
      </div>
    </div>
  );
}

interface Props {
  pkg: Pkg;
  onBack: () => void;
  onBook: () => void;
}

const cardBox = {
  background: 'var(--color-neutral-100)',
  borderRadius: 'var(--radius-md)',
  padding: '16px 18px',
  boxShadow: 'var(--shadow-sm)',
} as const;

export default function Detail({ pkg, onBack, onBook }: Props) {
  const isCatering = pkg.kind === 'catering';
  const unit = priceUnitLabel(pkg);

  // price tables: merit "full" packages list the guest/table tiers; catering lists per-unit prices
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
      : isCatering && pkg.unit === 'guest' && pkg.perHead
        ? [
            {
              title: 'ราคาต่อท่าน ตามจำนวนอาหารคาว',
              note: `ขั้นต่ำ ${pkg.minCount} ท่าน · เพิ่มจำนวนแขกคิดราคาต่อท่าน × จำนวนที่เพิ่ม · ราคายังไม่รวมภาษีมูลค่าเพิ่ม 7%`,
              rows: DISH_COUNTS.map((n) => ({ k: `${n} อย่าง`, v: `${baht(pkg.perHead![n])}.- /ท่าน` })),
            },
          ]
        : isCatering && pkg.unit === 'table'
          ? [
              {
                title: 'ราคาต่อโต๊ะ',
                note: `โต๊ะละ 8 ท่าน · ขั้นต่ำ ${pkg.minCount} โต๊ะ · ราคาไม่รวมเครื่องดื่ม (เพิ่ม 250 บาท/โต๊ะ) · ยังไม่รวมภาษีมูลค่าเพิ่ม 7%`,
                rows: [
                  { k: `โต๊ะจีน ${pkg.courses} อย่าง`, v: `${baht(pkg.perTable ?? 0)}.- /โต๊ะ` },
                  { k: `ตัวอย่าง ${pkg.minCount} โต๊ะ (${(pkg.minCount ?? 0) * 8} ท่าน)`, v: `${baht((pkg.perTable ?? 0) * (pkg.minCount ?? 0))}.-` },
                ],
              },
            ]
          : [];

  const menu = MENUS[pkg.id] || [];
  const menuImages = MENU_IMAGES[pkg.id] || [];
  const meritMenus = pkg.kind === 'full' ? MERIT_MENU_IMAGES[pkg.id] : undefined;
  const eyebrow = isCatering
    ? pkg.unit === 'table'
      ? 'IRIS Catering · โต๊ะจีน'
      : 'IRIS Catering · บุฟเฟต์อาหารไทย'
    : pkg.kind === 'full'
      ? 'พิธีสงฆ์ + อาหารเลี้ยงแขก'
      : 'พิธีสงฆ์ พร้อมอาหารถวายพระ';

  return (
    <div style={{ animation: 'riseIn .25s ease both' }}>
      <div style={{ padding: '14px 20px 0' }}>
        <BackLink label="ย้อนกลับ" onClick={onBack} />
      </div>
      <div style={{ padding: '12px 20px 20px' }}>
        <div style={{ fontSize: 13, color: 'var(--color-accent-2-700)', fontWeight: 600 }}>{eyebrow}</div>
        <h1 style={{ ...charm, fontSize: 33, lineHeight: 1.45, margin: '4px 0 8px', color: 'var(--color-accent-900)' }}>
          {pkg.name}
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--color-neutral-700)' }}>{pkg.tagline}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--color-neutral-600)' }}>{unit.prefix}</span>
          <span style={{ ...charm, fontSize: 36, color: 'var(--color-accent-700)', lineHeight: 1.25 }}>{baht(startPrice(pkg))}</span>
          <span style={{ fontSize: 15, color: 'var(--color-neutral-700)' }}>{unit.suffix}</span>
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
              <div key={t.title} style={cardBox}>
                <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--color-accent-800)', marginBottom: 8 }}>{t.title}</div>
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
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-700)', whiteSpace: 'nowrap' }}>{row.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 9, lineHeight: 1.6 }}>{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px 24px' }}>
        <h2 style={{ ...charm, fontSize: 25, margin: '0 0 12px', color: 'var(--color-accent-900)' }}>สิ่งที่ได้ในแพ็กเกจ</h2>
        <div style={{ ...cardBox, padding: '6px 18px' }}>
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
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--color-accent-2-700)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {ft[1]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* catering: the full menu (display only — the customer confirms dishes with the team after booking) */}
      {menu.length > 0 && (
        <div style={{ padding: '0 20px 24px' }}>
          <h2 style={{ ...charm, fontSize: 25, margin: '0 0 6px', color: 'var(--color-accent-900)' }}>รายการเมนู</h2>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-neutral-600)' }}>{MENU_INTRO[pkg.line]}</p>
          <MenuGallery images={menuImages} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {menu.map((g) => (
              <details key={g.category} style={{ ...cardBox, padding: 0 }}>
                <summary
                  style={{
                    listStyle: 'none',
                    cursor: 'pointer',
                    padding: '13px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--color-accent-800)',
                  }}
                >
                  <span>{g.category}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-neutral-600)' }}>{g.items.length} รายการ</span>
                </summary>
                <div style={{ padding: '0 18px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {g.items.map((it) => (
                    <span
                      key={it}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 999,
                        background: 'var(--color-accent-2-200)',
                        color: 'var(--color-accent-2-800)',
                        fontSize: 12.5,
                        lineHeight: 1.5,
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* merit packages with guest food: the buffet / Chinese-table menus this package serves */}
      {meritMenus && (
        <div style={{ padding: '0 20px 24px' }}>
          <h2 style={{ ...charm, fontSize: 25, margin: '0 0 6px', color: 'var(--color-accent-900)' }}>เมนูอาหารเลี้ยงแขก</h2>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--color-neutral-600)' }}>
            เลือกรูปแบบบุฟเฟต์หรือโต๊ะจีนในขั้นตอนจอง แล้วยืนยันรายการอาหารกับทีมงานหลังจอง
          </p>
          <MenuGallery images={meritMenus.buffet} title="เมนูบุฟเฟต์" />
          <MenuGallery images={meritMenus.table} title="เมนูโต๊ะจีน" />
        </div>
      )}

      <div style={{ padding: '0 20px 24px' }}>
        {isCatering ? (
          <div style={{ background: 'var(--color-accent-200)', borderRadius: 'var(--radius-md)', padding: '15px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-800)', marginBottom: 7 }}>เงื่อนไข</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8, color: 'var(--color-accent-800)' }}>
              {(pkg.notes || []).map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'var(--color-accent-2-200)', borderRadius: 'var(--radius-md)', padding: '15px 16px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-accent-2-800)', marginBottom: 7 }}>สิ่งที่ลูกค้าเตรียม</div>
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
        )}
      </div>

      <div style={{ padding: '0 20px 40px' }}>
        <div
          onClick={onBook}
          className="hoverable"
          style={{
            padding: 16,
            borderRadius: 999,
            background: 'var(--color-accent)',
            color: 'var(--color-on-accent)',
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

import { useState } from 'react';
import { FAQS, LINES, PKGS, PROVINCES, baht, priceUnitLabel, startPrice, type Pkg, type PkgLine } from '../data/packages';
import { BRAND, SITE_FAMILY, SITE_LINES } from '../lib/site';
import { SectionTitle, charm } from '../ui';

const WORK_SLOTS = BRAND.work;
const SITE_TABS = LINES.filter((l) => SITE_LINES.includes(l.id));
const SITE_FAQS = FAQS.filter((q) => !q.site || q.site === SITE_FAMILY);

function WorkImage({ file, label }: { file: string; label: string }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 20,
          background: 'var(--color-neutral-200)',
          border: '1.5px dashed var(--color-neutral-400)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 13,
          color: 'var(--color-neutral-600)',
        }}
      >
        {label}
      </div>
    );
  }
  return (
    <img
      src={`${import.meta.env.BASE_URL}img/${file}`}
      alt={label}
      onError={() => setMissing(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20, display: 'block' }}
    />
  );
}

interface Props {
  /** product line tab (owned by App so the wizard and links can preselect it) */
  line: PkgLine;
  onLineChange: (line: PkgLine) => void;
  onStartBooking: () => void;
  onOpenPkg: (p: Pkg) => void;
  /** start the wizard with this package already chosen */
  onBookPkg: (p: Pkg) => void;
}

/** card button label — the detail page is where the menu lives for catering */
const CTA_DETAIL: Record<PkgLine, string> = {
  merit: 'ดูรายละเอียดแพ็กเกจ',
  buffet: 'ดูเมนูทั้งหมด 100+ รายการ',
  chinese: 'ดูเมนูทุกจาน',
};

const LINE_INTRO: Record<PkgLine, { title: string; sub: string }> = {
  merit: { title: 'แพ็กเกจงานบุญ', sub: 'แตะที่การ์ดเพื่อดูสิ่งที่ได้ในแพ็กเกจทั้งหมด' },
  buffet: { title: 'บุฟเฟต์อาหารไทย', sub: 'คิดราคาต่อท่านตามจำนวนอย่างที่เลือก (5-8 อย่าง) ขั้นต่ำ 40 ท่าน · แตะดูเมนูทั้งหมด' },
  chinese: { title: 'โต๊ะจีน', sub: 'คิดราคาต่อโต๊ะ 8 ท่าน เลือกได้จานละ 1 เมนู ขั้นต่ำ 10 โต๊ะ · แตะดูเมนูแต่ละจาน' },
};

export default function Home({ line, onLineChange, onStartBooking, onOpenPkg, onBookPkg }: Props) {
  const [openFaq, setOpenFaq] = useState(-1);
  const shown = PKGS.filter((p) => p.line === line);

  const scrollPkgs = () => {
    const el = document.getElementById('pkgs');
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' });
  };

  return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', padding: '26px 20px 30px' }}>
        <div
          style={{
            position: 'absolute',
            right: -70,
            top: -40,
            width: 220,
            height: 220,
            borderRadius: 999,
            background: 'var(--color-accent-200)',
            opacity: 0.55,
          }}
        ></div>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--color-accent-2-200)',
              color: 'var(--color-accent-2-800)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {PROVINCES.join(' · ')}
          </div>
          <h1
            style={{
              ...charm,
              fontSize: 38,
              lineHeight: 1.5,
              margin: '12px 0 10px',
              paddingTop: 2,
              color: 'var(--color-accent-900)',
              textWrap: 'pretty',
            }}
          >
            {BRAND.heroTitle[0]}
            <br />
            {BRAND.heroTitle[1]}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 15.5,
              lineHeight: 1.7,
              color: 'var(--color-neutral-700)',
              maxWidth: 330,
              textWrap: 'pretty',
            }}
          >
            {BRAND.heroSub}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <div
              onClick={onStartBooking}
              className="hoverable"
              style={{
                flex: 1,
                padding: '15px 18px',
                borderRadius: 999,
                background: 'var(--color-accent)',
                color: 'var(--color-on-accent)',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              ขอใบเสนอราคาเบื้องต้น
            </div>
            <div
              onClick={scrollPkgs}
              className="hoverable"
              style={{
                padding: '15px 18px',
                borderRadius: 999,
                border: '1.5px solid var(--color-accent-400)',
                color: 'var(--color-accent-700)',
                textAlign: 'center',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ดูแพ็กเกจ
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, padding: '0 20px 26px' }}>
        {BRAND.stats.map(([big, small]) => (
          <div
            key={small}
            style={{
              background: 'var(--color-neutral-100)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 10px',
              textAlign: 'center',
            }}
          >
            <div style={{ ...charm, fontSize: 26, color: 'var(--color-accent-700)', lineHeight: 1.35 }}>{big}</div>
            <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 4 }}>{small}</div>
          </div>
        ))}
      </div>

      {/* packages */}
      <div id="pkgs" style={{ padding: '4px 20px 8px' }}>
        {/* product line tabs (only when this storefront sells more than one line) */}
        {SITE_TABS.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: 4,
            marginBottom: 16,
            background: 'var(--color-neutral-200)',
            borderRadius: 999,
          }}
        >
          {SITE_TABS.map((l) => {
            const on = l.id === line;
            return (
              <div
                key={l.id}
                onClick={() => onLineChange(l.id)}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: 999,
                  textAlign: 'center',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: on ? 'var(--color-accent-700)' : 'transparent',
                  color: on ? 'var(--color-logo-text)' : 'var(--color-neutral-700)',
                  transition: 'background .15s',
                }}
              >
                {l.short}
              </div>
            );
          })}
        </div>
        )}
        <SectionTitle style={{ margin: '0 0 6px' }}>{LINE_INTRO[line].title}</SectionTitle>
        <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--color-neutral-600)' }}>{LINE_INTRO[line].sub}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 28px' }}>
        {shown.map((p, i) => {
          const header =
            line !== 'merit'
              ? ''
              : i === 0
                ? 'ไม่มีอาหารเลี้ยงแขก'
                : p.kind === 'full' && shown[i - 1].kind === 'ceremony'
                  ? 'มีอาหารเลี้ยงแขก (ครบวงจร)'
                  : '';
          const unit = priceUnitLabel(p);
          return (
            <div key={p.id} style={{ display: 'contents' }}>
              {header && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <div style={{ ...charm, fontSize: 21, color: 'var(--color-accent-800)', lineHeight: 1.4 }}>
                    {header}
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'var(--color-divider)' }}></div>
                </div>
              )}
              <div
                onClick={() => onOpenPkg(p)}
                className="hoverable"
                style={{
                  background: 'var(--color-neutral-100)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-sm)',
                  cursor: 'pointer',
                  border: '1.5px solid transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 14, padding: 14 }}>
                  <div
                    style={{
                      width: 92,
                      height: 120,
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden',
                      flex: 'none',
                      background: 'var(--color-neutral-200)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url("${p.img}")`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'top center',
                        filter: 'saturate(.88) contrast(.95)',
                      }}
                    ></div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ ...charm, fontSize: 22, lineHeight: 1.4, color: 'var(--color-accent-900)', flex: 1 }}>
                        {p.name}
                      </div>
                      {p.badge && (
                        <div
                          style={{
                            padding: '3px 10px',
                            borderRadius: 999,
                            background: 'var(--color-accent-2-600)',
                            color: 'var(--color-on-accent)',
                            fontSize: 11,
                            fontWeight: 600,
                            flex: 'none',
                            marginTop: 3,
                          }}
                        >
                          {p.badge}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', lineHeight: 1.55, marginTop: 4 }}>
                      {p.tagline}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
                      {p.chips.map((c) => (
                        <div
                          key={c}
                          style={{
                            padding: '3px 9px',
                            borderRadius: 999,
                            background: 'var(--color-accent-2-200)',
                            color: 'var(--color-accent-2-800)',
                            fontSize: 11.5,
                          }}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>{unit.prefix}</span>
                      <span style={{ ...charm, fontSize: 25, color: 'var(--color-accent-700)', lineHeight: 1.3 }}>
                        {baht(startPrice(p))}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>{unit.suffix}</span>
                    </div>
                  </div>
                </div>
                {/* call to action: see the menu / details, or jump straight to a quote for this package */}
                <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPkg(p);
                    }}
                    className="hoverable"
                    style={{
                      flex: 1.3,
                      padding: '11px 12px',
                      borderRadius: 999,
                      border: '1.5px solid var(--color-accent-400)',
                      color: 'var(--color-accent-700)',
                      textAlign: 'center',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {CTA_DETAIL[p.line]}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onBookPkg(p);
                    }}
                    className="hoverable"
                    style={{
                      flex: 1,
                      padding: '11px 12px',
                      borderRadius: 999,
                      background: 'var(--color-accent)',
                      color: 'var(--color-on-accent)',
                      textAlign: 'center',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  >
                    ขอใบเสนอราคา
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3 steps */}
      <div
        style={{
          background: 'var(--color-surface)',
          padding: '28px 20px',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}
      >
        <SectionTitle style={{ margin: '0 0 18px' }}>ขอใบเสนอราคาง่าย ๆ 3 ขั้นตอน</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {BRAND.steps.map(([title, sub], i) => (
            <div key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  ...charm,
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  background: 'var(--color-accent)',
                  color: 'var(--color-on-accent)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 21,
                  flex: 'none',
                }}
              >
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-accent-900)' }}>{title}</div>
                <div style={{ fontSize: 14, color: 'var(--color-neutral-700)', lineHeight: 1.6 }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* gallery */}
      <div style={{ background: 'var(--color-surface)', padding: '8px 20px 28px' }}>
        <SectionTitle style={{ margin: '0 0 14px' }}>ผลงานจริง</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
          {WORK_SLOTS.map((w) => (
            <div key={w.file} style={{ aspectRatio: '1/1' }}>
              <WorkImage file={w.file} label={w.label} />
            </div>
          ))}
        </div>
      </div>

      {/* reviews */}
      <div style={{ background: 'var(--color-surface)', padding: '8px 20px 30px' }}>
        <SectionTitle style={{ margin: '0 0 14px' }}>ลูกค้าพูดถึงเรา</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {BRAND.reviews.map((r) => (
            <div
              key={r.who}
              style={{
                background: 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 18px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ color: 'var(--color-accent-500)', fontSize: 14, letterSpacing: 2 }}>{r.stars}</div>
              <div
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.7,
                  color: 'var(--color-neutral-800)',
                  marginTop: 6,
                  textWrap: 'pretty',
                }}
              >
                {r.text}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 8 }}>{r.who}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ background: 'var(--color-surface)', padding: '8px 20px 40px' }}>
        <SectionTitle style={{ margin: '0 0 14px' }}>คำถามที่พบบ่อย</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SITE_FAQS.map((q, i) => (
            <div
              key={q.q}
              onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
              style={{
                background: 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-md)',
                padding: '15px 18px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1, fontSize: 15.5, fontWeight: 600, color: 'var(--color-accent-900)', lineHeight: 1.5 }}>
                  {q.q}
                </div>
                <div style={{ color: 'var(--color-accent)', fontSize: 20, lineHeight: 1, flex: 'none' }}>
                  {openFaq === i ? '−' : '+'}
                </div>
              </div>
              {openFaq === i && (
                <div
                  style={{
                    fontSize: 14.5,
                    lineHeight: 1.75,
                    color: 'var(--color-neutral-700)',
                    marginTop: 10,
                    textWrap: 'pretty',
                  }}
                >
                  {q.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

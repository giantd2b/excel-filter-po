import { useRef, useState } from 'react';
import {
  ADDONS,
  DISCOUNTS,
  OCCASIONS,
  PKGS,
  STEPS,
  TIME_OPTS,
  baht,
  pkgById,
} from '../data/packages';
import { AddressFields, FloorField } from '../components/AddressFields';
import { calc, finalizeForm, summary, tentRecommendation, type BookingForm } from '../lib/calc';
import { submitBooking } from '../lib/api';
import { BackLink, CheckIcon, FieldLabel, cardStyle, charm, checkStyle, chipStyle, inputStyle } from '../ui';
import type { SavedBooking } from '../App';

interface Props {
  form: BookingForm;
  setForm: (f: BookingForm) => void;
  onExit: () => void;
  onDone: (saved: SavedBooking) => void;
  /** token from /booking/?ref=… (attributes the booking to a chat customer) */
  linkRef?: string | null;
  /** open at a later step (quick booking → "ปรับแพ็กเกจเอง") */
  initialStep?: number;
}

export default function Wizard({ form: f, setForm, onExit, onDone, linkRef, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  const setF = <K extends keyof BookingForm>(k: K, v: BookingForm[K]) => {
    setForm({ ...f, [k]: v });
    setErr('');
  };

  const mode = pkgById(f.pkg).kind;
  const hasFood = mode === 'full';
  const c = calc(f);


  const tentSuggested = useRef(false);
  const tentReason = tentRecommendation(f);

  const next = async () => {
    if (step === 0 && !f.date) return setErr('กรุณาเลือกวันที่จัดงาน');
    if (step === 0 && !f.tambon && !f.venue.trim()) return setErr('กรุณาเลือกตำบล/แขวง ที่จัดงาน');
    if (step === 4) {
      if (!f.name.trim()) return setErr('กรุณากรอกชื่อผู้ติดต่อ');
      if (!/[0-9]{9,}/.test(f.phone.replace(/[^0-9]/g, ''))) return setErr('กรุณากรอกเบอร์โทรให้ถูกต้อง');
      if (!f.sameName && !f.billingName.trim()) return setErr('กรุณากรอกชื่อที่ต้องการให้ระบุในใบเสนอราคา');
      if (!f.sameAddress && !f.billingLine.trim() && !f.billingTambon) return setErr('กรุณากรอกที่อยู่สำหรับออกใบเสนอราคา');
      if (submitting) return;
      setSubmitting(true);
      try {
        const final = finalizeForm(f, 'event');
        const result = await submitBooking(final, linkRef);
        onDone({
          code: result.code,
          total: result.estimatedTotal,
          quotationUrl: result.quotationUrl || null,
          quotationDocNo: result.quotationDocNo || null,
          rows: summary(final),
          f: final,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // entering the add-on step: pre-select the extra big tent when the party outgrows the included one
    if (step === 2 && tentRecommendation(f) && !f.addons.includes('tent') && !tentSuggested.current) {
      tentSuggested.current = true;
      setF('addons', [...f.addons, 'tent']);
    }
    setStep(step + 1);
    setErr('');
    window.scrollTo(0, 0);
  };

  const back = () => {
    if (step === 0) return onExit();
    setStep(step - 1);
    setErr('');
  };

  return (
    <div>
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackLink label="ย้อนกลับ" onClick={back} />
        <div style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-neutral-600)' }}>
          ขั้นตอน {step + 1} จาก 5
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '12px 20px 0' }}>
        {STEPS.map((s, i) => (
          <div
            key={s.t}
            style={{
              height: 5,
              borderRadius: 999,
              flex: 1,
              background: i <= step ? 'var(--color-accent)' : 'var(--color-neutral-300)',
            }}
          ></div>
        ))}
      </div>

      <div style={{ padding: '20px 20px 24px' }}>
        <h1 style={{ ...charm, fontSize: 29, lineHeight: 1.45, margin: '0 0 6px', color: 'var(--color-accent-900)' }}>
          {STEPS[step].t}
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14.5, color: 'var(--color-neutral-600)', lineHeight: 1.6 }}>
          {STEPS[step].s}
        </p>

        {/* step 0: event details */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <div>
              <FieldLabel>วันที่จัดงาน</FieldLabel>
              <input type="date" value={f.date} onChange={(e) => setF('date', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>ช่วงเวลาพิธี</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {TIME_OPTS.map((tm) => (
                  <div
                    key={tm.v}
                    onClick={() => setF('time', tm.v)}
                    style={cardStyle(f.time === tm.v, { flex: 1, padding: 13, textAlign: 'center' })}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-neutral-800)' }}>{tm.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginTop: 2 }}>{tm.sub}</div>
                  </div>
                ))}
              </div>
            </div>
            <AddressFields
              form={f}
              setForm={(nf) => {
                setForm(nf);
                setErr('');
              }}
              scope="event"
              lineLabel="บ้านเลขที่ / หมู่ / ถนน หรือชื่อสถานที่จัดงาน"
              linePlaceholder="เช่น 99/1 ม.5 ถ.สุขุมวิท หรือ ศาลาวัดใหญ่อินทาราม"
            />
            <FloorField value={f.floor} onChange={(v) => setF('floor', v)} />
          </div>
        )}

        {/* step 1: package pick */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              {[
                { id: 'ceremony', label: 'ไม่มีอาหารเลี้ยงแขก', sub: 'พิธีสงฆ์ + อาหารถวายพระ' },
                { id: 'full', label: 'มีอาหารเลี้ยงแขก', sub: 'พิธีสงฆ์ + บุฟเฟต์ / โต๊ะจีน' },
              ].map((md) => (
                <div
                  key={md.id}
                  onClick={() => {
                    const list = PKGS.filter((p) => p.kind === md.id);
                    const first = md.id === 'ceremony' ? list[1] : list[0];
                    setF('pkg', first.id);
                  }}
                  style={cardStyle(mode === md.id, { flex: 1, padding: '13px 14px' })}
                >
                  <div style={{ fontSize: 15.5, fontWeight: 600, color: 'var(--color-neutral-800)' }}>{md.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 2 }}>{md.sub}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                background: 'var(--color-accent-2-200)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 15px',
                fontSize: 13,
                lineHeight: 1.7,
                color: 'var(--color-accent-2-800)',
              }}
            >
              {mode === 'ceremony'
                ? 'ทั้ง 2 แพ็กเกจพิธีสงฆ์ครบถูกต้องเหมือนกัน ต่างกันที่ระดับความพรีเมี่ยมของอุปกรณ์ สังฆทาน และฉากประดับ — อยากได้ภาพงานสวยแนะนำ PRIME'
                : 'ทั้ง 3 แพ็กเกจมีพิธีสงฆ์ + โต๊ะเก้าอี้ เต็นท์ ทีมงานครบเหมือนกัน ต่างกันที่ระดับอาหารและของเสริม — งานส่วนใหญ่เลือกครบวงจรพลัส'}
            </div>
            {PKGS.filter((p) => p.kind === mode).map((p) => (
              <div key={p.id} onClick={() => setF('pkg', p.id)} style={cardStyle(f.pkg === p.id, { padding: '15px 17px' })}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ ...charm, fontSize: 21, lineHeight: 1.4, color: 'var(--color-accent-900)' }}>{p.name}</div>
                      {p.badge && (
                        <div
                          style={{
                            padding: '2px 9px',
                            borderRadius: 999,
                            background: 'var(--color-accent-2-600)',
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {p.badge}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--color-accent-700)', fontWeight: 600, lineHeight: 1.55, marginTop: 3 }}>
                      เหมาะกับ: {p.fit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: 'none' }}>
                    <div style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{p.kind === 'full' ? 'เริ่มต้น' : ''}</div>
                    <div style={{ ...charm, fontSize: 21, color: 'var(--color-accent-700)', lineHeight: 1.4 }}>
                      {baht(p.kind === 'full' ? p.buffet!.tiers[0][1] : p.base!)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9 }}>
                  {p.diff.map((d) => (
                    <div key={d} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <CheckIcon />
                      <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', lineHeight: 1.55 }}>{d}</div>
                    </div>
                  ))}
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedPkg(expandedPkg === p.id ? null : p.id);
                  }}
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: '1px solid var(--color-divider)',
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--color-accent-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <span>สิ่งที่ได้ในแพ็กเกจทั้งหมด</span>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{expandedPkg === p.id ? '−' : '+'}</span>
                </div>
                {expandedPkg === p.id && (
                  <div style={{ marginTop: 4 }}>
                    {p.features.map((ft) => (
                      <div
                        key={ft[0]}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 12,
                          padding: '7px 0',
                          borderBottom: '1px solid var(--color-divider)',
                        }}
                      >
                        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-700)', lineHeight: 1.5 }}>{ft[0]}</div>
                        <div
                          style={{
                            fontSize: 12.5,
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
                    {p.kind === 'full' && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-neutral-600)', lineHeight: 1.7 }}>
                        บุฟเฟต์: {p.buffet!.tiers.map((t) => `แขก ${t[0]} = ${baht(t[1])}.-`).join(' · ')}
                        <br />
                        โต๊ะจีน: {p.table!.tiers.map((t) => `${t[0]} โต๊ะ = ${baht(t[1])}.-`).join(' · ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* comparison table */}
            <div
              onClick={() => setShowCompare(!showCompare)}
              className="hoverable"
              style={{
                marginTop: 4,
                padding: '13px 16px',
                borderRadius: 999,
                border: '1.5px solid var(--color-accent-400)',
                color: 'var(--color-accent-700)',
                textAlign: 'center',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {showCompare ? 'ซ่อนตารางเปรียบเทียบ −' : 'เปรียบเทียบความแตกต่างทุกแพ็กเกจ +'}
            </div>
            {showCompare && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginBottom: 10, lineHeight: 1.6 }}>
                  ไล่จากแพ็กเกจเริ่มต้น — การ์ดถัดไปได้ทุกอย่างของการ์ดก่อนหน้า พร้อมส่วนที่เพิ่ม · แตะการ์ดเพื่อเลือก
                </div>
                {(() => {
                  const modePkgs = PKGS.filter((p) => p.kind === mode);
                  const startPrice = (p: (typeof modePkgs)[0]) =>
                    p.kind === 'full' ? p.buffet!.tiers[0][1] : p.base!;
                  return modePkgs.map((p, i) => {
                    const prev = i > 0 ? modePkgs[i - 1] : null;
                    const deltas: { added: boolean; label: string; value: string }[] = [];
                    if (prev) {
                      const keys: string[] = [];
                      for (const src of [prev, p]) for (const [k] of src.features) if (!keys.includes(k)) keys.push(k);
                      for (const k of keys) {
                        const pv = prev.features.find((x) => x[0] === k)?.[1];
                        const cv = p.features.find((x) => x[0] === k)?.[1];
                        if (cv && cv !== pv) {
                          const wasNone = !pv || pv === 'ไม่รวม' || pv === '—';
                          deltas.push({ added: wasNone, label: k, value: cv });
                        }
                      }
                    }
                    const priceDelta = prev ? startPrice(p) - startPrice(prev) : 0;
                    return (
                      <div key={p.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        {prev && (
                          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '4px 14px',
                                borderRadius: 999,
                                background: 'var(--color-accent-2-200)',
                                color: 'var(--color-accent-2-800)',
                                fontSize: 12.5,
                                fontWeight: 700,
                              }}
                            >
                              ↓ เพิ่ม {baht(priceDelta)}.-
                            </div>
                          </div>
                        )}
                        <div
                          onClick={() => setF('pkg', p.id)}
                          style={cardStyle(f.pkg === p.id, { padding: '15px 17px' })}
                        >
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ ...charm, fontSize: 20, lineHeight: 1.4, color: 'var(--color-accent-900)', flex: 1 }}>
                              {p.name}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: 11, color: 'var(--color-neutral-600)', marginRight: 4 }}>
                                {p.kind === 'full' ? 'เริ่มต้น' : ''}
                              </span>
                              <span style={{ ...charm, fontSize: 20, color: 'var(--color-accent-700)' }}>
                                {baht(startPrice(p))}.-
                              </span>
                            </div>
                          </div>
                          {!prev ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9 }}>
                              {p.diff.map((d) => (
                                <div key={d} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                  <CheckIcon />
                                  <div style={{ fontSize: 13, color: 'var(--color-neutral-700)', lineHeight: 1.55 }}>{d}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <>
                              <div
                                style={{
                                  marginTop: 9,
                                  fontSize: 12.5,
                                  fontWeight: 600,
                                  color: 'var(--color-neutral-600)',
                                }}
                              >
                                ทุกอย่างของ{prev.short} แล้วเพิ่ม:
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 7 }}>
                                {deltas.map((d) => (
                                  <div key={d.label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <div
                                      style={{
                                        flex: 'none',
                                        marginTop: 1,
                                        width: 18,
                                        height: 18,
                                        borderRadius: 6,
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        background: d.added ? 'var(--color-accent-2-200)' : 'var(--color-accent-200)',
                                        color: d.added ? 'var(--color-accent-2-800)' : 'var(--color-accent-800)',
                                      }}
                                    >
                                      {d.added ? '+' : '↑'}
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-neutral-800)' }}>
                                      {d.label}{' '}
                                      <span style={{ fontWeight: 600, color: 'var(--color-accent-2-700)' }}>{d.value}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {/* step 2: monks & food */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <FieldLabel>จำนวนพระสงฆ์</FieldLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                {[5, 9].map((m) => (
                  <div
                    key={m}
                    onClick={() => setF('monks', m)}
                    style={cardStyle(f.monks === m, { flex: 1, padding: 13, textAlign: 'center' })}
                  >
                    <div style={{ fontSize: 16, fontWeight: 600 }}>พระ {m} รูป</div>
                    <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>
                      {m === 9 ? 'นิยมที่สุด' : 'ลด ' + baht(DISCOUNTS.fiveMonks)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {hasFood ? (
              <>
                <div>
                  <FieldLabel>รูปแบบอาหารสำหรับแขก</FieldLabel>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[
                      { id: 'buffet' as const, label: 'บุฟเฟต์', sub: 'คิดตามจำนวนแขก' },
                      { id: 'table' as const, label: 'โต๊ะจีน', sub: 'คิดตามจำนวนโต๊ะ' },
                    ].map((fo) => (
                      <div
                        key={fo.id}
                        onClick={() => setF('foodMode', fo.id)}
                        style={cardStyle(f.foodMode === fo.id, { flex: 1, padding: 13, textAlign: 'center' })}
                      >
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{fo.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 2 }}>{fo.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <FieldLabel>{f.foodMode === 'table' ? 'จำนวนโต๊ะจีน' : 'จำนวนแขก'}</FieldLabel>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: 'var(--color-neutral-100)',
                      border: '1.5px solid var(--color-neutral-300)',
                      borderRadius: 999,
                      padding: '7px 10px',
                    }}
                  >
                    <div
                      onClick={() =>
                        f.foodMode === 'table'
                          ? setF('tables', Math.max(8, f.tables - 1))
                          : setF('guests', Math.max(20, f.guests - 10))
                      }
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: 'var(--color-accent-200)',
                        color: 'var(--color-accent-800)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 24,
                        cursor: 'pointer',
                        flex: 'none',
                      }}
                    >
                      −
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ ...charm, fontSize: 30, color: 'var(--color-accent-800)', lineHeight: 1.25 }}>
                        {f.foodMode === 'table' ? f.tables : f.guests}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-neutral-600)' }}>
                        {f.foodMode === 'table' ? 'โต๊ะ' : 'ท่าน'}
                      </div>
                    </div>
                    <div
                      onClick={() =>
                        f.foodMode === 'table' ? setF('tables', f.tables + 1) : setF('guests', f.guests + 10)
                      }
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        background: 'var(--color-accent-200)',
                        color: 'var(--color-accent-800)',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 24,
                        cursor: 'pointer',
                        flex: 'none',
                      }}
                    >
                      +
                    </div>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', marginTop: 8 }}>
                    {f.foodMode === 'table'
                      ? 'โต๊ะจีนเริ่มต้น 8 โต๊ะ สำหรับแขก 60 ท่านขึ้นไป'
                      : 'แขก 50 ท่านขึ้นไป ได้เต็นท์ 1 หลัง ขนาด 5x12 เมตร'}
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  background: 'var(--color-accent-2-200)',
                  borderRadius: 'var(--radius-md)',
                  padding: '15px 17px',
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: 'var(--color-accent-2-800)',
                }}
              >
                แพ็กเกจนี้เป็นพิธีสงฆ์พร้อมอาหารถวายพระ ไม่รวมอาหารเลี้ยงแขก หากต้องการอาหารเลี้ยงแขกด้วย แนะนำแพ็กเกจครบวงจร
              </div>
            )}
          </div>
        )}

        {/* step 3: addons */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <FieldLabel>ออปชั่นเสริม</FieldLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {ADDONS.map((a) => {
                  const on = f.addons.includes(a.id);
                  return (
                    <div
                      key={a.id}
                      onClick={() => setF('addons', on ? f.addons.filter((x) => x !== a.id) : [...f.addons, a.id])}
                      style={cardStyle(on, { display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px' })}
                    >
                      <div style={checkStyle(on, 'var(--color-accent)')}>{on ? '✓' : ''}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)', display: 'flex', alignItems: 'center', gap: 8 }}>
                          {a.label}
                          {a.id === 'tent' && tentReason && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-accent-2-500)', color: '#fff' }}>แนะนำ</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>{a.sub}</div>
                        {a.id === 'tent' && tentReason && (
                          <div style={{ fontSize: 12, color: 'var(--color-accent-2-700)', marginTop: 4, lineHeight: 1.5 }}>{tentReason}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-700)', whiteSpace: 'nowrap' }}>
                        +{baht(a.price)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div
              onClick={() => setF('selfTransport', !f.selfTransport)}
              style={cardStyle(f.selfTransport, { display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px' })}
            >
              <div style={checkStyle(f.selfTransport, 'var(--color-accent-2-600)')}>{f.selfTransport ? '✓' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>นิมนต์และรับ-ส่งพระเอง</div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>ต้องดำเนินการเองทั้งสองอย่าง</div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-accent-2-700)', whiteSpace: 'nowrap' }}>
                ลด {baht(DISCOUNTS.selfTransport)}
              </div>
            </div>
            <div>
              <FieldLabel>งบประมาณที่ตั้งไว้ (ไม่บังคับ)</FieldLabel>
              <input
                type="text"
                placeholder="เช่น 30,000 บาท"
                value={f.budget}
                onChange={(e) => setF('budget', e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* step 4: contact + summary */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <FieldLabel>ชื่อผู้ติดต่อ</FieldLabel>
              <input
                type="text"
                placeholder="ชื่อ - นามสกุล"
                value={f.name}
                onChange={(e) => setF('name', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <FieldLabel>เบอร์โทรติดต่อ</FieldLabel>
              <input
                type="tel"
                placeholder="08X-XXX-XXXX"
                value={f.phone}
                onChange={(e) => setF('phone', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div
              onClick={() => setF('sameName', !f.sameName)}
              style={cardStyle(f.sameName, { display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px' })}
            >
              <div style={checkStyle(f.sameName, 'var(--color-accent)')}>{f.sameName ? '✓' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>ออกใบเสนอราคาในนามบุคคล</div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>ใช้ชื่อผู้ติดต่อเป็นชื่อในใบเสนอราคา</div>
              </div>
            </div>
            {!f.sameName && (
              <>
                <div>
                  <FieldLabel>ชื่อบริษัท / ชื่อที่ต้องการให้ระบุในใบเสนอราคา</FieldLabel>
                  <input
                    type="text"
                    placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                    value={f.billingName}
                    onChange={(e) => setF('billingName', e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <FieldLabel>เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)</FieldLabel>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="13 หลัก"
                    value={f.taxId}
                    onChange={(e) => setF('taxId', e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </>
            )}
            <div
              onClick={() => setF('sameAddress', !f.sameAddress)}
              style={cardStyle(f.sameAddress, { display: 'flex', alignItems: 'center', gap: 13, padding: '13px 16px' })}
            >
              <div style={checkStyle(f.sameAddress, 'var(--color-accent)')}>{f.sameAddress ? '✓' : ''}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-neutral-800)' }}>ที่อยู่ออกใบเสนอราคาเดียวกับสถานที่จัดงาน</div>
                <div style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>ไม่ติ๊กถ้าต้องการระบุที่อยู่อื่นในใบเสนอราคา</div>
              </div>
            </div>
            {!f.sameAddress && (
              <AddressFields
                form={f}
                setForm={(nf) => {
                  setForm(nf);
                  setErr('');
                }}
                scope="billing"
                lineLabel="ที่อยู่สำหรับออกใบเสนอราคา (บ้านเลขที่ / หมู่ / ถนน)"
                linePlaceholder="เช่น 99/1 ม.5 ถ.สุขุมวิท"
              />
            )}
            <div>
              <FieldLabel>รายละเอียดเพิ่มเติม (ไม่บังคับ)</FieldLabel>
              <textarea
                placeholder="เช่น ต้องการโต๊ะหมู่สีทอง มีผู้สูงอายุต้องการเก้าอี้เพิ่ม"
                value={f.note}
                onChange={(e) => setF('note', e.target.value)}
                rows={3}
                style={{ ...inputStyle, borderRadius: 22, padding: '14px 18px', resize: 'vertical' }}
              ></textarea>
            </div>

            <div
              style={{
                background: 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ ...charm, fontSize: 23, color: 'var(--color-accent-900)', marginBottom: 10 }}>สรุปการจอง</div>
              {summary(f).map((s) => (
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
              <div style={{ marginTop: 14 }}>
                {c.rows.map((pr) => (
                  <div key={pr.k} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '5px 0' }}>
                    <div style={{ fontSize: 14, color: 'var(--color-neutral-700)' }}>{pr.k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-800)', whiteSpace: 'nowrap' }}>
                      {pr.v}
                    </div>
                  </div>
                ))}
              </div>
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
                <div style={{ ...charm, fontSize: 30, color: 'var(--color-accent-700)', lineHeight: 1.25 }}>
                  {baht(c.total)} บาท
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 8, lineHeight: 1.6 }}>
                {c.pkg.kind === 'full'
                  ? 'ราคาประเมินยังไม่รวมภาษีมูลค่าเพิ่ม 7% ทีมงานจะยืนยันราคาสุทธิอีกครั้งทาง LINE'
                  : 'ราคาประเมินจากตัวเลือกที่ท่านระบุ ทีมงานจะยืนยันอีกครั้งทาง LINE'}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-neutral-100)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ ...charm, fontSize: 23, color: 'var(--color-accent-900)', marginBottom: 4 }}>สิ่งที่จะได้รับ</div>
              <div style={{ fontSize: 13, color: 'var(--color-neutral-600)', marginBottom: 8 }}>{c.pkg.name}</div>
              {c.pkg.features.map((ft) => (
                <div
                  key={ft[0]}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 14,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--color-divider)',
                  }}
                >
                  <div style={{ fontSize: 13.5, color: 'var(--color-neutral-800)', lineHeight: 1.5 }}>{ft[0]}</div>
                  <div
                    style={{
                      fontSize: 13.5,
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
        )}
      </div>

      <div style={{ padding: '0 20px 40px', display: 'flex', gap: 10 }}>
        {step > 0 && (
          <div
            onClick={back}
            className="hoverable"
            style={{
              padding: '16px 22px',
              borderRadius: 999,
              border: '1.5px solid var(--color-neutral-300)',
              color: 'var(--color-neutral-700)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ก่อนหน้า
          </div>
        )}
        <div
          onClick={next}
          className="hoverable"
          style={{
            flex: 1,
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
          {step === 4 ? (submitting ? 'กำลังส่งข้อมูล…' : 'ยืนยันการจอง') : 'ถัดไป'}
        </div>
      </div>
      {err && (
        <div style={{ margin: '-28px 20px 32px', fontSize: 13.5, color: '#a3341f', textAlign: 'center' }}>{err}</div>
      )}
    </div>
  );
}

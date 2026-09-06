import type { Pkg } from '../data/packages';
import { baht } from '../data/packages';

/**
 * The one condition customers most often miss on stand-alone โต๊ะจีน: we take orders from 10 tables,
 * but under 15 tables a per-table catering service fee is added. Shown on the package page, the
 * wizard/quick screens (with the live amount when it applies) and repeated on the quotation.
 * Not used for the Chinese-table food inside merit packages (no such fee there).
 */
export default function SmallOrderNotice({ pkg, tables, compact }: { pkg: Pkg; tables?: number; compact?: boolean }) {
  const rule = pkg.smallOrder;
  if (!rule) return null;
  const applies = typeof tables === 'number' && tables > 0 && tables < rule.below;
  const fee = applies ? rule.fee * (tables as number) : 0;
  return (
    <div
      role="note"
      style={{
        background: applies ? 'rgba(220, 38, 38, .08)' : 'rgba(217, 119, 6, .10)',
        border: `1.5px solid ${applies ? 'rgba(220, 38, 38, .55)' : 'rgba(217, 119, 6, .55)'}`,
        borderRadius: 'var(--radius-md)',
        padding: compact ? '10px 12px' : '13px 14px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <span style={{ fontSize: compact ? 18 : 22, lineHeight: 1, flex: 'none' }}>⚠️</span>
      <div style={{ fontSize: compact ? 12.5 : 13.5, lineHeight: 1.65, color: 'var(--color-neutral-800)' }}>
        <div style={{ fontWeight: 700, color: applies ? '#b91c1c' : '#b45309', marginBottom: 2 }}>
          {applies ? `จัด ${tables} โต๊ะ (ต่ำกว่า ${rule.below} โต๊ะ) มีค่าบริการจัดเลี้ยงเพิ่ม +${baht(fee)} บาท` : 'หมายเหตุสำคัญ'}
        </div>
        รับจัดขั้นต่ำ {pkg.minCount ?? 10} โต๊ะ · หากจัด<b>ไม่ถึง {rule.below} โต๊ะ</b> มีค่าบริการจัดเลี้ยงเพิ่มเติม <b>{rule.fee} บาท/โต๊ะ</b>
        {applies ? ' (รวมในราคาประเมินและใบเสนอราคาแล้ว)' : ` · ตั้งแต่ ${rule.below} โต๊ะขึ้นไปไม่มีค่าบริการนี้`}
      </div>
    </div>
  );
}

import type { BookingForm } from '../lib/calc';
import { FieldLabel, chipStyle, inputStyle } from '../ui';
import AreaSearch, { AREA_KEYS, type AreaScope } from './AreaSearch';

interface AddressProps {
  form: BookingForm;
  setForm: (f: BookingForm) => void;
  scope: AreaScope;
  /** label of the free-text line (house no. / moo / road / place name) */
  lineLabel: string;
  linePlaceholder: string;
  /** forwarded to AreaSearch: warn about the travel fee of the picked district */
  showTravelFee?: boolean;
}

/** One full address: free-text line + ตำบล search (+ อำเภอ/จังหวัด/รหัส chips). */
export function AddressFields({ form: f, setForm, scope, lineLabel, linePlaceholder, showTravelFee }: AddressProps) {
  const k = AREA_KEYS[scope];
  return (
    <>
      <div>
        <FieldLabel>{lineLabel}</FieldLabel>
        <input
          type="text"
          placeholder={linePlaceholder}
          value={String(f[k.line] || '')}
          onChange={(e) => setForm({ ...f, [k.line]: e.target.value })}
          style={inputStyle}
        />
      </div>
      <AreaSearch form={f} setForm={setForm} scope={scope} showTravelFee={showTravelFee} />
    </>
  );
}

export const FLOOR_OPTIONS = ['ชั้น 1', 'ชั้น 2', 'ชั้น 3', 'ชั้น 4 ขึ้นไป'];

interface FloorProps {
  value: string;
  onChange: (v: string) => void;
}

/** Floor of the venue — it changes the price estimate (carrying equipment upstairs). */
export function FloorField({ value, onChange }: FloorProps) {
  const isPreset = FLOOR_OPTIONS.includes(value);
  return (
    <div>
      <FieldLabel>ชั้นที่จัดงาน</FieldLabel>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {FLOOR_OPTIONS.map((o) => (
          <div key={o} onClick={() => onChange(o)} style={chipStyle(value === o)}>
            {o}
          </div>
        ))}
        <div onClick={() => onChange(isPreset ? '' : value)} style={chipStyle(!isPreset)}>
          ระบุเอง
        </div>
      </div>
      {!isPreset && (
        <input
          type="text"
          placeholder="เช่น ชั้น 5 อาคาร A มีลิฟต์"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, marginTop: 8 }}
        />
      )}
      <div style={{ fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 6, lineHeight: 1.5 }}>
        ชั้นที่จัดงานมีผลต่อการประเมินราคาและการขนอุปกรณ์ หากไม่ใช่ชั้น 1 ทีมงานจะยืนยันราคาอีกครั้ง
      </div>
    </div>
  );
}

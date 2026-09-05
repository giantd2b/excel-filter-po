import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { THAI_MONTHS, daysInMonth } from './bookingHelpers';
import { TH_AREAS } from '../../data/th-areas';

/** Small form building blocks shared by the booking modals (link / edit). */

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
  compact,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  return (
    <View style={styles.rowWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value || '__empty'}
            style={[styles.chip, compact && styles.chipCompact, on && styles.chipActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.chipText, on && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Day / month / year pickers that produce a plain "YYYY-MM-DD" string — the same approach as
 * the dashboard's ThaiDateSelect (a native date picker once produced a value one day off from
 * what sales tapped; explicit parts leave no room for timezone surprises).
 */
export function ThaiDatePicker({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  const y = m ? Number(m[1]) : 0;
  const mo = m ? Number(m[2]) : 0;
  const d = m ? Number(m[3]) : 0;
  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear + 1, thisYear + 2];
  if (y && !years.includes(y)) years.unshift(y); // keep an already-saved older year selectable
  const maxDay = y && mo ? daysInMonth(y, mo) : 31;

  const emit = (ny: number, nmo: number, nd: number) => {
    if (!ny || !nmo || !nd) {
      onChange('');
      return;
    }
    const dd = Math.min(nd, daysInMonth(ny, nmo));
    onChange(`${ny}-${String(nmo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>ปี</Text>
        <Chips
          compact
          options={years.map((yy) => ({ value: String(yy), label: String(yy + 543) }))}
          value={y ? String(y) : ''}
          onChange={(v) => emit(Number(v), mo || new Date().getMonth() + 1, d || 1)}
        />
      </View>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>เดือน</Text>
        <Chips
          compact
          options={THAI_MONTHS.map((name, i) => ({ value: String(i + 1), label: name }))}
          value={mo ? String(mo) : ''}
          onChange={(v) => emit(y || thisYear, Number(v), d || 1)}
        />
      </View>
      <View style={styles.dateBlock}>
        <Text style={styles.dateBlockLabel}>วัน</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((n) => {
              const on = n === d;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, styles.chipCompact, styles.dayChip, on && styles.chipActive]}
                  onPress={() => emit(y || thisYear, mo || new Date().getMonth() + 1, n)}
                >
                  <Text style={[styles.chipText, on && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Area picker (ตำบล search over the service-area dataset) ───────────────

export type Area = { tambon: string; amphoe: string; province: string; zip: string };

const parseArea = (row: string): Area => {
  const t = row.split('|');
  return { tambon: t[0], amphoe: t[1], province: t[2], zip: t[3] };
};

export function areaLabel(a: Area) {
  if (!a.tambon) return 'ยังไม่ระบุ';
  const bkk = a.province === 'กรุงเทพฯ';
  return `${bkk ? 'แขวง' : 'ต.'}${a.tambon} ${bkk ? a.amphoe : `อ.${a.amphoe}`} จ.${a.province} ${a.zip}`;
}

/** Same list the public booking page and the dashboard use (apps/mobile/src/data/th-areas.ts). */
export function AreaPicker({ value, onPick }: { value: Area; onPick: (a: Area) => void }) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const s = q.trim();
    if (s.length < 1) return [] as Area[];
    return TH_AREAS.filter((x) => x.includes(s)).slice(0, 8).map(parseArea);
  }, [q]);
  return (
    <View style={{ gap: 6 }}>
      <TextInput
        style={styles.input}
        value={q}
        onChangeText={setQ}
        placeholder="📍 พิมพ์ชื่อตำบลเพื่อเปลี่ยนพื้นที่"
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
      />
      {hits.length > 0 ? (
        <View style={styles.hitBox}>
          {hits.map((a) => {
            const bkk = a.province === 'กรุงเทพฯ';
            return (
              <TouchableOpacity key={`${a.tambon}|${a.amphoe}`} style={styles.hit} onPress={() => { onPick(a); setQ(''); }}>
                <Text style={styles.hitMain}>{bkk ? 'แขวง' : 'ต.'}{a.tambon}</Text>
                <Text style={styles.hitSub}> · {bkk ? a.amphoe : `อ.${a.amphoe}`} · จ.{a.province} · {a.zip}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
      <Text style={styles.current}>ปัจจุบัน: {areaLabel(value)}</Text>
    </View>
  );
}

export const formStyles = StyleSheet.create({
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#1e293b',
  },
  fieldHint: { fontSize: 11, color: '#94a3b8' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 13, color: '#334155', fontWeight: '500' },
});

const styles = StyleSheet.create({
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipCompact: { paddingHorizontal: 10, paddingVertical: 5 },
  dayChip: { minWidth: 36, alignItems: 'center' },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  dateBlock: { gap: 4 },
  dateBlockLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  input: formStyles.input,
  hitBox: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  hit: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  hitMain: { fontSize: 12, fontWeight: '700', color: '#334155' },
  hitSub: { fontSize: 12, color: '#94a3b8' },
  current: { fontSize: 11, color: '#64748b' },
});

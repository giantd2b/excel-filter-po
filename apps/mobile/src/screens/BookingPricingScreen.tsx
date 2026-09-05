import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getBookingPricingSettings,
  refreshBookingPricing,
  apiErrorMessage,
  type PricingSettings,
} from '../services/bookings';

const fmt = (n?: number | null) => (n == null ? '-' : Number(n).toLocaleString('th-TH'));

/**
 * Read-only price view — same payload as the dashboard's "ราคาแพ็กเกจ" tab.
 * Prices come from IRIS Quotation products through the recipe mapping; editing the
 * mapping stays a desktop task (dashboard → ตั้งค่าใบเสนอราคา → ผูกสินค้า).
 */
export default function BookingPricingScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<PricingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getBookingPricingSettings());
      setError(null);
    } catch (e: any) {
      setError(apiErrorMessage(e, 'โหลดราคาไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setData(await refreshBookingPricing());
      setError(null);
    } catch (e: any) {
      Alert.alert('รีเฟรชไม่สำเร็จ', apiErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.muted}>กำลังโหลดราคา…</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'โหลดไม่สำเร็จ'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.primaryBtnText}>ลองใหม่</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const p = data.pricing;
  const productsUrl = data.appUrl ? `${data.appUrl.replace(/\/$/, '')}/products` : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#6366f1" />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>ราคาแพ็กเกจ (จาก IRIS Quotation)</Text>
        <Text style={styles.muted}>
          ราคาทั้งหมดคำนวณจากสินค้าใน IRIS Quotation ตามการผูกสินค้า · ราคาขั้น = พิธีสงฆ์ของขั้นนั้น + อาหาร (สูตรต่อหัว / โต๊ะจีน × โต๊ะ)
        </Text>
        <Text style={styles.source}>
          แหล่งข้อมูล: {data.source === 'flowaccount' ? 'IRIS Quotation (สด)' : 'สำเนาล่าสุดที่เก็บไว้'}
          {data.fetchedAt ? ` · ดึงเมื่อ ${new Date(data.fetchedAt).toLocaleString('th-TH')}` : ''}
        </Text>
        <View style={styles.rowWrap}>
          <TouchableOpacity style={[styles.primaryBtn, refreshing && { opacity: 0.5 }]} onPress={refresh} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryBtnText}>↻ รีเฟรชจาก IRIS Quotation</Text>}
          </TouchableOpacity>
          {productsUrl ? (
            <TouchableOpacity style={styles.ghostBtn} onPress={() => Linking.openURL(productsUrl).catch(() => {})}>
              <Text style={styles.ghostBtnText}>หน้าสินค้า ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.hint}>แก้การผูกสินค้า/remark template ได้ที่ dashboard → จองงานบุญ → ตั้งค่าใบเสนอราคา</Text>
      </View>

      {data.catalogError ? (
        <View style={[styles.banner, styles.bannerAmber]}>
          <Text style={[styles.bannerText, { color: '#b45309' }]}>⚠️ ดึงจาก IRIS Quotation ไม่ได้ ({data.catalogError}) — แสดงจากสำเนาล่าสุด</Text>
        </View>
      ) : null}
      {data.missingCodes.length > 0 ? (
        <View style={[styles.banner, styles.bannerRed]}>
          <Text style={[styles.bannerText, { color: '#b91c1c' }]}>
            ⚠️ ไม่พบสินค้าใน IRIS Quotation: {data.missingCodes.join(', ')} — ขั้นที่ใช้สินค้าเหล่านี้จะแสดงราคาสำรองจากโค้ด
          </Text>
        </View>
      ) : null}

      {data.packages.map((pkg) => {
        const pp = p.packages[pkg.id];
        const used = data.usedCodes[pkg.id];
        if (!pp) return null;
        return (
          <View key={pkg.id} style={styles.card}>
            <Text style={styles.pkgName}>{pkg.name}</Text>
            <Text style={styles.code}>{pkg.id}</Text>
            {pkg.kind === 'ceremony' ? (
              <View style={styles.line}>
                <Text style={styles.lineKey}>ราคาแพ็กเกจ{used?.base ? <Text style={styles.code}>  {used.base}</Text> : null}</Text>
                <Text style={styles.lineVal}>{fmt(pp.base)} บาท</Text>
              </View>
            ) : (
              (['buffet', 'table'] as const).map((mode) => {
                const cfg = pp[mode];
                const unit = mode === 'buffet' ? 'คน' : 'โต๊ะ';
                return (
                  <View key={mode} style={styles.tierBox}>
                    <Text style={styles.tierTitle}>{mode === 'buffet' ? 'บุฟเฟต์ (ตามจำนวนแขก)' : 'โต๊ะจีน (ตามจำนวนโต๊ะ)'}</Text>
                    {cfg ? (
                      <>
                        {cfg.tiers.map(([count, price]) => (
                          <View key={count} style={styles.line}>
                            <Text style={styles.lineKey}>
                              {count} {unit}
                              {used?.[mode]?.[count] ? <Text style={styles.code}>  {used[mode]![count]}</Text> : null}
                            </Text>
                            <Text style={styles.lineVal}>{fmt(price)}</Text>
                          </View>
                        ))}
                        <View style={styles.line}>
                          <Text style={[styles.lineKey, styles.muted]}>เพิ่มต่อ 1 {unit} เมื่อเกินขั้น</Text>
                          <Text style={[styles.lineVal, styles.muted]}>{fmt(cfg.extra)}</Text>
                        </View>
                      </>
                    ) : (
                      <Text style={[styles.muted, { fontStyle: 'italic' }]}>ไม่มีราคา (ยังไม่ได้ผูกสินค้า)</Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.pkgName}>ออปชั่นเสริม</Text>
        {data.addons.map((a) => (
          <View key={a.id} style={styles.line}>
            <Text style={styles.lineKey}>
              {a.label}
              {a.code ? <Text style={styles.code}>  {a.code}</Text> : null}
            </Text>
            <Text style={styles.lineVal}>{fmt(p.addons[a.id])}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.pkgName}>ค่าเดินทางตามอำเภอของสถานที่จัดงาน</Text>
        {Object.keys(data.travelFees).length === 0 ? (
          <Text style={[styles.muted, { fontStyle: 'italic' }]}>ยังไม่ได้ตั้งค่า</Text>
        ) : (
          Object.entries(data.travelFees)
            .sort((a, b) => a[0].localeCompare(b[0], 'th'))
            .map(([area, fee]) => (
              <View key={area} style={styles.line}>
                <Text style={styles.lineKey}>{area}</Text>
                <Text style={styles.lineVal}>+{fmt(fee)}</Text>
              </View>
            ))
        )}
        <Text style={styles.hint}>บวกเข้าราคาประเมินและเป็นรายการในใบเสนอราคา · แก้ได้ที่ dashboard → ตั้งค่าใบเสนอราคา → ค่าเดินทาง</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.pkgName}>ส่วนลด (จากสินค้าพิธีสงฆ์)</Text>
        <View style={styles.line}>
          <Text style={styles.lineKey}>นิมนต์และรับ-ส่งพระเอง</Text>
          <Text style={styles.lineVal}>−{fmt(p.selfTransportDiscount)}</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.lineKey}>พระ 5 รูป (ราคาฐาน 9 รูป − 5 รูป)</Text>
          <Text style={styles.lineVal}>−{fmt(p.fiveMonksDiscount)}</Text>
        </View>
        <Text style={styles.hint}>ตัวเลขที่หน้า /booking แสดง ใช้ค่านี้ ส่วนใบเสนอราคาจริงใช้ส่วนลดของสินค้าแต่ละตัวโดยตรง</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#f8fafc' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  muted: { fontSize: 12, color: '#64748b', lineHeight: 17 },
  source: { fontSize: 11, color: '#94a3b8' },
  hint: { fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 15 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  primaryBtn: { backgroundColor: '#6366f1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  ghostBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#f1f5f9' },
  ghostBtnText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  banner: { borderRadius: 10, padding: 10 },
  bannerAmber: { backgroundColor: '#fffbeb' },
  bannerRed: { backgroundColor: '#fef2f2' },
  bannerText: { fontSize: 12, lineHeight: 17 },
  errorText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },
  pkgName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  code: { fontSize: 10, color: '#94a3b8', fontFamily: undefined },
  tierBox: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 10, marginTop: 4, gap: 2 },
  tierTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 4 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 3, gap: 8 },
  lineKey: { fontSize: 13, color: '#475569', flex: 1 },
  lineVal: { fontSize: 13, fontWeight: '700', color: '#1e293b', fontVariant: ['tabular-nums'] },
});

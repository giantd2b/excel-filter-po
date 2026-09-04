import { pkgById } from '../data/packages';
import type { BookingForm } from './calc';

export interface BookingResult {
  code: string;
  estimatedTotal: number;
  packageName: string;
}

export async function submitBooking(f: BookingForm): Promise<BookingResult> {
  const body = {
    occasion: f.occasion,
    eventDate: f.date,
    timeSlot: f.time,
    tambon: f.tambon || undefined,
    amphoe: f.amphoe || undefined,
    province: f.province || undefined,
    zip: f.zip || undefined,
    venue: f.venue || undefined,
    packageId: f.pkg,
    foodMode: f.foodMode,
    guests: f.guests,
    tables: f.tables,
    monks: f.monks,
    selfTransport: f.selfTransport,
    addons: f.addons,
    budget: f.budget || undefined,
    name: f.name,
    phone: f.phone,
    note: f.note || undefined,
  };
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = 'ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    try {
      const j = await res.json();
      if (j?.message) msg = Array.isArray(j.message) ? j.message[0] : j.message;
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
  const data = await res.json();
  return { ...data, packageName: data.packageName || pkgById(f.pkg).name };
}

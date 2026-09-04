import { applyPricing, type PricingPayload } from '../data/packages';

/**
 * Load the live prices (edited in the CRM dashboard) and apply them over the
 * bundled defaults. Resolves to true when live prices were applied; on any
 * failure the defaults stay in place so the page still works.
 */
export async function loadPricing(): Promise<boolean> {
  try {
    const res = await fetch('/api/bookings/pricing', { headers: { Accept: 'application/json' } });
    if (!res.ok) return false;
    const data = (await res.json()) as PricingPayload;
    applyPricing(data);
    return true;
  } catch {
    return false;
  }
}

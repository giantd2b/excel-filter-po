/**
 * Thai phone number detection utilities
 *
 * Supports:
 *   Mobile: 06x, 08x, 09x (10 digits)
 *   Landline: 02x (Bangkok), 03x-07x (provinces) (9 digits)
 *   Formats: 0812345678, 081-234-5678, 081 234 5678, 081.234.5678
 */

const THAI_PHONE_REGEX = /(?<!\d)0[2-9][\d][\s.\-]?[\d]{3}[\s.\-]?[\d]{3,4}(?!\d)/g;

function cleanPhone(raw) {
  return raw.replace(/[\s.\-()]/g, "");
}

function isValidThaiPhone(digits) {
  if (/^0[689]\d{8}$/.test(digits)) return true;
  if (/^02\d{7}$/.test(digits)) return true;
  if (/^0[3-7]\d{7}$/.test(digits)) return true;
  return false;
}

function findThaiPhones(text) {
  if (!text) return [];
  const matches = text.match(THAI_PHONE_REGEX) || [];
  const phones = [];
  for (const raw of matches) {
    const digits = cleanPhone(raw);
    if (isValidThaiPhone(digits)) {
      phones.push(digits);
    }
  }
  return [...new Set(phones)];
}

function formatThaiPhone(digits) {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

module.exports = { findThaiPhones, formatThaiPhone };

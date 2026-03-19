const THAI_PHONE_REGEX =
  /(?<!\d)0[2-9][\d][\s.\-]?[\d]{3}[\s.\-]?[\d]{3,4}(?!\d)/g;

function cleanPhone(raw: string): string {
  return raw.replace(/[\s.\-()]/g, '');
}

function isValidThaiPhone(digits: string): boolean {
  if (/^0[689]\d{8}$/.test(digits)) return true;
  if (/^02\d{7}$/.test(digits)) return true;
  if (/^0[3-7]\d{7}$/.test(digits)) return true;
  return false;
}

export function findThaiPhones(text: string): string[] {
  if (!text) return [];
  const matches = text.match(THAI_PHONE_REGEX) || [];
  const phones: string[] = [];
  for (const raw of matches) {
    const digits = cleanPhone(raw);
    if (isValidThaiPhone(digits)) {
      phones.push(digits);
    }
  }
  return [...new Set(phones)];
}

export function formatThaiPhone(digits: string): string {
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return digits;
}

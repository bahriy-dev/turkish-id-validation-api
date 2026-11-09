import type { ValidationResult } from '../types.ts';

export type PhoneType = 'mobile' | 'landline' | 'toll-free' | 'virtual' | 'call-center';

/**
 * Normalizes any common way of writing a Turkish phone number
 * ("0532 123 45 67", "+90 (532) 123-4567", "00905321234567") to E.164.
 */
export function validatePhone(input: string): ValidationResult {
  const raw = String(input ?? '');
  let digits = raw.replace(/[^\d+]/g, '');

  if (digits.startsWith('+90')) digits = digits.slice(3);
  else if (digits.startsWith('0090')) digits = digits.slice(4);
  else if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  if (digits.includes('+')) return { valid: false, value: raw, reason: 'Only Turkish (+90) numbers are supported' };

  // 444 XX XX call-center numbers have 7 digits and no area code.
  if (/^444\d{4}$/.test(digits)) {
    return {
      valid: true,
      value: digits,
      details: { type: 'call-center' satisfies PhoneType, e164: null, national: `444 ${digits.slice(3, 5)} ${digits.slice(5)}` },
    };
  }

  if (!/^\d{10}$/.test(digits)) {
    return { valid: false, value: digits, reason: 'Expected 10 digits after the country code' };
  }

  const type = phoneType(digits);
  if (!type) return { valid: false, value: digits, reason: `Unknown prefix ${digits.slice(0, 3)}` };

  return {
    valid: true,
    value: digits,
    details: {
      type,
      e164: `+90${digits}`,
      national: `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`,
    },
  };
}

function phoneType(d: string): PhoneType | null {
  if (d.startsWith('5')) return 'mobile';
  if (/^[234]/.test(d)) return 'landline';
  if (d.startsWith('800')) return 'toll-free';
  if (d.startsWith('850')) return 'virtual';
  return null;
}

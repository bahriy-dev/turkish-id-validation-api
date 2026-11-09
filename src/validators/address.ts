import type { ValidationResult } from '../types.ts';
import { provinceByCode } from './provinces.ts';

/**
 * Civilian vehicle plate: province code (01–81) + 1–3 letters + 2–4 digits.
 *  - 1 letter  → 4 digits   (34 A 1234)
 *  - 2 letters → 3–4 digits (06 AB 123, 06 AB 1234)
 *  - 3 letters → 2–3 digits (35 ABC 12, 35 ABC 123)
 * Turkish-specific letters (Ç Ğ İ Ö Ş Ü) and Q W X are not used on plates.
 */
const PLATE_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVYZ';

export function validatePlate(input: string): ValidationResult {
  const value = String(input ?? '').replace(/[\s-]+/g, '').toLocaleUpperCase('tr-TR');
  const match = /^(\d{2})([A-ZÇĞİÖŞÜ]{1,3})(\d{2,4})$/.exec(value);
  if (!match) return { valid: false, value, reason: 'Expected format: 34 ABC 123' };

  const [, code, letters, digits] = match;
  const province = provinceByCode(code);
  if (!province) return { valid: false, value, reason: `Unknown province code ${code}` };

  if ([...letters].some((c) => !PLATE_LETTERS.includes(c))) {
    return { valid: false, value, reason: 'Plates cannot contain Ç, Ğ, İ, Ö, Ş, Ü, Q, W or X' };
  }

  const allowed: Record<number, number[]> = { 1: [4], 2: [3, 4], 3: [2, 3] };
  if (!allowed[letters.length].includes(digits.length)) {
    return { valid: false, value, reason: `${letters.length} letter(s) cannot be followed by ${digits.length} digits` };
  }

  return {
    valid: true,
    value,
    details: { formatted: `${code} ${letters} ${digits}`, province: province.name },
  };
}

/** 5-digit postal code. The first two digits are the province plate code. */
export function validatePostalCode(input: string): ValidationResult {
  const value = String(input ?? '').trim();
  if (!/^\d{5}$/.test(value)) return { valid: false, value, reason: 'Postal code must be 5 digits' };
  const province = provinceByCode(value.slice(0, 2));
  if (!province) return { valid: false, value, reason: 'First two digits must be a province code (01–81)' };
  return { valid: true, value, details: { province: province.name, provinceCode: province.code } };
}

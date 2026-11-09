import type { ValidationResult } from '../types.ts';

/**
 * Vergi Kimlik Numarası (Turkish tax ID, 10 digits) checksum validation,
 * using the algorithm published by Gelir İdaresi Başkanlığı (GİB).
 */
export function validateVkn(input: string): ValidationResult {
  const value = String(input ?? '').replace(/\s+/g, '');

  if (!/^\d{10}$/.test(value)) {
    return { valid: false, value, reason: 'VKN must be exactly 10 digits' };
  }

  const expected = vknCheckDigit(value.slice(0, 9));
  if (Number(value[9]) !== expected) {
    return { valid: false, value, reason: 'Checksum digit does not match' };
  }
  return { valid: true, value };
}

export function vknCheckDigit(first9: string): number {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const t = (Number(first9[i]) + 9 - i) % 10;
    let v = (t * 2 ** (9 - i)) % 9;
    if (t !== 0 && v === 0) v = 9;
    sum += v;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Accepts either a TCKN (individuals) or a VKN (companies), which is what
 * Turkish invoices (e-Fatura / e-Arşiv) ask for.
 */
export function detectTaxIdKind(value: string): 'tckn' | 'vkn' | null {
  const v = value.replace(/\s+/g, '');
  if (/^\d{11}$/.test(v)) return 'tckn';
  if (/^\d{10}$/.test(v)) return 'vkn';
  return null;
}

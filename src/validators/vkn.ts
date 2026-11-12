import type { ValidationResult } from '../types.ts';
import { validateTckn } from './tckn.ts';

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

/**
 * Validates the "VKN / TCKN" field of an invoice: 10 digits means a company tax number,
 * 11 digits means an individual's national ID (sole proprietors and e-Arşiv invoices use it).
 */
export function validateTaxId(input: string): ValidationResult {
  const value = String(input ?? '').replace(/\s+/g, '');
  const kind = detectTaxIdKind(value);
  if (!kind) return { valid: false, value, reason: 'Tax ID must be a 10-digit VKN or an 11-digit TCKN' };
  const result = kind === 'vkn' ? validateVkn(value) : validateTckn(value);
  return result.valid
    ? { ...result, details: { kind, holder: kind === 'vkn' ? 'company' : 'individual' } }
    : { ...result, details: { kind } };
}

import type { ValidationResult } from '../types.ts';

/**
 * T.C. Kimlik Numarası (Turkish national ID) checksum validation.
 *
 * Rules:
 *  - exactly 11 digits, first digit is not 0
 *  - d10 = ((d1 + d3 + d5 + d7 + d9) * 7 - (d2 + d4 + d6 + d8)) mod 10
 *  - d11 = (d1 + ... + d10) mod 10
 *
 * Passing the checksum does not prove the number belongs to a real person;
 * that needs the official NVI (MERNIS) KPS service.
 */
export function validateTckn(input: string): ValidationResult {
  const value = String(input ?? '').replace(/\s+/g, '');

  if (!/^\d{11}$/.test(value)) {
    return { valid: false, value, reason: 'TCKN must be exactly 11 digits' };
  }
  if (value[0] === '0') {
    return { valid: false, value, reason: 'TCKN cannot start with 0' };
  }

  const d = [...value].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;

  if (d[9] !== d10 || d[10] !== d11) {
    return { valid: false, value, reason: 'Checksum digits do not match' };
  }
  return { valid: true, value };
}

/** Builds a checksum-valid TCKN from a 9-digit prefix. Useful for test fixtures. */
export function completeTckn(prefix: string): string {
  if (!/^[1-9]\d{8}$/.test(prefix)) throw new Error('Prefix must be 9 digits, not starting with 0');
  const d = [...prefix].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = (d.reduce((a, b) => a + b, 0) + d10) % 10;
  return `${prefix}${d10}${d11}`;
}

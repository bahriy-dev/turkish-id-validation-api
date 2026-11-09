import type { ValidationResult } from '../types.ts';

/**
 * Bank codes (EFT / BDDK codes) embedded in Turkish IBANs.
 * Not exhaustive: unknown codes still validate, they just have no `bank` name.
 */
export const TR_BANKS: Readonly<Record<string, string>> = {
  '00010': 'T.C. Ziraat Bankası',
  '00012': 'Türkiye Halk Bankası',
  '00015': 'Türkiye Vakıflar Bankası',
  '00032': 'Türk Ekonomi Bankası',
  '00046': 'Akbank',
  '00059': 'Şekerbank',
  '00062': 'Türkiye Garanti Bankası',
  '00064': 'Türkiye İş Bankası',
  '00067': 'Yapı ve Kredi Bankası',
  '00099': 'ING Bank',
  '00103': 'Fibabanka',
  '00111': 'QNB Bank',
  '00123': 'HSBC Bank',
  '00124': 'Alternatif Bank',
  '00134': 'DenizBank',
  '00135': 'Anadolubank',
  '00146': 'Odea Bank',
  '00203': 'Albaraka Türk Katılım Bankası',
  '00205': 'Kuveyt Türk Katılım Bankası',
  '00206': 'Türkiye Finans Katılım Bankası',
  '00209': 'Ziraat Katılım Bankası',
  '00210': 'Vakıf Katılım Bankası',
};

/** ISO 13616 mod-97 check, done in chunks so it never overflows a JS number. */
export function mod97(iban: string): number {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    remainder = Number(String(remainder) + numeric.slice(i, i + 7)) % 97;
  }
  return remainder;
}

/** Turkish IBAN: TR + 2 check digits + 5-digit bank code + reserve digit (0) + 16-digit account. */
export function validateIban(input: string): ValidationResult {
  const value = String(input ?? '').replace(/[\s-]+/g, '').toUpperCase();

  if (!value.startsWith('TR')) {
    return { valid: false, value, reason: 'Only Turkish (TR) IBANs are supported' };
  }
  if (value.length !== 26) {
    return { valid: false, value, reason: 'A Turkish IBAN is 26 characters long' };
  }
  if (!/^TR\d{24}$/.test(value)) {
    return { valid: false, value, reason: 'Characters after TR must be digits' };
  }
  if (value[9] !== '0') {
    return { valid: false, value, reason: 'Reserve digit (position 10) must be 0' };
  }
  if (mod97(value) !== 1) {
    return { valid: false, value, reason: 'IBAN check digits are wrong' };
  }

  const bankCode = value.slice(4, 9);
  return {
    valid: true,
    value,
    details: {
      formatted: value.replace(/(.{4})/g, '$1 ').trim(),
      bankCode,
      bank: TR_BANKS[bankCode] ?? null,
      account: value.slice(10),
    },
  };
}

/** Computes the two IBAN check digits for a TR IBAN body (bank code + reserve + account). */
export function ibanCheckDigits(body22: string): string {
  if (!/^\d{22}$/.test(body22)) throw new Error('Body must be 22 digits');
  const remainder = mod97(`TR00${body22}`);
  return String(98 - remainder).padStart(2, '0');
}

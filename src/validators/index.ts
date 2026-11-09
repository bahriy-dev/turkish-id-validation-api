import type { ValidationResult } from '../types.ts';
import { validateTckn } from './tckn.ts';
import { validateVkn } from './vkn.ts';
import { validateIban } from './iban.ts';
import { validatePhone } from './phone.ts';
import { validatePlate, validatePostalCode } from './address.ts';

export const VALIDATORS = {
  tckn: validateTckn,
  vkn: validateVkn,
  iban: validateIban,
  phone: validatePhone,
  plate: validatePlate,
  'postal-code': validatePostalCode,
} as const satisfies Record<string, (v: string) => ValidationResult>;

export type ValidatorType = keyof typeof VALIDATORS;

export function isValidatorType(t: unknown): t is ValidatorType {
  return typeof t === 'string' && Object.hasOwn(VALIDATORS, t);
}

export { validateTckn, completeTckn } from './tckn.ts';
export { validateVkn, vknCheckDigit } from './vkn.ts';
export { validateIban, ibanCheckDigits, TR_BANKS } from './iban.ts';
export { validatePhone } from './phone.ts';
export { validatePlate, validatePostalCode } from './address.ts';
export { listProvinces, provinceByCode } from './provinces.ts';

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTckn, completeTckn, validateVkn, vknCheckDigit, validateTaxId, validateIban, ibanCheckDigits,
  validatePhone, validatePlate, validatePostalCode, listProvinces, provinceByCode,
} from '../src/validators/index.ts';

describe('TCKN', () => {
  it('accepts the well-known test number', () => assert.equal(validateTckn('10000000146').valid, true));
  it('ignores whitespace', () => assert.equal(validateTckn(' 100 000 001 46 ').valid, true));
  it('rejects a wrong checksum', () => assert.equal(validateTckn('10000000147').valid, false));
  it('rejects a leading zero', () => assert.match(validateTckn('01234567890').reason!, /cannot start with 0/));
  it('rejects wrong length', () => assert.equal(validateTckn('123').valid, false));
  it('completeTckn always produces valid numbers', () => {
    for (let i = 0; i < 500; i++) {
      const prefix = String(100_000_000 + Math.floor(Math.random() * 899_999_999));
      assert.equal(validateTckn(completeTckn(prefix)).valid, true, prefix);
    }
  });
});

describe('VKN', () => {
  it('accepts a valid tax number', () => assert.equal(validateVkn('1234567890').valid, true));
  it('rejects a wrong check digit', () => assert.equal(validateVkn('1234567891').valid, false));
  it('rejects non-digits', () => assert.equal(validateVkn('12345abcde').valid, false));
  it('check digit is always 0-9', () => {
    for (let i = 0; i < 500; i++) {
      const d = vknCheckDigit(String(Math.floor(Math.random() * 1e9)).padStart(9, '0'));
      assert.ok(d >= 0 && d <= 9);
    }
  });
});

describe('Tax ID (VKN or TCKN)', () => {
  it('accepts a VKN as a company', () => {
    const r = validateTaxId('1234567890');
    assert.equal(r.valid, true);
    assert.deepEqual(r.details, { kind: 'vkn', holder: 'company' });
  });
  it('accepts a TCKN as an individual', () => {
    assert.deepEqual(validateTaxId('10000000146').details, { kind: 'tckn', holder: 'individual' });
  });
  it('reports which check failed', () => {
    const r = validateTaxId('10000000147');
    assert.equal(r.valid, false);
    assert.equal(r.details?.kind, 'tckn');
  });
  it('rejects other lengths', () => assert.match(validateTaxId('123').reason!, /10-digit VKN or an 11-digit TCKN/));
});

describe('IBAN', () => {
  it('accepts a valid TR IBAN with spaces', () => {
    const r = validateIban('TR33 0006 1005 1978 6457 8413 26');
    assert.equal(r.valid, true);
    assert.equal(r.details?.formatted, 'TR33 0006 1005 1978 6457 8413 26');
  });
  it('resolves the bank name', () => {
    const body = '00062' + '0' + '1234567890123456';
    const r = validateIban(`TR${ibanCheckDigits(body)}${body}`);
    assert.equal(r.valid, true);
    assert.equal(r.details?.bank, 'Türkiye Garanti Bankası');
  });
  it('rejects wrong check digits', () => assert.equal(validateIban('TR340006100519786457841326').valid, false));
  it('rejects foreign IBANs', () => assert.match(validateIban('DE89370400440532013000').reason!, /TR/));
  it('rejects a non-zero reserve digit', () => {
    const body = '00062' + '1' + '1234567890123456';
    assert.match(validateIban(`TR${ibanCheckDigits(body)}${body}`).reason!, /Reserve digit/);
  });
});

describe('Phone', () => {
  for (const input of ['05321234567', '+90 532 123 45 67', '0090 (532) 123-4567', '532 123 4567']) {
    it(`normalizes "${input}"`, () => {
      const r = validatePhone(input);
      assert.equal(r.valid, true);
      assert.equal(r.details?.e164, '+905321234567');
      assert.equal(r.details?.type, 'mobile');
    });
  }
  it('detects landlines', () => assert.equal(validatePhone('0212 123 45 67').details?.type, 'landline'));
  it('detects 444 numbers', () => assert.equal(validatePhone('444 1 234').details?.type, 'call-center'));
  it('rejects foreign numbers', () => assert.equal(validatePhone('+44 20 7946 0958').valid, false));
  it('rejects short numbers', () => assert.equal(validatePhone('0532 123').valid, false));
});

describe('Plate', () => {
  it('accepts 34 ABC 123', () => {
    const r = validatePlate('34 abc 123');
    assert.equal(r.valid, true);
    assert.equal(r.details?.province, 'İstanbul');
  });
  it('accepts 06 A 1234', () => assert.equal(validatePlate('06A1234').valid, true));
  it('rejects 1 letter + 3 digits', () => assert.equal(validatePlate('06 A 123').valid, false));
  it('rejects province 82', () => assert.equal(validatePlate('82 AB 123').valid, false));
  it('rejects Turkish letters', () => assert.equal(validatePlate('35 ÇA 123').valid, false));
});

describe('Postal code & provinces', () => {
  it('maps the postal code to its province', () => assert.equal(validatePostalCode('35210').details?.province, 'İzmir'));
  it('rejects 00xxx', () => assert.equal(validatePostalCode('00123').valid, false));
  it('has 81 provinces', () => assert.equal(listProvinces().length, 81));
  it('looks up by code', () => {
    assert.deepEqual(provinceByCode('06'), { code: '06', name: 'Ankara' });
    assert.deepEqual(provinceByCode(81), { code: '81', name: 'Düzce' });
    assert.equal(provinceByCode(0), null);
  });
});

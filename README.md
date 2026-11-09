# Turkish ID Validation API

[![CI](https://github.com/bahriy-dev/turkish-id-validation-api/actions/workflows/ci.yml/badge.svg)](https://github.com/bahriy-dev/turkish-id-validation-api/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A522.18-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539?logo=openapiinitiative&logoColor=white)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A small REST web service that validates the Turkish identifiers an e-commerce checkout or an
invoicing flow (e-Fatura / e-Arşiv) has to deal with. Every response tells you **whether** a value
is valid, **why** it isn't, and returns a **normalized** version you can store.

Zero runtime dependencies: plain `node:http`, written in TypeScript and run directly by Node's
built-in type stripping.

| Type | Checks | Extra details on success |
| --- | --- | --- |
| `tckn` | T.C. Kimlik No checksum (11 digits) | — |
| `vkn` | Vergi Kimlik No checksum (10 digits, GİB algorithm) | — |
| `iban` | TR format, reserve digit, ISO 13616 mod-97 | bank code, bank name, grouped format |
| `phone` | `+90`, `0090`, `0…` and free-form input | E.164, national format, mobile / landline / 444 / 850 |
| `plate` | province 01–81, letter/digit rules | formatted plate, province |
| `postal-code` | 5 digits, province prefix | province |

> A passing TCKN/VKN checksum does not prove that the person or company exists. That needs the
> official NVI / GİB services. This API catches typos before they reach them.

## Quick start

```bash
git clone https://github.com/bahriy-dev/turkish-id-validation-api.git
cd turkish-id-validation-api
npm start          # http://localhost:3000
npm test           # node:test, 43 tests
```

Or with Docker:

```bash
docker build -t tr-validator-api .
docker run -p 3000:3000 tr-validator-api
```

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/{type}/{value}` | Validate one value |
| `POST` | `/v1/validate` | Validate up to 100 values at once |
| `GET` | `/v1/provinces` | 81 provinces with plate codes |
| `GET` | `/v1/provinces/{code}` | One province |
| `GET` | `/v1/banks` | Known bank codes inside TR IBANs |
| `GET` | `/openapi.json` | OpenAPI 3.1 document (import into Swagger UI, Postman, Insomnia) |
| `GET` | `/health` | Health check |

### Examples

```bash
curl localhost:3000/v1/iban/TR330006100519786457841326
```

```json
{
  "type": "iban",
  "valid": true,
  "value": "TR330006100519786457841326",
  "details": {
    "formatted": "TR33 0006 1005 1978 6457 8413 26",
    "bankCode": "00061",
    "bank": null,
    "account": "0519786457841326"
  }
}
```

```bash
curl -X POST localhost:3000/v1/validate \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"type":"tckn","value":"10000000146"},{"type":"phone","value":"0532 123 45 67"}]}'
```

```json
{
  "count": 2,
  "validCount": 2,
  "results": [
    { "index": 0, "type": "tckn", "valid": true, "value": "10000000146" },
    { "index": 1, "type": "phone", "valid": true, "value": "5321234567",
      "details": { "type": "mobile", "e164": "+905321234567", "national": "0532 123 45 67" } }
  ]
}
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `RATE_LIMIT_PER_MINUTE` | `120` | Requests per IP per minute, `0` disables. Sends `RateLimit-*` headers. |

## Using the validators as a library

The validators are plain functions with no I/O, so you can import them straight into a
Next.js form or a server action:

```ts
import { validateIban, validatePhone } from './src/validators/index.ts';

validatePhone('+90 (532) 123-4567').details?.e164; // '+905321234567'
```

## Project layout

```
src/
  validators/   pure validation functions (tckn, vkn, iban, phone, plate, postal code)
  app.ts        request handler: routing, JSON body parsing, CORS, rate limiting
  openapi.ts    OpenAPI 3.1 document
  server.ts     entry point
test/           node:test unit + HTTP tests
```

## License

MIT © [Bahri YILMAZ](https://bahriyilmaz.dev)

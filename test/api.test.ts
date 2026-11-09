import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHandler } from '../src/app.ts';

let server: Server;
let base: string;

before(async () => {
  server = createServer(createHandler({ rateLimit: 0, maxBatch: 3 }));
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const post = (body: unknown) =>
  fetch(`${base}/v1/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('HTTP API', () => {
  it('GET /health', async () => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });

  it('GET /v1/tckn/:value', async () => {
    const body = await (await fetch(`${base}/v1/tckn/10000000146`)).json();
    assert.equal(body.type, 'tckn');
    assert.equal(body.valid, true);
  });

  it('GET /v1/iban/:value with encoded spaces', async () => {
    const body = await (await fetch(`${base}/v1/iban/${encodeURIComponent('TR33 0006 1005 1978 6457 8413 26')}`)).json();
    assert.equal(body.valid, true);
  });

  it('GET /v1/provinces/34', async () => {
    assert.deepEqual(await (await fetch(`${base}/v1/provinces/34`)).json(), { code: '34', name: 'İstanbul' });
  });

  it('GET /v1/provinces/99 → 404', async () => {
    assert.equal((await fetch(`${base}/v1/provinces/99`)).status, 404);
  });

  it('POST /v1/validate handles a batch', async () => {
    const res = await post({ items: [{ type: 'vkn', value: '1234567890' }, { type: 'phone', value: '123' }, { type: 'nope', value: 'x' }] });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.count, 3);
    assert.equal(body.validCount, 1);
    assert.match(body.results[2].reason, /Unknown type/);
  });

  it('POST /v1/validate enforces the batch limit', async () => {
    const res = await post({ items: Array.from({ length: 4 }, () => ({ type: 'tckn', value: '1' })) });
    assert.equal(res.status, 413);
  });

  it('POST /v1/validate rejects invalid JSON', async () => {
    const res = await fetch(`${base}/v1/validate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(res.status, 400);
  });

  it('serves the OpenAPI document', async () => {
    const doc = await (await fetch(`${base}/openapi.json`)).json();
    assert.equal(doc.openapi, '3.1.0');
    assert.ok(doc.paths['/v1/validate']);
  });

  it('returns 404 for unknown routes', async () => {
    assert.equal((await fetch(`${base}/nope`)).status, 404);
  });
});

describe('Rate limiting', () => {
  it('returns 429 after the limit', async () => {
    const limited = createServer(createHandler({ rateLimit: 2 }));
    await new Promise<void>((r) => limited.listen(0, r));
    const url = `http://127.0.0.1:${(limited.address() as AddressInfo).port}/health`;
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await fetch(url)).status);
    limited.close();
    assert.deepEqual(statuses, [200, 200, 429]);
  });
});

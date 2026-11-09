import type { IncomingMessage, ServerResponse } from 'node:http';
import { VALIDATORS, isValidatorType, listProvinces, provinceByCode, TR_BANKS } from './validators/index.ts';
import { RateLimiter } from './rate-limit.ts';
import { openApiDocument } from './openapi.ts';

export interface AppOptions {
  /** Requests per minute per IP. 0 disables rate limiting. */
  rateLimit?: number;
  /** Max items accepted by POST /v1/validate. */
  maxBatch?: number;
}

const MAX_BODY_BYTES = 64 * 1024;

export function createHandler(options: AppOptions = {}) {
  const maxBatch = options.maxBatch ?? 100;
  const limiter = options.rateLimit ? new RateLimiter(options.rateLimit, 60_000) : null;

  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'OPTIONS') return void res.writeHead(204).end();

    if (limiter) {
      const ip = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0].trim();
      const r = limiter.take(ip);
      res.setHeader('RateLimit-Limit', String(options.rateLimit));
      res.setHeader('RateLimit-Remaining', String(r.remaining));
      res.setHeader('RateLimit-Reset', String(Math.ceil((r.resetAt - Date.now()) / 1000)));
      if (!r.allowed) return send(res, 429, { error: 'Too many requests' });
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);

    try {
      if (req.method === 'GET') {
        if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
        if (url.pathname === '/openapi.json') return send(res, 200, openApiDocument);

        if (parts[0] === 'v1') {
          if (parts[1] === 'provinces' && parts.length === 2) return send(res, 200, listProvinces());
          if (parts[1] === 'provinces' && parts.length === 3) {
            const p = provinceByCode(parts[2]);
            return p ? send(res, 200, p) : send(res, 404, { error: 'Province not found' });
          }
          if (parts[1] === 'banks' && parts.length === 2) {
            return send(res, 200, Object.entries(TR_BANKS).map(([code, name]) => ({ code, name })));
          }
          if (parts.length === 3 && isValidatorType(parts[1])) {
            return send(res, 200, { type: parts[1], ...VALIDATORS[parts[1]](parts[2]) });
          }
        }
      }

      if (req.method === 'POST' && url.pathname === '/v1/validate') {
        const body = await readJson(req);
        const items = (body as { items?: unknown })?.items;
        if (!Array.isArray(items)) return send(res, 400, { error: 'Body must be { "items": [{ "type", "value" }] }' });
        if (items.length > maxBatch) return send(res, 413, { error: `At most ${maxBatch} items per request` });

        const results = items.map((item, index) => {
          const { type, value } = (item ?? {}) as { type?: unknown; value?: unknown };
          if (!isValidatorType(type)) return { index, type, valid: false, reason: `Unknown type. Use one of: ${Object.keys(VALIDATORS).join(', ')}` };
          return { index, type, ...VALIDATORS[type](String(value ?? '')) };
        });
        return send(res, 200, { count: results.length, validCount: results.filter((r) => r.valid).length, results });
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      return send(res, 500, { error: 'Internal server error' });
    }
  };
}

class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  if (!String(req.headers['content-type'] ?? '').includes('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, 'Body too large');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

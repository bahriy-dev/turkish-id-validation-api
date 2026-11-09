/**
 * Fixed-window, in-memory rate limiter keyed by client IP.
 * Good enough for a single instance; put Redis behind it to scale out.
 */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  take(key: string, now = Date.now()): { allowed: boolean; remaining: number; resetAt: number } {
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count++;
    if (this.hits.size > 10_000) this.sweep(now);
    return {
      allowed: entry.count <= this.limit,
      remaining: Math.max(0, this.limit - entry.count),
      resetAt: entry.resetAt,
    };
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key);
  }
}

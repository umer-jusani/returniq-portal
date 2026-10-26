type Bucket = { count: number; resetAt: number };

const globalForLimit = globalThis as unknown as {
  __riqLimit?: Map<string, Bucket>;
};

const buckets = globalForLimit.__riqLimit ?? new Map<string, Bucket>();
globalForLimit.__riqLimit = buckets;

export function rateLimit(key: string, limit = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: current.resetAt - now };
  }
  current.count += 1;
  return { ok: true, remaining: limit - current.count };
}

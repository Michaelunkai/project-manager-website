const buckets = new Map<string, number[]>();

export function checkRateLimit(identifier: string, maxRequests: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(identifier) ?? []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= maxRequests) {
    buckets.set(identifier, recent);
    return false;
  }

  recent.push(now);
  buckets.set(identifier, recent);
  return true;
}

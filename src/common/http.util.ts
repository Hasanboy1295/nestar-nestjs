import { HttpException, HttpStatus } from "@nestjs/common";
import type { Request } from "express";

export function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return first.split(",")[0].trim();
  }
  const real = req.headers["x-real-ip"];
  if (real) return String(real);
  return "local";
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();

  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function tooManyAttempts(): never {
  throw new HttpException(
    { ok: false, error: "Too many attempts. Try again later." },
    HttpStatus.TOO_MANY_REQUESTS,
  );
}

export function fail(status: HttpStatus, error: string): never {
  throw new HttpException({ ok: false, error }, status);
}

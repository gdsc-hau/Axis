import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

let limiter: Ratelimit | undefined;

function getLimiter(): Ratelimit | undefined {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Search rate limiting requires Upstash Redis configuration.');
    }
    return undefined;
  }

  limiter ??= new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:search',
  });
  return limiter;
}

export async function limitSearch(ip: string): Promise<RateLimitResult> {
  const activeLimiter = getLimiter();
  if (!activeLimiter) {
    return { success: true, limit: 10, remaining: 10, reset: Date.now() + 60_000 };
  }
  return activeLimiter.limit(ip);
}

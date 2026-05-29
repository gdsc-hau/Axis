import { NextResponse, type NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

// Note: In a true Edge environment (e.g. Vercel), this cache is scoped per isolate.
// For strict global rate limiting, a service like Upstash Redis is recommended.
// This LRU cache provides a lightweight, local rate limit strategy.
const rateLimitCache = new LRUCache<string, { count: number; timestamp: number }>({
  max: 1000,
  ttl: 1000 * 60 * 2, // 2 minutes
});

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit the search API endpoint
  if (pathname.startsWith('/api/search')) {
    // Basic IP extraction
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';

    const now = Date.now();
    const record = rateLimitCache.get(ip);

    if (record) {
      if (record.count >= 10) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again later.' },
          { status: 429 }
        );
      }
      record.count += 1;
      rateLimitCache.set(ip, record);
    } else {
      rateLimitCache.set(ip, { count: 1, timestamp: now });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/search'],
};

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redis =  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const searchRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, '1 m'),
    analytics: true,
    prefix: 'ratelimit:search',
})
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * One limiter instance per route — each uses a separate key prefix in Redis
 * so limits are counted independently per endpoint.
 */
export const rateLimits = {
  // Expensive: calls Claude with a full PDF
  parseTrainerize: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:parse-trainerize",
  }),

  // Expensive: calls Claude to generate a report
  generateReport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "rl:generate-report",
  }),

  // Writes many DB rows — protect against runaway re-imports
  confirmImport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:confirm-import",
  }),

  // Athlete-facing week submission — higher limit, still bounded
  trainingWeekPut: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 h"),
    prefix: "rl:training-week-put",
  }),
};

/**
 * Extracts the real client IP from the request headers.
 * Uses x-forwarded-for (set by Vercel / proxies) with anonymous fallback.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "anonymous";
}

/** Standard 429 response returned when a limit is exceeded. */
export function tooManyRequests() {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 }
  );
}

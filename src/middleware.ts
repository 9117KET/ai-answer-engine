// TODO: Implement the code here to add rate limiting with Redis
// Refer to the Next.js Docs: https://nextjs.org/docs/app/building-your-application/routing/middleware
// Refer to Redis docs on Rate Limiting: https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

console.log("Redis URL:", process.env.UPSTASH_REDIS_REST_URL);
console.log(
  "Redis Token:",
  process.env.UPSTASH_REDIS_REST_TOKEN ? "exists" : "missing"
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, "60s"),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);

    const response = success
      ? NextResponse.next()
      : NextResponse.json(
          {
            error: "Rate limit exceeded",
            details: {
              limit,
              remaining: 0,
              reset,
              retryAfter: Math.ceil((reset - Date.now()) / 1000),
              message:
                "Too many requests within a short period, please try again later",
            },
          },
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*", // Ensure frontend can read the headers
              "Access-Control-Expose-Headers":
                "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After",
            },
          }
        );

    // Add rate limit info to all responses (success or failure)
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", reset.toString());
    response.headers.set(
      "Retry-After",
      Math.ceil((reset - Date.now()) / 1000).toString()
    );

    return response;
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    // Return next response on error to prevent blocking requests
    return NextResponse.next();
  }
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

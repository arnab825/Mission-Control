import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory rate limiting map for basic sliding window protection
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/minute per IP

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (record.expiresAt < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Block common malicious scanner probes and vulnerability scanners
  const blockedPatterns = [
    /\.env/i,
    /\.git/i,
    /wp-admin/i,
    /wp-login/i,
    /xmlrpc\.php/i,
    /phpmyadmin/i,
    /\.sql$/i,
    /\.bak$/i,
    /\.config$/i,
    /\/_profiler/i,
    /\/actuator/i,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(pathname))) {
    return new NextResponse("Access Denied: Blocked by Security Policy", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  // 2. Client IP Rate Limiting for API routes
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "anonymous";

    const now = Date.now();
    const clientRecord = rateLimitMap.get(ip);

    if (clientRecord && clientRecord.expiresAt > now) {
      clientRecord.count += 1;
      if (clientRecord.count > MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse(
          JSON.stringify({
            error: "Too Many Requests",
            message: "Rate limit exceeded. Please try again later.",
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          }
        );
      }
    } else {
      rateLimitMap.set(ip, {
        count: 1,
        expiresAt: now + RATE_LIMIT_WINDOW_MS,
      });
    }
  }

  const response = NextResponse.next();

  // 3. Reinforce Edge Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|images/|screenshots/).*)",
  ],
};

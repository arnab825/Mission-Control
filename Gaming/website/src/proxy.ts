import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Rate Limiter Data Structures ─────────────────────────────────────────────
interface RateLimitRecord {
  count: number;
  windowStart: number;
  violations: number;
  backoffUntil: number;
}

// In-memory sliding rate limit store
const ipRateLimitMap = new Map<string, RateLimitRecord>();
const accountRateLimitMap = new Map<string, RateLimitRecord>();

// ── Externalized Configuration with Safe Fallbacks ───────────────────────────
function getEnvNumber(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed <= 0 ? fallback : parsed;
}

// Rate limit configurations by endpoint tier
function getTierConfig(tier: "auth" | "authenticated" | "public") {
  if (tier === "auth") {
    return {
      windowMs: getEnvNumber("RATE_LIMIT_AUTH_WINDOW_MS", 60 * 1000), // 1 minute
      maxRequests: getEnvNumber("RATE_LIMIT_AUTH_MAX", 10), // 10 requests / min
      backoffBaseMs: getEnvNumber("RATE_LIMIT_AUTH_BACKOFF_BASE_MS", 30 * 1000), // 30s base backoff
      backoffMaxMs: getEnvNumber("RATE_LIMIT_AUTH_BACKOFF_MAX_MS", 15 * 60 * 1000), // 15m max backoff
    };
  }
  if (tier === "authenticated") {
    return {
      windowMs: getEnvNumber("RATE_LIMIT_USER_WINDOW_MS", 60 * 1000), // 1 minute
      maxRequests: getEnvNumber("RATE_LIMIT_USER_MAX", 180), // 180 requests / min
      backoffBaseMs: getEnvNumber("RATE_LIMIT_USER_BACKOFF_BASE_MS", 15 * 1000), // 15s base backoff
      backoffMaxMs: getEnvNumber("RATE_LIMIT_USER_BACKOFF_MAX_MS", 5 * 60 * 1000), // 5m max backoff
    };
  }
  return {
    windowMs: getEnvNumber("RATE_LIMIT_PUBLIC_WINDOW_MS", 60 * 1000), // 1 minute
    maxRequests: getEnvNumber("RATE_LIMIT_PUBLIC_MAX", 60), // 60 requests / min
    backoffBaseMs: getEnvNumber("RATE_LIMIT_PUBLIC_BACKOFF_BASE_MS", 20 * 1000), // 20s base backoff
    backoffMaxMs: getEnvNumber("RATE_LIMIT_PUBLIC_BACKOFF_MAX_MS", 10 * 60 * 1000), // 10m max backoff
  };
}

// Cleanup stale records periodically to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRateLimitMap.entries()) {
    if (record.backoffUntil < now && now - record.windowStart > 10 * 60 * 1000) {
      ipRateLimitMap.delete(key);
    }
  }
  for (const [key, record] of accountRateLimitMap.entries()) {
    if (record.backoffUntil < now && now - record.windowStart > 10 * 60 * 1000) {
      accountRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── Rate Limit Evaluator with Exponential Backoff ────────────────────────────
function checkRateLimit(
  map: Map<string, RateLimitRecord>,
  key: string,
  config: { windowMs: number; maxRequests: number; backoffBaseMs: number; backoffMaxMs: number }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let record = map.get(key);

  if (!record) {
    record = { count: 1, windowStart: now, violations: 0, backoffUntil: 0 };
    map.set(key, record);
    return { allowed: true };
  }

  // 1. If currently in exponential backoff, immediately reject with remaining time
  if (record.backoffUntil > now) {
    const retryAfter = Math.ceil((record.backoffUntil - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // 2. If the current sliding window has elapsed, reset window
  if (now - record.windowStart > config.windowMs) {
    // Decay repeat violations count if client has been well-behaved for 3+ windows
    if (now - record.windowStart > config.windowMs * 3) {
      record.violations = 0;
    }
    record.count = 1;
    record.windowStart = now;
    return { allowed: true };
  }

  // 3. Increment request count within active window
  record.count += 1;
  if (record.count > config.maxRequests) {
    record.violations += 1;
    // Exponential backoff: base * 2^(violations - 1) capped at backoffMaxMs
    const backoffMs = Math.min(
      config.backoffMaxMs,
      config.backoffBaseMs * Math.pow(2, record.violations - 1)
    );
    record.backoffUntil = now + backoffMs;
    const retryAfter = Math.ceil(backoffMs / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// ── Endpoint Tier Detection ──────────────────────────────────────────────────
function getEndpointTier(pathname: string, request: NextRequest): "auth" | "authenticated" | "public" {
  // Check if request is authenticated via session cookie or Authorization header
  const authHeader = request.headers.get("authorization");
  const userIdHeader = request.headers.get("x-user-id");
  const hasSessionCookie =
    request.cookies.has("__session") ||
    request.cookies.has("session_token") ||
    request.cookies.has("__client_jwt");

  if (authHeader || userIdHeader || hasSessionCookie) {
    return "authenticated";
  }

  // Sensitive & authentication routes (strictest limits + exponential backoff)
  const isAuthRoute =
    pathname.startsWith("/api/auth") ||
    pathname === "/api/login" ||
    pathname === "/api/signup" ||
    pathname === "/api/password-reset" ||
    pathname === "/api/contact" ||
    pathname === "/api/subscribe" ||
    pathname === "/api/support/chat" ||
    pathname === "/api/issues/diagnose" ||
    pathname === "/api/upload";

  if (isAuthRoute) {
    return "auth";
  }

  // All other API routes are considered public
  return "public";
}

export function proxy(request: NextRequest) {
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

  // 2. Dynamic Tiered Rate Limiting for API routes
  if (pathname.startsWith("/api/")) {
    const tier = getEndpointTier(pathname, request);
    const tierConfig = getTierConfig(tier);

    // Identify Client IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 2a. IP-based Rate Limit Check
    const ipResult = checkRateLimit(ipRateLimitMap, `${tier}:${ip}`, tierConfig);
    if (!ipResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Too Many Requests",
          message:
            tier === "auth"
              ? "Authentication rate limit exceeded. Exponential backoff delay active."
              : "Rate limit exceeded. Please try again later.",
          retryAfter: ipResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(ipResult.retryAfter || 60),
          },
        }
      );
    }

    // 2b. Account-based Rate Limit Check for auth routes (per-account tracking)
    if (tier === "auth") {
      const accountIdentifier =
        request.headers.get("x-user-email") ||
        request.headers.get("x-account-id") ||
        request.nextUrl.searchParams.get("email") ||
        request.nextUrl.searchParams.get("account");

      if (accountIdentifier) {
        const cleanAccount = accountIdentifier.trim().toLowerCase();
        const accountResult = checkRateLimit(
          accountRateLimitMap,
          `auth_acc:${cleanAccount}`,
          tierConfig
        );

        if (!accountResult.allowed) {
          return new NextResponse(
            JSON.stringify({
              error: "Too Many Requests",
              message: "Rate limit exceeded for this account. Exponential backoff delay active.",
              retryAfter: accountResult.retryAfter,
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(accountResult.retryAfter || 60),
              },
            }
          );
        }
      }
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

// Keep export default and export middleware for backwards compatibility
export default proxy;
export const middleware = proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|images/|screenshots/).*)",
  ],
};

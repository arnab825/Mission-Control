import { z } from "zod";
import { NextResponse } from "next/server";

// ── Contact Submission Schema ────────────────────────────────────────────────
export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  subject: z.string().trim().max(150, "Subject too long").default("General Support Inquiry"),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(5000, "Message too long"),
});

// ── Issue Tracker Schemas ────────────────────────────────────────────────────
export const IssueSpecsSchema = z.object({
  os: z.string().trim().min(1, "OS is required").max(100),
  osVersion: z.string().trim().min(1, "OS Version is required").max(100),
  cpu: z.string().trim().min(1, "CPU is required").max(150),
  gpu: z.string().trim().min(1, "GPU is required").max(150),
  gpuDriver: z.string().trim().max(100).default("Unknown"),
  ramGB: z.coerce.number().positive("RAM must be positive").max(1024, "RAM exceeds realistic boundary"),
  appVersion: z.string().trim().min(1, "App Version is required").max(50),
});

export const IssueCreateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title too long"),
  description: z.string().trim().min(5, "Description must be at least 5 characters").max(2500, "Description too long"),
  category: z.enum(["hardware", "glitch", "performance", "other"]),
  game: z.string().trim().max(100).default("General System"),
  author: z.string().trim().max(100).default("Operator"),
  specs: IssueSpecsSchema,
});

export const IssueVoteSchema = z.object({
  issueId: z.string().trim().min(1, "Issue ID is required").max(64, "Invalid issue ID length"),
  voteType: z.enum(["up", "down"]),
});

// ── Newsletter Subscription Schema ───────────────────────────────────────────
export const SubscribeSchema = z.object({
  email: z.string().trim().email("Invalid email address format").max(254, "Email too long"),
});

// ── Support Chat Schema ──────────────────────────────────────────────────────
export const SupportChatSchema = z.object({
  message: z.string().trim().max(4000, "Message exceeds 4000 characters limit").default(""),
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  sessionId: z.string().trim().max(100).optional(),
  gender: z.enum(["male", "female", "unspecified"]).default("unspecified"),
  subscribeWeekly: z.boolean().default(true),
});

// ── Benchmark Rating Schemas ─────────────────────────────────────────────────
export const BenchmarkVoteSchema = z.object({
  ratingId: z.string().trim().min(1, "Rating ID is required").max(64),
  voteType: z.enum(["up", "down"]),
});

export const BenchmarkRatingCreateSchema = z.object({
  gameSlug: z.string().trim().min(1, "Game slug is required").max(100),
  userRating: z.coerce.number().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  fps: z.coerce.number().min(0).max(1000).optional(),
  resolution: z.string().trim().max(50).optional(),
  preset: z.string().trim().max(50).optional(),
  comment: z.string().trim().max(1000).optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
});

// ── Download Type Schema ─────────────────────────────────────────────────────
export const DownloadTypeSchema = z.enum([
  "auto",
  "linux",
  "exe",
  "msi",
  "zip",
  "appimage",
  "deb",
  "rpm",
  "tar.gz",
  "tar",
  "tgz",
  "linux-zip",
  "linux_zip",
  "win-zip",
  "windows",
  "win",
]);

// ── Blob Pathname Schema ─────────────────────────────────────────────────────
export const BlobQuerySchema = z.object({
  pathname: z
    .string()
    .trim()
    .min(1, "Pathname is required")
    .max(256, "Pathname exceeds 256 characters")
    .regex(/^[a-zA-Z0-9_./-]+$/, "Invalid characters in pathname")
    .refine((val) => !val.includes(".."), "Directory traversal sequences not permitted"),
});

// ── Per-Account Dynamic Rate Limiter with Exponential Backoff ────────────────
interface AccountRateRecord {
  count: number;
  windowStart: number;
  violations: number;
  backoffUntil: number;
}

const accountStore = new Map<string, AccountRateRecord>();

export function checkAccountRateLimit(
  accountKey: string,
  options?: {
    windowMs?: number;
    maxRequests?: number;
    backoffBaseMs?: number;
    backoffMaxMs?: number;
  }
): { allowed: boolean; retryAfter?: number; response?: NextResponse } {
  const windowMs = options?.windowMs ?? Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 60000);
  const maxRequests = options?.maxRequests ?? Number(process.env.RATE_LIMIT_AUTH_MAX || 10);
  const backoffBaseMs = options?.backoffBaseMs ?? Number(process.env.RATE_LIMIT_AUTH_BACKOFF_BASE_MS || 30000);
  const backoffMaxMs = options?.backoffMaxMs ?? Number(process.env.RATE_LIMIT_AUTH_BACKOFF_MAX_MS || 900000);

  const now = Date.now();
  const normalizedKey = accountKey.trim().toLowerCase();
  let record = accountStore.get(normalizedKey);

  if (!record) {
    accountStore.set(normalizedKey, {
      count: 1,
      windowStart: now,
      violations: 0,
      backoffUntil: 0,
    });
    return { allowed: true };
  }

  // Active exponential backoff
  if (record.backoffUntil > now) {
    const retryAfter = Math.ceil((record.backoffUntil - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      response: NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Account submission limit exceeded. Exponential backoff active. Retry in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      ),
    };
  }

  // Window reset
  if (now - record.windowStart > windowMs) {
    if (now - record.windowStart > windowMs * 3) {
      record.violations = 0;
    }
    record.count = 1;
    record.windowStart = now;
    return { allowed: true };
  }

  record.count += 1;
  if (record.count > maxRequests) {
    record.violations += 1;
    const backoffMs = Math.min(backoffMaxMs, backoffBaseMs * Math.pow(2, record.violations - 1));
    record.backoffUntil = now + backoffMs;
    const retryAfter = Math.ceil(backoffMs / 1000);
    return {
      allowed: false,
      retryAfter,
      response: NextResponse.json(
        {
          error: "Too Many Requests",
          message: `Account submission limit exceeded. Exponential backoff active. Retry in ${retryAfter} seconds.`,
          retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      ),
    };
  }

  return { allowed: true };
}

// ── Standard Production Safe Error Formatter ─────────────────────────────────
/**
 * Safely logs the full error server-side and returns a sanitized, generic error
 * message to the client, preventing any database, stack trace, or internal path leakage.
 */
export function handleApiError(
  context: string,
  error: unknown,
  status: number = 500,
  userMessage?: string
): NextResponse {
  console.error(`[API Error: ${context}]`, error);

  const genericMessage =
    userMessage ||
    (status === 400
      ? "Invalid request parameters."
      : status === 401
      ? "Unauthorized request."
      : status === 404
      ? "Requested resource not found."
      : "An internal error occurred while processing your request. Please try again later.");

  return NextResponse.json({ error: genericMessage }, { status });
}

/**
 * Helper to validate request payload with a Zod schema and immediately return 400 if invalid.
 */
export function validateRequestBody<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues?.[0]?.message || "Validation failed";
    return {
      success: false,
      response: NextResponse.json(
        { error: `Validation Error: ${firstError}` },
        { status: 400 }
      ),
    };
  }
  return { success: true, data: result.data };
}


import { z } from "zod";
import { NextResponse } from "next/server";

// ── Contact Submission Schema ────────────────────────────────────────────────
export const ContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  subject: z.string().trim().max(150, "Subject too long").default("General Support Inquiry"),
  message: z.string().trim().min(5, "Message must be at least 5 characters").max(5000, "Message too long"),
}).strict();

// ── Issue Tracker Schemas ────────────────────────────────────────────────────
export const IssueSpecsSchema = z.object({
  os: z.string().trim().min(1, "OS is required").max(100),
  osVersion: z.string().trim().min(1, "OS Version is required").max(100),
  cpu: z.string().trim().min(1, "CPU is required").max(150),
  gpu: z.string().trim().min(1, "GPU is required").max(150),
  gpuDriver: z.string().trim().max(100).default("Unknown"),
  ramGB: z.coerce.number().positive("RAM must be positive").max(1024, "RAM exceeds realistic boundary"),
  appVersion: z.string().trim().min(1, "App Version is required").max(50),
}).strict();

export const IssueCreateSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(150, "Title too long"),
  description: z.string().trim().min(5, "Description must be at least 5 characters").max(2500, "Description too long"),
  category: z.enum(["hardware", "glitch", "performance", "other"]),
  game: z.string().trim().max(100).default("General System"),
  author: z.string().trim().max(100).default("Operator"),
  specs: IssueSpecsSchema,
}).strict();

export const IssueVoteSchema = z.object({
  issueId: z.string().trim().min(1, "Issue ID is required").max(64, "Invalid issue ID length"),
  voteType: z.enum(["up", "down"]),
}).strict();

// ── Newsletter Subscription Schema ───────────────────────────────────────────
export const SubscribeSchema = z.object({
  email: z.string().trim().email("Invalid email address format").max(254, "Email too long"),
}).strict();

// ── Support Chat Schema ──────────────────────────────────────────────────────
export const SupportChatMessageSchema = z.object({
  id: z.string().max(100).optional(),
  sender: z.enum(["user", "assistant", "system", "model"]),
  text: z.string().max(10000),
  timestamp: z.string().max(50).optional(),
}).strict();

export const SupportChatSchema = z.object({
  message: z.string().trim().max(4000, "Message exceeds 4000 characters limit").default(""),
  name: z.string().trim().min(1, "Name is required").max(100, "Name too long"),
  email: z.string().trim().email("Invalid email address").max(254, "Email too long"),
  sessionId: z.string().trim().max(100).optional(),
  gender: z.enum(["male", "female", "unspecified"]).default("unspecified"),
  subscribeWeekly: z.boolean().default(true),
  fullHistory: z.array(SupportChatMessageSchema).max(50).optional(),
}).strict();

// ── Benchmark Rating Schemas ─────────────────────────────────────────────────
export const BenchmarkVoteSchema = z.object({
  ratingId: z.string().trim().min(1, "Rating ID is required").max(64),
  voteType: z.enum(["up", "down"]),
}).strict();

export const BenchmarkRatingCreateSchema = z.object({
  gameSlug: z.string().trim().min(1, "Game slug is required").max(100),
  userRating: z.coerce.number().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  fps: z.coerce.number().min(0).max(1000).optional(),
  resolution: z.string().trim().max(50).optional(),
  preset: z.string().trim().max(50).optional(),
  comment: z.string().trim().max(1000).optional(),
  specs: z.record(z.string(), z.unknown()).optional(),
}).strict();

export const GameRatingSpecsSchema = z.object({
  gpu: z.string().trim().min(1, "GPU is required").max(100),
  cpu: z.string().trim().min(1, "CPU is required").max(100),
  ramGB: z.coerce.number().min(1).max(1024).default(16),
  resolution: z.string().trim().max(50).default("1440p"),
  fpsReported: z.coerce.number().min(0).max(1000).default(60),
  os: z.string().trim().max(100).default("Windows 11"),
  presetUsed: z.string().trim().max(100).default("Optimal Preset"),
}).strict();

export const GameRatingMediaItemSchema = z.object({
  url: z.string().trim().min(1, "Media url is required").max(2000),
  type: z.enum(["image", "gif", "video"]),
  name: z.string().trim().max(100).optional(),
}).strict();

export const GameRatingCreateSchema = z.object({
  gameId: z.string().trim().min(1, "gameId is required").max(100),
  gameName: z.string().trim().min(1, "gameName is required").max(150),
  userName: z.string().trim().max(100).default("Aero Operator"),
  rating: z.coerce.number().int("Rating must be an integer").min(1).max(5),
  title: z.string().trim().min(1, "title is required").max(120),
  review: z.string().trim().min(1, "review is required").max(2000),
  specs: GameRatingSpecsSchema,
  media: z.array(GameRatingMediaItemSchema).max(10).optional().default([]),
  recommend: z.boolean().default(true),
}).strict();

export const GameRatingVoteSchema = z.object({
  ratingId: z.string().trim().min(1, "ratingId is required").max(64),
  voterId: z.string().trim().max(64).default("anonymous"),
}).strict();

// ── Issue Diagnostic Schema ──────────────────────────────────────────────────
export const DiagnoseSpecsSchema = z.object({
  os: z.string().trim().max(100).optional(),
  osVersion: z.string().trim().max(100).optional(),
  cpu: z.string().trim().max(150).optional(),
  gpu: z.string().trim().max(150).optional(),
  gpuDriver: z.string().trim().max(100).optional(),
  ramGB: z.coerce.number().max(1024).optional(),
  appVersion: z.string().trim().max(50).optional(),
}).strict();

export const DiagnoseMetricsSchema = z.object({
  fps: z.coerce.number().max(1000).optional(),
  vramUsed: z.coerce.number().max(131072).optional(),
  cpuPct: z.coerce.number().max(100).optional(),
  gpuTemp: z.coerce.number().max(150).optional(),
}).strict();

export const DiagnoseSchema = z.object({
  rawError: z.string().trim().max(5000).optional().default(""),
  game: z.string().trim().max(150).optional().default("General System"),
  specs: DiagnoseSpecsSchema.optional().default({}),
  metrics: DiagnoseMetricsSchema.optional().default({}),
}).strict();

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
}).strict();

// ── Utility to Escape Regex Inputs ───────────────────────────────────────────
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const record = accountStore.get(normalizedKey);

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

// ── Distributed Node & Library Sync Schemas ────────────────────────────────
export const NodeStorageSchema = z.object({
  total: z.coerce.number().nonnegative().default(0),
  used: z.coerce.number().nonnegative().default(0),
  free: z.coerce.number().nonnegative().default(0),
}).passthrough();

export const NodeRegisterSchema = z.object({
  nodeId: z.string().trim().max(64).optional().nullable(),
  node_id: z.string().trim().max(64).optional().nullable(),
  name: z.string().trim().min(1, "Node name is required").max(100),
  hostname: z.string().trim().max(100).optional().default(""),
  ip: z.string().trim().max(45).optional().default(""),
  clerkId: z.string().trim().max(100).optional().default(""),
  clerk_id: z.string().trim().max(100).optional().default(""),
  authProvider: z.string().trim().max(50).optional().default(""),
  auth_provider: z.string().trim().max(50).optional().default(""),
  platform: z.string().trim().max(50).optional().default("win32"),
  version: z.string().trim().max(50).optional().default("1.0.0"),
  storage: NodeStorageSchema.default({ total: 0, used: 0, free: 0 }),
  scanPaths: z.array(z.string().max(500)).max(100).optional().default([]),
  metadata: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export const NodeHeartbeatSchema = z.object({
  ip: z.string().trim().max(45).optional().default(""),
  storage: NodeStorageSchema.optional().default({ total: 0, used: 0, free: 0 }),
  status: z.enum(["online", "offline", "syncing"]).optional().default("online"),
}).passthrough();

export const NodeSyncInstallationSchema = z.object({
  title: z.string().trim().min(1).max(250),
  store: z.string().trim().max(50).optional().default("manual"),
  store_app_id: z.any().optional(),
  storeAppId: z.any().optional(),
  install_path: z.string().trim().max(1000).optional(),
  installPath: z.string().trim().max(1000).optional(),
  exe_path: z.string().trim().max(1000).optional().nullable(),
  exePath: z.string().trim().max(1000).optional().nullable(),
  version: z.string().trim().max(50).optional().nullable(),
  size_bytes: z.coerce.number().nonnegative().optional().default(0),
  sizeBytes: z.coerce.number().nonnegative().optional().default(0),
  developer: z.string().trim().max(150).optional().nullable(),
  publisher: z.string().trim().max(150).optional().nullable(),
  release_date: z.string().trim().max(50).optional().nullable(),
  releaseDate: z.string().trim().max(50).optional().nullable(),
  genres: z.array(z.string().max(50)).max(20).optional().default([]),
  tags: z.array(z.string().max(50)).max(50).optional().default([]),
  features: z.array(z.string().max(50)).max(50).optional().default([]),
  cover_url: z.string().trim().max(1000).optional().nullable(),
  coverUrl: z.string().trim().max(1000).optional().nullable(),
  banner_url: z.string().trim().max(1000).optional().nullable(),
  bannerUrl: z.string().trim().max(1000).optional().nullable(),
  summary: z.string().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().default({}),
}).passthrough();

export const NodeSyncSchema = z.object({
  installations: z.array(NodeSyncInstallationSchema).max(5000),
}).passthrough();



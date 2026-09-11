---
trigger: always_on
---

# Comprehensive Codebase Audit, Security Hardening & Simplification Directive

## 1. Input Validation & Request Schema Enforcement
* **Strict Schema Verification:** Validate every incoming payload and input against an explicit, strict schema covering data type, length boundaries, and exact format.
* **Strict Rejection:** Reject non-conforming inputs immediately with an error (e.g., `400 Bad Request`). Never rely solely on sanitizing or escaping malformed data.
* **Strict Key Matching:** Disallow unpermitted, unexpected, or extraneous fields across all request payloads.

---

## 2. Dynamic Rate Limiting & Authentication Protection
* **Endpoint-Specific Tiers:**
  * **Auth Routes (`login`, `signup`, `password reset`):** Strictest limits combining per-IP and per-account tracking with exponential backoff instead of immediate hard lockouts.
  * **Public Endpoints:** Moderate rate limits to prevent resource exhaustion and scraping.
  * **Authenticated Endpoints:** Looser limits calibrated for typical active user workflows.
* **Externalized Configuration:** Make all rate limits, rate windows, and backoff parameters fully configurable via environment variables rather than hardcoded constants.

---

## 3. Secure File Upload Pipeline
* **Deep Content Validation:** Validate uploaded files by inspecting binary content and magic bytes, mime-type, and file size—not merely the extension name.
* **Isolated Storage:** Store all user-uploaded assets outside the application web root or in dedicated, isolated object storage.
* **Execution Prevention:** Ensure uploaded files can never be executed as server-side or client-side code under any circumstance.

---

## 4. Production Error Handling & Leak Prevention
* **Information Shielding:** Prevent users and external clients from ever seeing raw database errors, stack traces, internal file paths, or ORM/query details.
* **Standardized Contracts:** Return sanitized, generic, and user-friendly error responses to the client.
* **Server-Side Observability:** Capture and log complete error traces, contexts, and diagnostics securely on the server for debugging.

---

## 5. Dependency Audit & Secrets Sanitization
* **Vulnerability Scanning:** Perform a full repository dependency audit to detect packages with known vulnerabilities, document their severity levels, and patch or replace them safely.
* **Secret Detection:** Scan the complete codebase for hardcoded API keys, secrets, tokens, and credentials.
* **Safe Configuration:** Shift all sensitive values to environment variables and verify that no secret is exposed to public client builds or checked into Git.

---

## 6. Codebase Simplification for Junior/Mid Teams
* **Straightforward Patterns:** Refactor advanced, clever, or unnecessary patterns into clean, maintainable, readable code without compromising correctness.
* **Language & Types:**
  * Use plain functions, clear interfaces, and straightforward type aliases.
  * Avoid complex generic utility types, deep conditional types, metaprogramming, decorators, and excessive function overloads.
* **State Management & Async:**
  * Build simple, flattened Zustand actions and stores.
  * Avoid custom state machines, complex reducers, and heavy abstraction layers for basic API calls.
  * Use straightforward `async`/`await` and standard array methods.
* **React Architecture:**
  * Favor small, focused components with explicit props, readable conditional rendering, and central constants.
  * Avoid unmeasured or premature use of `useMemo` and `useCallback`.
  * Avoid generic form builders that obscure validation logic and excessive barrel exports (`index.ts`) that complicate imports.
  * Use standard shadcn components directly instead of writing redundant custom design-system wrappers.
* **Function Granularity:** Review complex existing functions; replace unnecessary ones with smaller, readable, single-purpose functions accompanied by short comments explaining non-obvious business logic.

---

## 7. Production-Grade Deep Cleanup & Dead Code Removal
* **Execution Lifecycle:** Follow a strict execution workflow:
  $$\text{Investigate} \longrightarrow \text{Verify} \longrightarrow \text{Remove} \longrightarrow \text{Simplify} \longrightarrow \text{Reorganize} \longrightarrow \text{Validate}$$
* **Architecture Inspection:** Comprehensively inspect entry points, dependencies, routes, build scripts, tests, configurations, environment usage, and framework conventions.
* **Dead Code Pruning:**
  * Identify and safely remove genuinely unused, dead, unreachable, redundant, duplicated, obsolete, deprecated, legacy, backward-compatibility-only, experimental, debug, commented-out, and temporary files, directories, components, functions, classes, hooks, utilities, types, routes, configs, and documentation.
  * Consolidate duplicate implementations into simple maintainable solutions.
  * Clean and group file and directory structures logically with consistent naming, deleting empty directories.
  * Safely purge unused package dependencies while keeping tooling, plugins, and runtime packages intact.
* **Safe Removal Rules:**
  * Preserve application behavior, business logic, security, authentication, and database integrity.
  * Never blindly delete dynamically imported or externally consumed logic; investigate first and preserve whenever uncertain.
  * Avoid unrelated stylistic or cosmetic churn.
* **Verification & Fixes:**
  * Update all imports, aliases, tests, and configuration files affected by reorganization.
  * Run the full validation chain:
    ```bash
    npm run lint
    npm run typecheck
    npm test
    npm run build
    ```
  * Resolve all errors introduced during cleanup without loosening validation rules.
  * Conduct a final repository-wide pass to confirm zero remaining dead code, stale imports, or temporary files.
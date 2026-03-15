# Rate Limiting Plan: Chat API

This document outlines a detailed plan to add rate limiting to the chat-related API surface in the Scout codebase. The goal is to protect AI-heavy and chat endpoints from abuse, reduce cost spikes, and ensure fair usage without degrading legitimate user experience.

---

## 1. Scope

### 1.1 In scope

| Surface | Location | Rationale |
|--------|----------|-----------|
| **tRPC chat procedures** | `src/lib/api/routers/chatRouter.ts` | All chat and planning flows; many call AI and DB heavily. |
| **Transcribe API** | `src/app/api/transcribe/route.ts` | Uses OpenAI Whisper; should be limited per user/session. |

**Chat procedures to consider for rate limiting:**

| Procedure | Type | Relative cost | Suggested limit tier |
|-----------|------|----------------|----------------------|
| `getDailyConversation` | query | Low | Generous (e.g. 120/min) |
| `getTaskConversation` | query | Low | Generous |
| `getConversation` | query | Low | Generous |
| `getRecent` | query | Low | Generous |
| `getCurrent` | query | Low | Generous |
| `sendDailyMessage` | mutation | **High** (AI) | Strict (e.g. 20/min) |
| `sendTaskMessage` | mutation | **High** (AI) | Strict |
| `startDeepDive` | mutation | **High** (AI) | Strict (e.g. 10/min) |
| `completePlanningSession` | mutation | **High** (AI + scheduling) | Strict |
| `commitPlanningSession` | mutation | Medium | Moderate (e.g. 30/min) |

### 1.2 Out of scope (for this plan)

- Other tRPC routers (task, student, tool, schedule, auth, admin) — can be added later using the same pattern.
- NextAuth and other framework routes unless you explicitly add them later.

---

## 2. Rate limiting strategy

### 2.1 Identifier

- **Primary:** Per **user** (authenticated): `ctx.session.user.id` (or stable session identifier).
- **Fallback for unauthenticated:** Not required for chat (all chat procedures use `protectedProcedure`). If you later add public or mixed procedures, use a fallback key such as IP from `X-Forwarded-For` / `X-Real-IP` or a fingerprint header, with clear privacy and compliance notes.

### 2.2 Algorithm

- **Sliding window** or **sliding window log**: Avoids burst at window boundaries; good for chat.
- **Fixed window**: Simpler; acceptable if you prefer implementation ease and can accept some burst at reset.
- **Token bucket**: Good if you want sustained throughput with occasional bursts; slightly more complex.

**Recommendation:** Start with **sliding window** (or a well-known library that implements it) so limits behave predictably for users.

### 2.3 Storage

- **Single instance / dev:** In-memory store (e.g. `Map` or a small LRU) is enough.
- **Production / multiple instances:** Use a shared store (e.g. **Redis**) so limits are consistent across replicas and after restarts. Optional: config flag to switch between in-memory and Redis.

---

## 3. Implementation options

### 3.1 Option A: tRPC middleware (recommended)

- **Where:** `src/lib/api/trpc.ts` (or a dedicated `rateLimit.ts` middleware used there).
- **How:** Create a `rateLimitProcedure` (or a middleware that runs after auth) that:
  - Reads identifier from context (e.g. `ctx.session?.user?.id`).
  - Checks a limit key derived from procedure path (e.g. `chat.sendDailyMessage`) and identifier.
  - On over-limit: throw `TRPCError` with `code: "TOO_MANY_REQUESTS"` and optional `message` and `cause` for client handling.
- **Pros:** Centralized; applies to all procedures (or only those that use the middleware). Easy to attach different limits per procedure or procedure group.
- **Cons:** Need to either apply middleware to the whole router or compose a “chat rate limit” middleware and use it only on chat router.

### 3.2 Option B: Procedure-level wrapper (chat only)

- **Where:** `src/lib/api/routers/chatRouter.ts`.
- **How:** Create a helper (e.g. `chatRateLimitedProcedure`) that composes `protectedProcedure` with a rate-limit check (same logic as above) and use it for the procedures you list in section 1.1. Queries can use a looser or no limit; mutations use strict limits.
- **Pros:** Chat-specific; no impact on other routers; limits and keys are explicit per procedure.
- **Cons:** Duplication if you later add rate limiting to other routers (mitigate by extracting shared middleware).

### 3.3 Option C: Next.js route / API handler

- **Where:** `src/app/api/trpc/[trpc]/route.ts` (and optionally `src/app/api/transcribe/route.ts`).
- **How:** Before delegating to tRPC (or transcribe), check a coarse limit (e.g. per user or per IP) and return `429` if exceeded. For tRPC you don’t know the procedure path without parsing the request, so this is best for a **global** “requests per user per minute” cap.
- **Pros:** Single place for all requests to `/api/trpc` and `/api/transcribe`; can add headers (e.g. `Retry-After`).
- **Cons:** No per-procedure limits; tRPC batch requests count as one HTTP request (so you may want both route-level and procedure-level limits).

**Recommendation:** Use **Option A or B** for per-procedure (or per-group) limits on chat, and optionally add a **lightweight Option C** cap for “total chat requests per user” if you want defense in depth. Implement transcribe rate limiting in `src/app/api/transcribe/route.ts` (same identifier and store as chat).

---

## 4. Technical design

### 4.1 Rate limit store interface

Abstract the store so you can swap in-memory vs Redis:

```ts
// src/lib/rateLimit/types.ts (or similar)
export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}
```

- **Key format:** e.g. `rl:{userId}:{procedurePath}:{windowStart}` or `rl:{userId}:chat-mutation:{windowStart}` for group limits.
- **windowMs:** e.g. 60_000 (1 minute). For sliding window, the store may need to support TTL or expiry; many Redis/in-memory implementations handle this.

### 4.2 Limits configuration

- **Source:** Environment variables (e.g. `CHAT_MESSAGE_LIMIT_PER_MIN`, `CHAT_QUERY_LIMIT_PER_MIN`, `DEEP_DIVE_LIMIT_PER_MIN`) with sensible defaults.
- **Optional:** Feature flag or env to disable rate limiting in development (e.g. `RATE_LIMIT_ENABLED=false`).

### 4.3 Error handling

- On limit exceeded:
  - **tRPC:** Throw `TRPCError` with `code: "TOO_MANY_REQUESTS"` (map to HTTP 429 if desired) and a clear message (e.g. “Too many messages. Please wait a moment.”).
  - **Transcribe:** Return `429` with JSON body `{ error: "Too many requests. Please try again later." }` and optional `Retry-After` header.
- Ensure the frontend (chat UI, transcribe usage) handles 429 by showing a user-friendly message and optionally a “Retry” action after a delay.

### 4.4 Context and identifier

- **tRPC:** Context already has `session` and `headers`. Use `ctx.session.user.id` for the identifier in `rateLimitProcedure` or chat middleware. Ensure rate limit runs **after** `protectedProcedure` so only authenticated traffic is limited by user.
- **Transcribe:** If the route is used only when the user is logged in, get the session (e.g. via `getServerAuthSession()`) and use the same user id. If it can be called unauthenticated, define a fallback (e.g. IP) and document it.

---

## 5. Implementation steps (summary)

1. **Dependencies**
   - Add a rate limiting library (e.g. `@upstash/ratelimit` with Redis, or a simple in-memory sliding-window implementation). If you prefer no Redis initially, use in-memory only and document that limits are per-instance.

2. **Abstraction**
   - Define `RateLimitStore` (and optionally a key builder).
   - Implement in-memory store (and later Redis if needed).
   - Create a small config module that reads env and exposes limits (e.g. `chatMessageLimitPerMin`).

3. **tRPC integration**
   - Add middleware in `src/lib/api/trpc.ts` that:
     - Takes a “limit config” (e.g. max requests per minute and optional procedure path or group).
     - Uses context to get user id (after auth).
     - Calls store, then throws `TOO_MANY_REQUESTS` if over limit.
   - Either:
     - Apply this middleware only to chat router (e.g. via a `chatRouter` that uses `rateLimitMiddleware`), or
     - Create `rateLimitProcedure(limits)` and use it for each chat procedure (or a `chatMutationProcedure` with strict limits and `chatQueryProcedure` with generous limits).

4. **Chat router**
   - Switch relevant procedures to use the rate-limited procedure/middleware (queries: generous or no limit; mutations: strict limits as in the table in 1.1).

5. **Transcribe route**
   - In `src/app/api/transcribe/route.ts`, after auth (if applicable), call the same store with a key like `rl:{userId}:transcribe:{window}` and return 429 when over limit.

6. **Environment and docs**
   - Add env vars to `.env.example` (e.g. `RATE_LIMIT_ENABLED`, `CHAT_MESSAGE_LIMIT_PER_MIN`, and Redis URL if used).
   - Document behavior in `CLAUDE.md` (and optionally README) under a “Rate limiting” subsection.

7. **Frontend**
   - Handle `TOO_MANY_REQUESTS` and 429 in the chat and transcribe clients: show a clear message and optionally a retry after a short delay.

8. **Testing**
   - Unit tests for the store and for the middleware (e.g. over-limit returns error, under-limit passes).
   - Optional: integration test that sends N requests and verifies the (N+1)th is rate limited.

9. **Observability**
   - Optional: log or emit a metric when a request is rate limited (e.g. user id, procedure, timestamp) for tuning limits and detecting abuse.

---

## 6. Suggested default limits (per user, per minute)

| Category | Example procedures | Suggested limit |
|----------|--------------------|-----------------|
| Chat queries | `getDailyConversation`, `getTaskConversation`, `getConversation`, `getRecent`, `getCurrent` | 120/min (or no limit if cheap) |
| Chat mutations (AI) | `sendDailyMessage`, `sendTaskMessage`, `startDeepDive`, `completePlanningSession` | 20/min |
| Deep dive / heavy | `startDeepDive` | 10/min (stricter if desired) |
| Planning commit | `commitPlanningSession` | 30/min |
| Transcribe | POST `/api/transcribe` | 30/min |

These can be tuned based on usage and cost; the plan is to make them configurable via env.

---

## 7. Files to add or modify

| Action | File |
|--------|------|
| Add | `src/lib/rateLimit/store.ts` (or `inMemory.ts` / `redis.ts`) – store implementation(s). |
| Add | `src/lib/rateLimit/config.ts` – read limits from env. |
| Add | `src/lib/rateLimit/middleware.ts` or middleware in trpc – rate limit check using store + config. |
| Modify | `src/lib/api/trpc.ts` – wire in rate limit middleware or export `rateLimitProcedure`. |
| Modify | `src/lib/api/routers/chatRouter.ts` – use rate-limited procedure for chat procedures. |
| Modify | `src/app/api/transcribe/route.ts` – add rate limit check before calling Whisper. |
| Modify | `.env.example` – document new env vars. |
| Modify | `CLAUDE.md` – add “Rate limiting” subsection. |
| Modify | Chat/transcribe client code – handle 429 / `TOO_MANY_REQUESTS`. |

---

## 8. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Legitimate users hit limits during heavy use | Set limits generously at first; make them configurable; add clear UI message and retry. |
| Redis unavailable in production | Fall back to in-memory store and log a warning; document that limits are per-instance when Redis is down. |
| Batching (tRPC batch) | Decide whether one batch = one “request” for rate limiting; if so, document. For per-procedure limits, you may need to parse batch and count each procedure call. |
| Clock skew | Use server time for windows; for Redis TTL, rely on Redis server time. |

---

## 9. Future extensions

- Apply the same pattern to **task**, **tool**, or **schedule** routers for expensive mutations.
- Add **per-IP** (or anonymous) limits for unauthenticated endpoints if you add any.
- **Tiered limits** (e.g. higher limits for premium or internal users) by reading a role or flag from `ctx.session` and choosing a limit profile.
- **Dashboard or logging** of rate-limit hits for tuning and abuse detection.

---

This plan keeps the chat API and transcribe endpoint protected by user-based rate limits, with minimal changes to existing procedures and a clear path to add more endpoints and storage backends later.

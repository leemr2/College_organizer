# Security Fix Plan: adminRouter publicProcedure and accessRequest.update

**Date:** 2025-03-17  
**Violation:** SEC-002 / SEC-PRISMA-001  
**Severity:** Critical

---

## Summary

- **Finding:** `adminRouter` (node `adminRouter:adminRouter:8`) uses `publicProcedure` for `requestAccess`. That procedure calls `prisma.accessRequest.update` when an existing access request has status `rejected` or `approved` (re-request flow). The Prisma mutation `accessRequest.update` is therefore reachable from the tRPC API without any auth check.
- **Attack path:** Unauthenticated client → POST to `/api/trpc/...` (route handler `route:handler:19`, i.e. `src/app/api/trpc/[trpc]/route.ts`) → `admin.requestAccess` → `accessRequest.update` for any email with a prior approved/rejected request (resetting it to pending and clearing `approvedBy`, `notes`, etc.).
- **Codebase standard:** Other routers use `protectedProcedure` or `adminProcedure` for all mutations; only `requestAccess` is intentionally public for pre-signup “request access” UX. The fix must keep that UX while ensuring **no** `accessRequest.update` is reachable unauthenticated.

---

## 1. Fix: Remove `accessRequest.update` from the public path

**Principle:** The public procedure may only perform operations that are safe for unauthenticated callers. Re-requesting access (resetting a rejected/approved request to pending) can be implemented without using `update`: delete the old record and create a new one. That preserves behavior (user can re-request) but removes the sensitive mutation from the unauthenticated path.

### 1.1 File to change

| File | Purpose |
|------|--------|
| `src/lib/api/routers/adminRouter.ts` | Only file that needs edits |

No changes to:

- `src/app/api/trpc/[trpc]/route.ts` — it correctly forwards all tRPC procedures; the gate is at the procedure level.
- Call sites (e.g. `src/app/auth/signin/page.tsx`) — they keep calling `api.admin.requestAccess.useMutation()`; no API change.

### 1.2 Exact change in `src/lib/api/routers/adminRouter.ts`

**Location:** Inside `requestAccess` mutation, the block that handles existing request with status `rejected` or `approved` (current lines ~40–52).

**Current code:**

```ts
if (existingRequest.status === "rejected" || existingRequest.status === "approved") {
  return await prisma.accessRequest.update({
    where: { email: input.email },
    data: {
      status: "pending",
      requestedAt: new Date(),
      rejectedAt: null,
      approvedAt: null,
      approvedBy: null,
      notes: null,
    },
  });
}
```

**Replace with:**

```ts
if (existingRequest.status === "rejected" || existingRequest.status === "approved") {
  await prisma.accessRequest.delete({
    where: { email: input.email },
  });
  return await prisma.accessRequest.create({
    data: {
      email: input.email,
      status: "pending",
    },
  });
}
```

**Result:**

- Re-request flow is unchanged from the user’s perspective (they get a new “pending” request).
- The public procedure no longer calls `accessRequest.update`; it only uses `create` and `delete` for that branch. `accessRequest.update` remains only in `approveAccessRequest` and `rejectAccessRequest`, both behind `adminProcedure`.

**Optional cleanup:** If desired, add a one-line comment above the `requestAccess` procedure, e.g.:

```ts
// Public by design; must not call accessRequest.update (use delete+create for re-request).
requestAccess: publicProcedure
```

No need to remove `publicProcedure` from the router; it is still required for the initial create and for the re-request (delete+create) path.

---

## 2. How other routers gate mutations (reference)

- **taskRouter, studentRouter, scheduleRouter, toolRouter, chatRouter:** All mutations use `protectedProcedure` (or, where applicable, `adminProcedure`). They resolve the current user/student from `ctx.session.user.id` and enforce ownership before any Prisma write.
- **adminRouter:** All admin-only mutations use `adminProcedure`; only `requestAccess` uses `publicProcedure` and must therefore avoid any mutation that the codebase treats as auth-protected (here, `accessRequest.update`).

After the fix, `adminRouter` still imports and uses `publicProcedure` for the single allowed public mutation, but that mutation no longer touches `accessRequest.update`.

---

## 3. Test: Verify `accessRequest.update` is not reachable unauthenticated

### 3.1 Goal

Confirm that with no session, calling the tRPC procedure that was previously triggering `accessRequest.update` no longer executes that mutation. Optionally confirm that re-request behavior still works (new pending request for the same email).

### 3.2 Option A — Manual verification (no test framework)

1. **Setup:** Ensure DB has an `AccessRequest` with a known email and `status: "approved"` (or `"rejected"`).
2. **Call without auth:** From a client that does **not** send a session (e.g. curl or a test script that does not attach cookies/headers):
   - Call `admin.requestAccess` with that email.
3. **Assert:**
   - The call succeeds (or returns the same user-facing behavior as before).
   - In the database, for that email:
     - **Before fix:** The same row is updated (`updatedAt` changed, `status` = pending, `approvedBy`/`approvedAt` cleared).
     - **After fix:** The old row is gone and a **new** row exists with the same email and `status: "pending"` (different `id`, new `requestedAt`). So `accessRequest.update` was not used.

### 3.3 Option B — Unit test (when a test runner exists)

If the project adds a test runner (e.g. Vitest):

1. **Mock Prisma:** In a test for `requestAccess`, mock `prisma.accessRequest` (`findUnique`, `create`, `delete`, `update`).
2. **Scenario:** Set up the mock so `findUnique` returns an existing request with `status: "approved"`.
3. **Invoke:** Call the `requestAccess` procedure logic **without** a session (public path).
4. **Assert:**
   - `accessRequest.update` was **never** called.
   - `accessRequest.delete` and `accessRequest.create` were called (re-request path).

Example assertion (pseudo):

```ts
expect(prisma.accessRequest.update).not.toHaveBeenCalled();
expect(prisma.accessRequest.delete).toHaveBeenCalledWith({ where: { email: testEmail } });
expect(prisma.accessRequest.create).toHaveBeenCalledWith({
  data: { email: testEmail, status: "pending" },
});
```

### 3.4 Option C — Integration test (when E2E/API tests exist)

- With no auth cookies/session, POST to the tRPC endpoint for `admin.requestAccess` with an email that has an approved (or rejected) request.
- Query the database: the record for that email should be a **new** row (new id, new `requestedAt`), not the same row with updated fields. This confirms the code path used delete+create, not update.

---

## 4. Summary table

| Item | Detail |
|------|--------|
| **Violation** | adminRouter uses publicProcedure; accessRequest.update reachable unauthenticated via requestAccess re-request path. |
| **File** | `src/lib/api/routers/adminRouter.ts` |
| **Change** | In `requestAccess`, replace the `accessRequest.update` re-request block with `accessRequest.delete` + `accessRequest.create`. |
| **Verification** | Manual: re-request without auth → DB shows new row for that email, not updated row. Unit: mock Prisma, assert `update` never called. Integration: unauthenticated requestAccess → assert new row. |

---

## 5. Implementation order

1. Apply the code change in `adminRouter.ts` (delete + create instead of update).
2. Run `npm run build` and fix any type/lint issues.
3. Run the verification (Option A, B, or C) to confirm `accessRequest.update` is no longer reachable unauthenticated and re-request still works.

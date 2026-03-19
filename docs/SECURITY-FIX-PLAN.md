# Security Fix Plan: tRPC & Prisma Auth / IDOR

**Date:** 2025-03-17  
**Scope:** tRPC router layer and Prisma mutations; focus on unauthenticated access and IDOR.

---

## Summary

- **Authentication:** All sensitive mutations are behind `protectedProcedure` or `adminProcedure`. No Prisma mutations are exposed via unauthenticated Next.js API routes.
- **Issues found:** Two **public** procedures with intended-but-risky behavior, and several **IDOR** bugs where resource IDs are not validated against the current user.

---

## 1. Critical: IDOR in taskRouter

### 1.1 `getClarificationQuestions` (taskRouter)

- **Issue:** Accepts `taskId`, loads task by ID, and does **not** verify that the task belongs to the current user. Any authenticated user can:
  - Read another user’s task and student name.
  - Get clarification questions generated using another user’s context (including their other tasks).
- **Location:** `src/lib/api/routers/taskRouter.ts` ~116–154.

**Fix:**

- Resolve the current student from `ctx.session.user.id` (same pattern as `getById`).
- After `findUnique` for the task, require `task && task.studentId === student.id`; otherwise throw a generic "Task not found" (e.g. `TRPCError NOT_FOUND`).
- Do not return data that belongs to another user.

### 1.2 `saveClarification` (taskRouter)

- **Issue:** Accepts `taskId` and updates the task by ID only. No ownership check. Any authenticated user can overwrite any task’s `clarificationData` and set `clarificationComplete`.
- **Location:** `src/lib/api/routers/taskRouter.ts` ~156–174.

**Fix:**

- Resolve the current student from `ctx.session.user.id`.
- Before updating: `findUnique` the task, then require `task && task.studentId === student.id`; otherwise throw "Task not found".
- Keep the update as-is (by `id: input.taskId`) after the check.

---

## 2. Critical: Conversation ownership in chatRouter

### 2.1 `processMessage` – conversationId not validated

- **Issue:** When `conversationId` is provided, the conversation is loaded by ID only. There is no check that `conversation.studentId === studentId`. An attacker can:
  - Append their message (and the AI reply) to another user’s conversation.
  - Pollute another user’s chat and potentially influence AI context.
- **Location:** `src/lib/api/routers/chatRouter.ts` ~42–46 (and all callers: `sendDailyMessage`, `sendTaskMessage`, `sendMessage`).

**Fix:**

- In `processMessage`, immediately after:
  ```ts
  conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  ```
  add:
  ```ts
  if (conversation && conversation.studentId !== studentId) {
    throw new Error("Conversation not found");
  }
  ```
- Use a consistent error type (e.g. `TRPCError` with `NOT_FOUND`) if the rest of the app does.

### 2.2 `completePlanningSession` – conversationId not validated

- **Issue:** Takes `conversationId`, loads the conversation, but does not check `conversation.studentId === student.id`. An attacker can:
  - Read another user’s planning session (draft tasks).
  - Trigger schedule generation using that conversation (tasks/blocks are still created for the current user’s `student.id`, but the source data is another user’s).
  - Clear the other user’s conversation’s `conversationMode` (conversation update runs for the fetched conversation).
- **Location:** `src/lib/api/routers/chatRouter.ts` ~566–571 (fetch), then updates at ~617–621 and ~866.

**Fix:**

- After:
  ```ts
  const conversation = await prisma.conversation.findUnique({
    where: { id: input.conversationId },
  });
  if (!conversation) throw new Error("Conversation not found");
  ```
  add:
  ```ts
  if (conversation.studentId !== student.id) {
    throw new Error("Conversation not found");
  }
  ```

### 2.3 `commitPlanningSession` – conversationId not validated

- **Issue:** Same pattern: conversation is loaded by ID only. Attacker can read another user’s planning session and clear their `conversationMode`. Tasks/blocks are created for the current user, but the victim’s conversation is modified.
- **Location:** `src/lib/api/routers/chatRouter.ts` ~740–744, update at ~865–868.

**Fix:**

- After fetching the conversation and throwing if not found, add:
  ```ts
  if (conversation.studentId !== student.id) {
    throw new Error("Conversation not found");
  }
  ```

**Note:** `getConversation` already enforces ownership (`conversation.studentId !== student.id` → "Conversation not found"). No change needed there.

---

## 3. Public procedures (information disclosure / abuse)

### 3.1 `auth.checkUserStatus` (publicProcedure)

- **Issue:** Unauthenticated callers can send any email and receive:
  - `exists`: whether a user with that email exists.
  - `hasPassword`: whether that user has a password set.
- **Risks:** User enumeration (discover valid emails) and password-status disclosure (e.g. target accounts without passwords or prioritize credential stuffing).
- **Location:** `src/lib/api/routers/authRouter.ts` ~21–47.

**Fix (choose one):**

- **Option A (recommended):** Remove or deprecate this procedure. If the UI needs “does this user have a password?” only for the **current** user, use the existing `getPasswordStatus` (protected) instead.
- **Option B:** Restrict to authenticated callers and allow only the current user’s email: use `protectedProcedure` and require `input.email === ctx.session.user.email`; otherwise return a generic response (e.g. `exists: false`, `hasPassword: false`) or FORBIDDEN.
- **Option C:** If it must stay public (e.g. for a specific sign-in flow), return a single generic value (e.g. “proceed to sign-in”) and do not expose `exists` or `hasPassword`. Document the security tradeoff.

### 3.2 `admin.requestAccess` (publicProcedure)

- **Issue:** Intentionally public for “request access” before signup. Mutations (create/update `AccessRequest`) are appropriate for this flow. Two secondary concerns:
  - **Email enumeration:** Different messages for “already has access” vs “request already pending” reveal whether the email is on the allowlist or has a pending request.
  - **Abuse:** No rate limiting or CAPTCHA; attackers can spam access requests or probe many emails.
- **Location:** `src/lib/api/routers/adminRouter.ts` ~10–62.

**Fix (optional but recommended):**

- Use a single generic user-facing message for “already has access” and “request already pending” (e.g. “If this email is eligible, you’ll receive an email.”). Log the real reason server-side for admins.
- Add rate limiting (e.g. by IP and/or email) for `requestAccess` to limit spam and enumeration speed.
- Consider CAPTCHA or similar for the request-access form to reduce automation.

---

## 4. Procedures already correct (no change)

- **scheduleRouter:** `updateBlock`, `requestReschedule`, `applyReschedule`, `deleteBlock` all verify `block.studentId === student.id` before mutating. ✓  
- **studentRouter:** `updateClassSchedule` and `deleteClassSchedule` verify the class schedule belongs to the current student via `student.classSchedules.find(...)`. ✓  
- **toolRouter:** `recommend`, `recordSuggestion`, `optimizeExistingTool`, `analyzeDiagnostic` (and related task usage) verify `task.studentId === student.id` when a task is involved. ✓  
- **chatRouter.getConversation:** Verifies `conversation.studentId === student.id`. ✓  
- **chatRouter.getTaskConversation,** **sendTaskMessage,** **startDeepDive:** Task ownership is checked before using the task. ✓  

---

## 5. Implementation order

1. **High (IDOR):**  
   - taskRouter: `getClarificationQuestions`, `saveClarification`.  
   - chatRouter: `processMessage` (conversationId check), `completePlanningSession`, `commitPlanningSession`.
2. **Medium (information disclosure):**  
   - authRouter: restrict or remove `checkUserStatus` (Option A or B above).
3. **Low (hardening):**  
   - adminRouter: generic messages + rate limiting (and optionally CAPTCHA) for `requestAccess`.

---

## 6. Verification

After applying fixes:

- For each procedure that accepts a resource ID (`taskId`, `conversationId`, `blockId`, etc.), confirm in code that:
  - The resource is loaded by ID.
  - Ownership is checked (e.g. `resource.studentId === student.id` or equivalent).
  - Mutations or sensitive reads only proceed after that check.
- Run the test suite and any integration tests that hit these procedures.
- Manually test: with two users (A and B), ensure A cannot read or modify B’s tasks, conversations, or schedule blocks by substituting B’s IDs.

---

## 7. Summary table

| Location | Procedure | Issue | Fix |
|----------|-----------|--------|-----|
| taskRouter | getClarificationQuestions | IDOR: no task ownership check | Resolve student from ctx; require task.studentId === student.id |
| taskRouter | saveClarification | IDOR: no task ownership check | Resolve student from ctx; require task.studentId === student.id before update |
| chatRouter | processMessage | Conversation ID not validated | After findUnique by conversationId, require conversation.studentId === studentId |
| chatRouter | completePlanningSession | Conversation ID not validated | Require conversation.studentId === student.id after fetch |
| chatRouter | commitPlanningSession | Conversation ID not validated | Require conversation.studentId === student.id after fetch |
| authRouter | checkUserStatus | User/password enumeration (public) | Remove, or restrict to same-user only |
| adminRouter | requestAccess | Enumeration + spam (public) | Generic messages; add rate limiting (and optionally CAPTCHA) |

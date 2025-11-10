-- Enable Row Level Security on all tables
-- This migration enables RLS to protect against direct database access via PostgREST
-- Prisma operations use service role which automatically bypasses RLS

-- IMPORTANT NOTES:
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. These policies protect against PostgREST access and direct SQL access
-- 3. Policies are designed to deny anonymous access while allowing service role
-- 4. Future: If migrating to Supabase Auth, update policies to use auth.uid()

-- ============================================================================
-- USER TABLE
-- ============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service role bypasses this automatically)
-- Future: Add policy for authenticated users to read/update own profile
CREATE POLICY "Deny all access to User"
  ON "User"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- ACCOUNT TABLE (NextAuth)
-- ============================================================================
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

-- Deny all access (service role bypasses, NextAuth uses service role)
CREATE POLICY "Deny all access to Account"
  ON "Account"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- SESSION TABLE (NextAuth)
-- ============================================================================
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;

-- Deny all access (service role bypasses, NextAuth uses service role)
CREATE POLICY "Deny all access to Session"
  ON "Session"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- VERIFICATION TOKEN TABLE (NextAuth)
-- ============================================================================
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;

-- Deny all access (service role bypasses, NextAuth uses service role)
CREATE POLICY "Deny all access to VerificationToken"
  ON "VerificationToken"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- STUDENT TABLE
-- ============================================================================
ALTER TABLE "Student" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to read/update own profile
-- Example: USING (auth.uid()::text = "userId")
CREATE POLICY "Deny all access to Student"
  ON "Student"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- TASK TABLE
-- ============================================================================
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own tasks
-- Example: USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
CREATE POLICY "Deny all access to Task"
  ON "Task"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- CONVERSATION TABLE
-- ============================================================================
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own conversations
CREATE POLICY "Deny all access to Conversation"
  ON "Conversation"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- CLASS SCHEDULE TABLE
-- ============================================================================
ALTER TABLE "ClassSchedule" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own schedules
CREATE POLICY "Deny all access to ClassSchedule"
  ON "ClassSchedule"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- STUDENT PREFERENCES TABLE
-- ============================================================================
ALTER TABLE "StudentPreferences" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own preferences
CREATE POLICY "Deny all access to StudentPreferences"
  ON "StudentPreferences"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- ALLOWLIST TABLE (Admin only)
-- ============================================================================
ALTER TABLE "Allowlist" ENABLE ROW LEVEL SECURITY;

-- Deny all access (admin operations use service role which bypasses RLS)
CREATE POLICY "Deny all access to Allowlist"
  ON "Allowlist"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- ACCESS REQUEST TABLE
-- ============================================================================
ALTER TABLE "AccessRequest" ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create access requests (public endpoint)
-- This is safe because it only allows INSERT, not read/update
CREATE POLICY "Anyone can create access requests"
  ON "AccessRequest"
  FOR INSERT
  WITH CHECK (true);

-- Deny read/update/delete access (service role bypasses for admin operations)
CREATE POLICY "Deny read/update/delete access to AccessRequest"
  ON "AccessRequest"
  FOR SELECT
  USING (false);

CREATE POLICY "Deny update access to AccessRequest"
  ON "AccessRequest"
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny delete access to AccessRequest"
  ON "AccessRequest"
  FOR DELETE
  USING (false);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. These policies protect against PostgREST and direct SQL access
-- 3. All application operations continue to work via Prisma
-- 4. Future: If migrating to Supabase Auth, add policies using auth.uid()
-- 5. To add user-specific policies later, use patterns like:
--    - USING (auth.uid()::text = "userId")
--    - USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
--
-- NOTE: _prisma_migrations table is NOT included in this migration because:
-- - It's Prisma's internal system table
-- - Enabling RLS on it causes issues with Prisma's migration system
-- - It's not exposed via PostgREST by default
-- - The Supabase warning for this table can be safely ignored or handled
--   separately via Supabase dashboard if needed

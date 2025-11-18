-- Enable Row Level Security on ScheduleBlock table
-- This migration enables RLS to protect against direct database access via PostgREST
-- Prisma operations use service role which automatically bypasses RLS

-- ============================================================================
-- SCHEDULE BLOCK TABLE
-- ============================================================================
ALTER TABLE "ScheduleBlock" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service role bypasses this automatically)
-- Future: Add policy for authenticated users to read/update own schedule blocks
-- Example: USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
CREATE POLICY "Deny all access to ScheduleBlock"
  ON "ScheduleBlock"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. This policy protects against PostgREST and direct SQL access
-- 3. All application operations continue to work via Prisma
-- 4. Future: If migrating to Supabase Auth, add policies using auth.uid()


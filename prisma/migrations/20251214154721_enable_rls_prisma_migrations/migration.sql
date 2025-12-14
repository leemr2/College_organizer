-- Enable Row Level Security on _prisma_migrations table
-- This migration enables RLS to satisfy Supabase security requirements
-- while allowing Prisma migrations to continue working via service role

-- IMPORTANT NOTES:
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. This policy protects against PostgREST and direct SQL access
-- 3. All Prisma migration operations continue to work normally
-- 4. This table is internal to Prisma and should not be accessed directly

-- ============================================================================
-- _PRISMA_MIGRATIONS TABLE
-- ============================================================================
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service role bypasses this automatically)
-- Prisma uses service role which bypasses RLS, so migrations will work
CREATE POLICY "Deny all access to _prisma_migrations"
  ON "_prisma_migrations"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. This policy protects against PostgREST and direct SQL access  
-- 3. All Prisma migration operations continue to work via service role
-- 4. This table is not exposed via PostgREST by default
-- 5. DO NOT modify these policies - they are designed to work with Prisma

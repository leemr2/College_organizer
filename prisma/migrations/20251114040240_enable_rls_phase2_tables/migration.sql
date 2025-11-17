-- Enable Row Level Security on Phase 2 tables
-- This migration enables RLS on Tool, StudentTool, ToolSuggestion, and EffectivenessLog
-- Prisma operations use service role which automatically bypasses RLS

-- IMPORTANT NOTES:
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. These policies protect against PostgREST access and direct SQL access
-- 3. Policies are designed to deny anonymous access while allowing service role
-- 4. Future: If migrating to Supabase Auth, update policies to use auth.uid()

-- ============================================================================
-- TOOL TABLE (Phase 2)
-- ============================================================================
ALTER TABLE "Tool" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default (service role bypasses, Prisma uses service role)
-- Tools are accessed through tRPC API, not directly
-- Future: If using PostgREST, add policy to allow SELECT for authenticated users
CREATE POLICY "Deny all access to Tool"
  ON "Tool"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- STUDENT TOOL TABLE (Phase 2)
-- ============================================================================
ALTER TABLE "StudentTool" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own student-tool relationships
-- Example: USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
CREATE POLICY "Deny all access to StudentTool"
  ON "StudentTool"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- TOOL SUGGESTION TABLE (Phase 2)
-- ============================================================================
ALTER TABLE "ToolSuggestion" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to read/update own suggestions
-- Example: USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
CREATE POLICY "Deny all access to ToolSuggestion"
  ON "ToolSuggestion"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- EFFECTIVENESS LOG TABLE (Phase 2)
-- ============================================================================
ALTER TABLE "EffectivenessLog" ENABLE ROW LEVEL SECURITY;

-- Deny all access by default
-- Future: Add policy for authenticated users to manage own effectiveness logs
-- Example: USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
CREATE POLICY "Deny all access to EffectivenessLog"
  ON "EffectivenessLog"
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Service role connections (used by Prisma) automatically bypass RLS
-- 2. These policies protect against PostgREST and direct SQL access
-- 3. All application operations continue to work via Prisma
-- 4. Future: If migrating to Supabase Auth, add policies using auth.uid()
-- 5. To add user-specific policies later, use patterns like:
--    - USING ("studentId" IN (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))
--    - USING ("studentId" = (SELECT id FROM "Student" WHERE "userId" = auth.uid()::text))

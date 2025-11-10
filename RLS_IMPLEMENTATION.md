# Row Level Security (RLS) Implementation

## Overview
This document describes the RLS implementation that addresses all Supabase security warnings. RLS has been enabled on all tables in the public schema to protect against direct database access.

## Migration
**File**: `prisma/migrations/20251110184900_enable_row_level_security/migration.sql`

## Tables Protected
All application tables now have RLS enabled:
- ✅ `User`
- ✅ `Account`
- ✅ `Session`
- ✅ `VerificationToken`
- ✅ `Student`
- ✅ `Task`
- ✅ `Conversation`
- ✅ `ClassSchedule`
- ✅ `StudentPreferences`
- ✅ `Allowlist`
- ✅ `AccessRequest`

**Note**: `_prisma_migrations` is NOT included because:
- It's Prisma's internal system table
- Enabling RLS on it causes issues with Prisma's migration system
- It's not exposed via PostgREST by default
- The Supabase warning for this table can be safely ignored or handled separately via Supabase dashboard

## Security Model

### How It Works
1. **Service Role Bypass**: Prisma uses service role connections which automatically bypass RLS. All your application operations continue to work normally.

2. **PostgREST Protection**: RLS policies protect against:
   - Direct PostgREST API access
   - Accidental exposure via Supabase dashboard
   - Direct SQL queries from unauthorized users

3. **Default Deny**: All tables have deny-all policies by default. Only service role (Prisma) can access them.

### Policy Strategy
- **User Data Tables**: Deny all access (service role bypasses)
- **Auth Tables**: Deny all access (NextAuth uses service role)
- **Admin Tables**: Deny all access (admin operations use service role)
- **AccessRequest**: Allow public INSERT (for access requests), deny all other operations

## Applying the Migration

### Prerequisites
1. Ensure your database is running and accessible
2. Verify `DATABASE_URL` and `DIRECT_URL` are set correctly
3. Ensure you have database connection

### Apply Migration
```bash
npx prisma migrate dev
```

This will:
- Apply the RLS policies to all tables
- Enable RLS on all tables
- Verify the migration succeeds

### Verify It Works
After applying, test your application:
```bash
npm run build
npm run dev
```

All Prisma operations should continue to work normally because they use service role.

## Future Enhancements

If you migrate to Supabase Auth in the future, you can add user-specific policies. Example patterns:

```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON "User"
  FOR SELECT
  USING (auth.uid()::text = id);

-- Allow students to manage their own tasks
CREATE POLICY "Students can manage own tasks"
  ON "Task"
  FOR ALL
  USING (
    "studentId" IN (
      SELECT id FROM "Student" WHERE "userId" = auth.uid()::text
    )
  );
```

## Supabase Security Linter

After applying this migration, run the Supabase security linter again. All warnings should be resolved:
- ✅ RLS enabled on all public tables
- ✅ Policies in place for all tables
- ✅ Protection against unauthorized access

## Troubleshooting

### Migration Fails
- Check database connection
- Verify Supabase project is not paused
- Ensure connection strings are correct

### Application Errors After Migration
- Prisma operations should not be affected (service role bypasses RLS)
- If you see RLS errors, check that you're using service role connection string
- Verify `DATABASE_URL` uses service role (not anon key)

### PostgREST Access Denied
- This is expected! RLS is working correctly
- Use Prisma for all database operations
- Service role connections bypass RLS automatically

## Notes

1. **Service Role**: Your `DATABASE_URL` should use the service role connection string from Supabase. This is the default for Prisma.

2. **No Breaking Changes**: This migration does not change your application code. All Prisma operations continue to work.

3. **Defense in Depth**: RLS adds an additional security layer even though your application already has authorization via tRPC.

4. **_prisma_migrations**: This table is NOT included in the migration because enabling RLS on it breaks Prisma's migration system. The Supabase warning for this table can be safely ignored, or you can enable RLS on it separately via Supabase dashboard if needed (though not recommended).


# Supabase Connection Issue - Sudden Failure

## Symptoms
- Connection was working, then stopped mid-use
- Both local and deployed (Vercel) are affected
- Network connectivity tests pass
- DNS resolution works
- Prisma cannot connect (even with IP address)
- Supabase console shows no issues, database not paused

## Root Cause Analysis

Common causes for sudden connection failures:
1. **Connection pooler stuck** - Database restart fixes this (most common for sudden failures)
2. **Supabase pooler endpoint changed/rotated** - Requires fresh connection string
3. **SSL/TLS certificate issue** - Usually resolved by restart or connection string refresh
4. **Network restrictions applied** - Check Supabase Dashboard settings
5. **Connection string needs refresh** - Get new string from Supabase Dashboard

## Immediate Fix Steps

### Step 0: Try Restarting Database (Quick Fix)

**If connection suddenly stops working with no changes:**
1. Go to Supabase Dashboard → Settings → Database
2. Scroll to **"Restart database"** or **"Pause/Resume"** section
3. Click **"Restart"** or **"Resume"** if paused
4. Wait 1-2 minutes for database to fully restart
5. Test connection again

**Why this works:** Sometimes the connection pooler gets stuck or connections aren't properly released. Restarting clears the connection pool and resets the connection state.

**Note:** This is often the quickest fix for sudden connection failures with no configuration changes.

### Step 1: Get Fresh Connection String from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **"Session Pooler"** (port 5432)
6. **Copy the ENTIRE connection string** (don't type it)
7. Verify it includes `?sslmode=require` at the end

### Step 2: Update Local .env

Replace `DATABASE_URL` in your `.env` file with the fresh connection string:

```bash
DATABASE_URL="<paste-fresh-connection-string-here>"
```

### Step 3: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL`
5. **Delete** the old value
6. **Paste** the fresh connection string
7. **Verify** it's set for **Production** environment
8. Save and redeploy

### Step 4: Test Connection

```bash
npx tsx scripts/test-db-connection-local.ts
```

## Additional Checks

### Check Supabase Network Restrictions

1. Supabase Dashboard → Settings → Database
2. Check **"Network Restrictions"** section
3. Ensure your IP or "Allow all" is enabled
4. If restrictions were added, your IP might be blocked

### Check Supabase Status

- Visit https://status.supabase.com
- Check for any ongoing incidents
- Look for pooler/connection issues

### Verify Database Password

1. Supabase Dashboard → Settings → Database
2. Check if password was reset
3. If reset, get new connection string with updated password

### Try Direct Connection (Temporary)

If Session Pooler continues to fail, try Direct connection temporarily:

1. Supabase Dashboard → Settings → Database → Connection string
2. Select **"Direct connection"**
3. Copy connection string
4. Update `.env` and test

**Note:** Direct connection might have IPv4 compatibility issues, but can help diagnose if it's a pooler-specific problem.

## Why This Happens

Supabase occasionally:
- Rotates pooler endpoints for maintenance
- Updates SSL certificates
- Changes network configurations
- Applies security updates

When this happens, old connection strings stop working even though the database is still active.

## Prevention

1. **Monitor Supabase status page** for maintenance announcements
2. **Use environment variables** (never hardcode connection strings)
3. **Test connections regularly** to catch issues early
4. **Keep connection strings fresh** - refresh periodically
5. **Set up alerts** for database connection failures

## Verification After Fix

After updating connection strings:

1. ✅ Local connection test passes
2. ✅ Vercel deployment works
3. ✅ Can log in to application
4. ✅ Database queries succeed

## If Issue Persists

1. **Check Supabase logs**: Dashboard → Logs → Database
2. **Contact Supabase support** if status page shows no issues
3. **Try different connection method**: Direct vs Pooler
4. **Check for IP blocking**: Network restrictions
5. **Verify all environment variables** are correct


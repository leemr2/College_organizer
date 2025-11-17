# Fix: Database Connection Error on Vercel

## Error Message
```
Can't reach database server at `aws-1-`
```

## Problem
The database connection string in Vercel appears to be incomplete or malformed. The hostname is being truncated.

## Root Causes

1. **Incomplete Connection String**: The `DATABASE_URL` in Vercel might be missing the full hostname
2. **Missing SSL Parameter**: Connection string might be missing `?sslmode=require`
3. **Connection String Format Issue**: Special characters in password might need URL encoding
4. **Database Paused**: Supabase database might be paused

## Solutions

### Step 1: Verify Connection String Format

Your `DATABASE_URL` in Vercel should look like this (Session Pooler):

```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Important:**
- Must include the full hostname (not truncated)
- Must include `?sslmode=require` at the end
- Password with special characters must be URL-encoded
- Use Session Pooler (port 5432), NOT Transaction Pooler

### Step 2: Get Fresh Connection String from Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **"Session Pooler"** (port 5432)
6. Click the **copy icon** to copy the full connection string
7. **DO NOT** manually type it - always copy from Supabase

### Step 3: Update Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL`
5. **Delete** the existing value
6. **Paste** the fresh connection string from Supabase
7. **Verify** it includes:
   - Full hostname (e.g., `aws-0-us-east-2.pooler.supabase.com`)
   - Port `5432`
   - `?sslmode=require` at the end
8. Save changes

### Step 4: Check for Special Characters in Password

If your database password contains special characters (`@`, `#`, `%`, `&`, etc.), they need to be URL-encoded:

- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- `&` → `%26`
- `/` → `%2F`
- `:` → `%3A`
- `?` → `%3F`
- `=` → `%3D`

**Example:**
If your password is `p@ss#word`, it should be `p%40ss%23word` in the connection string.

### Step 5: Try Restarting Database

**Quick Fix for Sudden Connection Failures:**
1. Go to Supabase Dashboard → Settings → Database
2. Look for **"Restart database"** or **"Pause/Resume"** option
3. Click **"Restart"** (or **"Resume"** if paused)
4. Wait 1-2 minutes for database to fully restart
5. Test connection again

**Why this works:** Connection poolers can get stuck. Restarting clears connection pools and resets the connection state.

### Step 6: Verify Database is Active

1. Go to Supabase Dashboard
2. Check if your project shows "Active" (not "Paused")
3. If paused, click "Restore" and wait 1-2 minutes

### Step 7: Test Connection String Locally

Before deploying, test the connection string:

```bash
# Set the connection string
export DATABASE_URL="your-connection-string-from-vercel"

# Test connection
npx prisma db execute --stdin --schema prisma/schema.prisma
```

If this fails locally, the connection string is wrong.

### Step 8: Redeploy on Vercel

After updating the environment variable:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "Redeploy" on the latest deployment
3. Or push a new commit to trigger auto-deploy

## Common Mistakes

❌ **Truncated hostname**: `aws-1-` instead of `aws-0-us-east-2.pooler.supabase.com`
❌ **Missing SSL**: No `?sslmode=require`
❌ **Wrong port**: Using `6543` (Transaction Pooler) instead of `5432`
❌ **Special characters not encoded**: Password with `@` or `#` breaks the URL
❌ **Manually typed**: Always copy from Supabase dashboard

## Verification

After fixing, check Vercel logs:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on latest deployment → **Functions** tab
3. Look for successful database connections
4. Try logging in again

## Still Not Working?

1. **Check Vercel logs** for the full error message
2. **Verify** `DATABASE_URL` is set for **Production** environment (not just Preview)
3. **Test** the connection string locally with the same value from Vercel
4. **Reset** your Supabase database password and get a fresh connection string
5. **Check** Supabase status page for any incidents


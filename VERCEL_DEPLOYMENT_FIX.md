# Fix: Login Issues on Vercel with Supabase

## Problem
After deploying to Vercel with Transaction Pooler (port 6543), user login fails.

## Root Cause
Transaction Pooler (port 6543) doesn't support prepared statements, which Prisma requires. NextAuth with PrismaAdapter needs Session Pooler.

## Solution

### Step 1: Get Session Pooler Connection String
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Database**
4. Scroll to **Connection string**
5. Select **"Session Pooler"** (port 5432)
6. Copy the connection string
7. Ensure it includes `?sslmode=require` (add if missing)

### Step 2: Update Vercel Environment Variables
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Find `DATABASE_URL`
5. Update it with the Session Pooler connection string (port 5432)
6. Save changes

### Step 3: Redeploy
- Vercel will auto-redeploy if you have auto-deploy enabled
- Or manually trigger a new deployment

## Connection String Format

**Correct (Session Pooler):**
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require
```

**Wrong (Transaction Pooler - doesn't work with Prisma):**
```
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require
```

## Why Session Pooler?
- ✅ Supports prepared statements (required by Prisma)
- ✅ Supports session state (required by NextAuth database sessions)
- ✅ Works with ORMs and complex queries
- ✅ Still provides connection pooling benefits

## Why NOT Transaction Pooler?
- ❌ No prepared statements
- ❌ No session state
- ❌ Limited transaction support
- ❌ Breaks Prisma/NextAuth

## After Fix
Your login should work correctly. Both `DATABASE_URL` and `DIRECT_URL` should use Session Pooler (port 5432) for Prisma/NextAuth applications.


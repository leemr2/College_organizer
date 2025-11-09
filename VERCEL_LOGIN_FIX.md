# Fix: Email Link Login Not Working on Vercel

## Problem
After clicking the email verification link, you're redirected back to the login page instead of being logged in.

## Root Causes

### 1. Email Not on Allowlist (Most Common)
In production, your email **must** be in the allowlist. The `signIn` callback checks this and rejects sign-ins if the email isn't allowed.

### 2. NEXTAUTH_URL Not Set Correctly
If `NEXTAUTH_URL` is wrong or missing in Vercel, the callback URLs in email links won't work.

## Solutions

### Solution 1: Add Your Email to Allowlist

**Option A: Using Prisma Script (Recommended)**

1. Run locally with your production database URL:
```bash
# Set your production DATABASE_URL temporarily
export DATABASE_URL="your-production-database-url"

# Add your email to allowlist
npx tsx scripts/add-to-allowlist.ts your-email@example.com
```

**Option B: Using Prisma Studio**

1. Run Prisma Studio:
```bash
DATABASE_URL="your-production-database-url" npx prisma studio
```

2. Open the `Allowlist` table
3. Click "Add record"
4. Enter your email address
5. Save

**Option C: Direct SQL (if you have database access)**

```sql
INSERT INTO "Allowlist" (id, email, "createdAt")
VALUES (gen_random_uuid()::text, 'your-email@example.com', NOW());
```

### Solution 2: Verify NEXTAUTH_URL in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Check that `NEXTAUTH_URL` is set to your production URL:
   ```
   https://your-app.vercel.app
   ```
3. Make sure there's no trailing slash
4. Redeploy if you changed it

### Solution 3: Check Vercel Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Go to "Functions" tab
4. Check the logs for errors like:
   - `Access denied: [email] is not on allowlist`
   - `SignIn callback error`

## Verification Steps

After adding your email to the allowlist:

1. Request a new sign-in link (the old one may have expired)
2. Click the link in your email
3. You should be redirected to your app and logged in

## Temporary Workaround (Development Only)

If you need to test without allowlist, you can temporarily disable the check in `src/lib/auth/index.ts`:

```typescript
// TEMPORARY: Disable allowlist check for testing
if (false && process.env.NODE_ENV === "production") {
  // ... allowlist check
}
```

**⚠️ WARNING:** Only do this for testing. Re-enable it before deploying to production.

## Prevention

For future deployments:
1. Add your email to the allowlist before deploying
2. Set up an admin account to manage the allowlist via the admin dashboard
3. Use the "Request Access" feature on the sign-in page for new users


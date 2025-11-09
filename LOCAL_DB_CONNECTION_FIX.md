# Fix: Local Database Connection Issues - RESOLVED

## Problem (RESOLVED)
- Network connectivity works (Test-NetConnection succeeds)
- Prisma can't connect to `aws-1-us-east-2.pooler.supabase.com:5432`
- Error: `P1001: Can't reach database server`
- **Root Cause**: Node.js DNS resolution order issue

## Solution: Force IPv4-First DNS Resolution

Node.js was having issues with DNS resolution. The fix is to force Node.js to prefer IPv4 addresses.

### Permanent Fix (Applied)

The `NODE_OPTIONS` environment variable has been set to `--dns-result-order=ipv4first` as a user environment variable.

**This setting:**
- ✅ Forces Node.js to use IPv4 addresses first when resolving hostnames
- ✅ Works with Session Pooler hostname (no need to use IP address)
- ✅ Persists across terminal sessions
- ✅ Applies to all Node.js processes

### Verification

To verify the fix is working:
```bash
npx tsx scripts/test-db-connection-local.ts
```

You should see:
- ✅ Successfully connected to database!
- ✅ Database query successful
- ✅ Can access User table

### If You Need to Apply Manually

If the environment variable isn't set, you can set it:

**For current session:**
```powershell
$env:NODE_OPTIONS="--dns-result-order=ipv4first"
```

**Permanently (User-level):**
```powershell
[System.Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--dns-result-order=ipv4first", "User")
```

**Note:** After setting permanently, restart your terminal/PowerShell for it to take effect.

### Connection String Format

Your `.env` should use the hostname (not IP address):
```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"
```

### Why This Works

- Windows DNS resolves the hostname to IPv4 addresses correctly
- Node.js was trying IPv6 first (or had DNS resolution issues)
- Forcing IPv4-first ensures Node.js uses the correct IP addresses
- This is a common issue on Windows with Node.js and cloud databases

### Troubleshooting

If connection still fails after setting NODE_OPTIONS:

1. **Restart PowerShell/Terminal** - Environment variables need a new session
2. **Verify NODE_OPTIONS is set:**
   ```powershell
   [System.Environment]::GetEnvironmentVariable("NODE_OPTIONS", "User")
   ```
3. **Check Windows Firewall** - Ensure Node.js is allowed
4. **Check Antivirus** - May be blocking Node.js connections
5. **Try different network** - VPN or network restrictions might interfere

## Summary

✅ **Fixed**: Node.js DNS resolution issue resolved by setting `NODE_OPTIONS=--dns-result-order=ipv4first`
✅ **Connection**: Works with Session Pooler hostname
✅ **Persistence**: Setting is saved as user environment variable

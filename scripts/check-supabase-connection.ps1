# Script to check Supabase connection and get troubleshooting info

Write-Host "=== Supabase Connection Troubleshooting ===" -ForegroundColor Cyan
Write-Host ""

# Check network connectivity
Write-Host "1. Testing network connectivity..." -ForegroundColor Yellow
$hostname = "aws-1-us-east-2.pooler.supabase.com"
$test = Test-NetConnection -ComputerName $hostname -Port 5432 -InformationLevel Quiet
if ($test) {
    Write-Host "   ✅ Network connectivity: OK" -ForegroundColor Green
} else {
    Write-Host "   ❌ Network connectivity: FAILED" -ForegroundColor Red
}

# Check DNS resolution
Write-Host "`n2. Checking DNS resolution..." -ForegroundColor Yellow
try {
    $addresses = [System.Net.Dns]::GetHostAddresses($hostname)
    Write-Host "   ✅ DNS resolves to:" -ForegroundColor Green
    $addresses | ForEach-Object { Write-Host "      - $($_.IPAddressToString) ($($_.AddressFamily))" }
} catch {
    Write-Host "   ❌ DNS resolution failed: $_" -ForegroundColor Red
}

# Check NODE_OPTIONS
Write-Host "`n3. Checking NODE_OPTIONS..." -ForegroundColor Yellow
$nodeOpts = [System.Environment]::GetEnvironmentVariable("NODE_OPTIONS", "User")
if ($nodeOpts) {
    Write-Host "   ✅ NODE_OPTIONS: $nodeOpts" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  NODE_OPTIONS: Not set" -ForegroundColor Yellow
}

# Check connection string format
Write-Host "`n4. Checking connection string..." -ForegroundColor Yellow
$envContent = Get-Content .env -ErrorAction SilentlyContinue
if ($envContent) {
    $dbUrl = ($envContent | Select-String -Pattern '^DATABASE_URL=').Line -replace '^DATABASE_URL=', '' -replace '"', ''
    if ($dbUrl) {
        Write-Host "   ✅ DATABASE_URL found" -ForegroundColor Green
        $masked = $dbUrl -replace ':[^:@]+@', ':***@'
        Write-Host "   Format: $masked"
        
        # Check components
        if ($dbUrl -match '@([^:]+):(\d+)/') {
            $host = $matches[1]
            $port = $matches[2]
            Write-Host "   Hostname: $host"
            Write-Host "   Port: $port"
        }
        
        if ($dbUrl -match '\?sslmode=require') {
            Write-Host "   ✅ SSL mode: require" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  SSL mode: Missing" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ DATABASE_URL not found in .env" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ .env file not found" -ForegroundColor Red
}

Write-Host "`n=== Recommendations ===" -ForegroundColor Cyan
Write-Host "1. Get FRESH connection string from Supabase Dashboard"
Write-Host "   - Settings → Database → Connection string → Session Pooler"
Write-Host "2. Check Supabase status: https://status.supabase.com"
Write-Host "3. Verify network restrictions in Supabase Dashboard"
Write-Host "4. Check if database password was reset"
Write-Host "5. Try Direct connection string if pooler fails"


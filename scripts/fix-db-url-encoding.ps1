# Script to fix DATABASE_URL encoding issues in .env file
# Handles special characters in passwords that need URL encoding

$envFile = ".env"
$content = Get-Content $envFile -Raw

# Find DATABASE_URL line
if ($content -match '(?m)^DATABASE_URL=(.+)$') {
    $fullLine = $matches[0]
    $url = $matches[1].Trim('"', "'")
    
    Write-Host "Found DATABASE_URL"
    Write-Host "Original: $($url -replace ':[^:@]+@', ':***@')"
    
    # Extract password
    if ($url -match 'postgresql://[^:]+:([^@]+)@') {
        $password = $matches[1]
        Write-Host "Password length: $($password.Length)"
        
        # Check if password needs encoding
        $needsEncoding = $false
        $specialChars = @('!', '@', '#', '$', '%', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/')
        
        foreach ($char in $specialChars) {
            if ($password -like "*$char*") {
                Write-Host "⚠️ Found special character: $char"
                $needsEncoding = $true
            }
        }
        
        if ($needsEncoding) {
            Write-Host "`nEncoding password..."
            # URL encode the password
            Add-Type -AssemblyName System.Web
            $encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)
            
            # Replace password in URL
            $newUrl = $url -replace ":$password@", ":$encodedPassword@"
            
            Write-Host "New URL: $($newUrl -replace ':[^:@]+@', ':***@')"
            
            # Update .env file
            $newContent = $content -replace [regex]::Escape($fullLine), "DATABASE_URL=`"$newUrl`""
            Set-Content -Path $envFile -Value $newContent -NoNewline
            
            Write-Host "`n✅ Updated .env file with URL-encoded password"
            Write-Host "Please test the connection now"
        } else {
            Write-Host "`n✅ Password doesn't need encoding"
        }
    } else {
        Write-Host "❌ Could not extract password from connection string"
    }
} else {
    Write-Host "❌ DATABASE_URL not found in .env file"
}


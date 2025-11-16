# PowerShell script to automatically update mobile app IP configuration

Write-Host "🔍 Detecting network IP address..." -ForegroundColor Cyan

# Get the primary non-loopback IPv4 address
$networkIP = Get-NetIPAddress -AddressFamily IPv4 | 
    Where-Object {
        $_.InterfaceAlias -notlike "*Loopback*" -and 
        $_.InterfaceAlias -notlike "*Bluetooth*" -and
        $_.IPAddress -notlike "169.254.*"
    } | 
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $networkIP) {
    Write-Host "❌ Could not detect network IP. Please check your network connection." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Detected IP: $networkIP" -ForegroundColor Green

# Update app/.env file
$envPath = ".\app\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Replace the API URL with new IP
    $newContent = $envContent -replace 'EXPO_PUBLIC_API_URL=http://\d+\.\d+\.\d+\.\d+:5000/api', "EXPO_PUBLIC_API_URL=http://${networkIP}:5000/api"
    
    # Update the current IP comment
    $newContent = $newContent -replace '# Current IP: \d+\.\d+\.\d+\.\d+', "# Current IP: $networkIP"
    
    Set-Content -Path $envPath -Value $newContent -NoNewline
    
    Write-Host "✅ Updated $envPath with new IP" -ForegroundColor Green
} else {
    Write-Host "❌ Could not find $envPath" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📱 Mobile App Configuration Updated!" -ForegroundColor Green
Write-Host "   API URL: http://${networkIP}:5000/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart the backend server: cd backend && npm start" -ForegroundColor White
Write-Host "2. Restart Expo: cd app && npx expo start" -ForegroundColor White
Write-Host "3. Press 'r' in Expo to reload the app" -ForegroundColor White
Write-Host ""

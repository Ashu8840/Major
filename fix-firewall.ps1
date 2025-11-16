# Windows Firewall Rule for Backend Server
# This script adds a rule to allow incoming connections on port 5000
# Run this in PowerShell as Administrator

Write-Host "Adding Windows Firewall rule for Node.js backend on port 5000..." -ForegroundColor Yellow

try {
    # Remove old rule if it exists
    Remove-NetFirewallRule -DisplayName "Node.js Major Backend" -ErrorAction SilentlyContinue
    
    # Add new rule
    New-NetFirewallRule -DisplayName "Node.js Major Backend" `
        -Direction Inbound `
        -LocalPort 5000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Private,Public `
        -Description "Allow incoming connections to Node.js backend server on port 5000"
    
    Write-Host "✅ SUCCESS! Firewall rule added." -ForegroundColor Green
    Write-Host "Your mobile device should now be able to connect to the backend." -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: $_" -ForegroundColor Red
    Write-Host "Make sure you're running PowerShell as Administrator." -ForegroundColor Red
}

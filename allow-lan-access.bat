@echo off
:: Opens port 5173 in Windows Firewall so other devices on your Wi-Fi can
:: reach the MyBodyWeight dev server. Only allows the 192.168.2.0/24 subnet
:: (your local network), not the open internet.
::
:: Double-click this file. Click "Yes" on the Windows security prompt that
:: appears (it needs administrator rights to add a firewall rule).

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrator access...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

powershell -NoProfile -Command "New-NetFirewallRule -DisplayName 'MyBodyWeight dev server (LAN only)' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5173 -RemoteAddress 192.168.2.0/24 -Profile Any -ErrorAction SilentlyContinue | Out-Null; if (Get-NetFirewallRule -DisplayName 'MyBodyWeight dev server (LAN only)' -ErrorAction SilentlyContinue) { Write-Host 'Firewall rule added. Port 5173 is now open to your local network.' -ForegroundColor Green } else { Write-Host 'Something went wrong adding the rule.' -ForegroundColor Red }"

echo.
echo Done. You can close this window.
pause

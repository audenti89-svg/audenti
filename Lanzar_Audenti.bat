@echo off
TITLE Audenti System Launcher - Clean Version
echo ========================================================
echo    LAUNCHING AUDENTI CRM SYSTEM...
echo ========================================================

:: Start Next.js Web App (The Brain/CRM)
echo [1/1] Starting Audenti Web App (CRM)...
start "Audenti CRM" cmd /k "cd /d D:\Antigravity 2027\Odontologia\AppWeb CRM\audenti && npm run dev"

echo.
echo ========================================================
echo    SYSTEM ACTIVATED!
echo ========================================================
echo.
echo  CRM Dashboard: http://localhost:3000
echo.
echo  Note: WhatsApp now uses direct links (no server needed).
echo ========================================================
echo.
echo You can close this launcher window now.
pause

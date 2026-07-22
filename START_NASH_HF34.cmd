@echo off
setlocal
cd /d "%~dp0"
echo [NASH OS HF34] Releasing port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /PID %%a /F >nul 2>&1
echo [NASH OS HF34] Installing dependencies...
call npm.cmd install
if errorlevel 1 pause & exit /b 1
echo [NASH OS HF34] Starting role-bound access build...
start "NASH OS HF34 Server" cmd /k "npm.cmd start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000/?v=hf34-role-access-hotfix"
endlocal

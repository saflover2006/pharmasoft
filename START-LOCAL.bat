@echo off
title PharmaSOFT - Local Development
color 0A

echo.
echo ============================================================
echo   PharmaSOFT - Local Development Server Launcher
echo ============================================================
echo.
echo   1. POS Backend API  ---  http://localhost:3005
echo   2. POS Frontend     ---  http://localhost:5173
echo   3. Website          ---  http://localhost:3001
echo ============================================================
echo.

:: Kill processes on our ports
echo [*] Stopping old servers if any...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3005 \|:5173 \|:3001 "') do (
    taskkill /PID %%a /F >nul 2^>^&1
)
timeout /t 1 /nobreak >nul

:: Install deps if needed
echo [*] Checking dependencies...

if not exist "apps\desktop\node_modules" (
    echo [*] Installing POS app dependencies...
    cd apps\desktop && npm install && cd ..\..
)
if not exist "website\node_modules" (
    echo [*] Installing Website dependencies...
    cd website && npm install && cd ..
)
if not exist "packages\database\node_modules" (
    echo [*] Installing database package...
    cd packages\database && npm install && cd ..\..
)
if not exist "packages\database\node_modules\.prisma" (
    echo [*] Generating Prisma client...
    cd packages\database && npx prisma generate && cd ..\..
)

echo.
echo [*] Starting all servers...
echo.

:: 1. Start POS Backend
echo [1/3] Starting POS Backend API  (port 3005)...
start "PharmaSOFT - Backend API" cmd /k "cd /d %~dp0apps\desktop && npm run server"
timeout /t 3 /nobreak >nul

:: 2. Start POS Frontend
echo [2/3] Starting POS Frontend     (port 5173)...
start "PharmaSOFT - POS Frontend" cmd /k "cd /d %~dp0apps\desktop && npm run dev"
timeout /t 3 /nobreak >nul

:: 3. Start Website
echo [3/3] Starting Website          (port 3001)...
start "PharmaSOFT - Website" cmd /k "cd /d %~dp0website && set PORT=3001 && node server.js"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo   All servers starting! Open in your browser:
echo.
echo   POS App:    http://localhost:5173
echo   API:        http://localhost:3005
echo   Website:    http://localhost:3001
echo ============================================================
echo.
echo Press any key to open both apps in browser...
pause >nul

start "" "http://localhost:5173"
timeout /t 1 /nobreak >nul
start "" "http://localhost:3001"

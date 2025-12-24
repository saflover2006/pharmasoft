@echo off
REM Daily Midnight Update - PharmaBest
REM Runs automatically at 00:00 every day
REM Updates: New medications + CNAM reimbursed list

cd /d %~dp0

echo ========================================
echo   PharmaBest - Daily Midnight Update
echo ========================================
echo Date: %date% %time%
echo.

REM Log the start
echo [%date% %time%] Starting daily update >> logs\daily-scheduler.log

REM Run the daily update
node daily-update.js >> logs\daily-scheduler.log 2>&1

REM Check result
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Daily update completed successfully >> logs\daily-scheduler.log
    echo.
    echo ✅ Daily update completed successfully!
) else (
    echo [%date% %time%] Daily update failed with error code %ERRORLEVEL% >> logs\daily-scheduler.log
    echo.
    echo ❌ Daily update failed! Check logs\daily-scheduler.log
)

REM Don't pause when run by Task Scheduler
if "%1"=="" pause

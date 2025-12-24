@echo off
REM Scheduled Medication Import - Windows Task Scheduler
REM Configure this in Windows Task Scheduler to run automatically

echo ========================================
echo   Scheduled Medication Import
echo ========================================
echo.

cd /d %~dp0

REM Log the execution
echo [%date% %time%] Starting scheduled import >> logs\scheduler.log

REM Run the automatic import
node import-auto.js all >> logs\scheduler.log 2>&1

REM Check if it succeeded
if %ERRORLEVEL% EQU 0 (
    echo [%date% %time%] Import completed successfully >> logs\scheduler.log
    echo.
    echo ✅ Import completed successfully!
) else (
    echo [%date% %time%] Import failed with error code %ERRORLEVEL% >> logs\scheduler.log
    echo.
    echo ❌ Import failed! Check logs\scheduler.log
)

pause

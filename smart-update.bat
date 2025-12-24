@echo off
REM Smart Auto-Update - Runs when internet connected
REM Only updates once per day (won't re-run if already updated today)

cd /d %~dp0

REM Silent mode - no pause, perfect for startup
node smart-update.js >> logs\smart-update.log 2>&1

REM Exit silently
exit

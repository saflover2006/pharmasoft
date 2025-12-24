@echo off
echo Stopping old servers...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting backend server...
start "PharmaBest Backend" cmd /k "npm run server"
timeout /t 3 /nobreak >nul

echo Starting frontend...
start "PharmaBest Frontend" cmd /k "npm run dev"

echo.
echo Both servers started!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo.
pause

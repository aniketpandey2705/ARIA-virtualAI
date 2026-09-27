@echo off
echo ============================================
echo   Starting ARIA Desktop App
echo ============================================
echo.

:: Start the Python backend server
echo [1/2] Starting Python backend server...
cd /d "%~dp0"
start /B cmd /c ".\venv\Scripts\python.exe backend\server.py"

:: Wait for the server to start
timeout /t 3 /nobreak >nul

:: Start the Electron app
echo [2/2] Launching Electron UI...
cd electron
call npx electron .

:: When Electron closes, kill the Python server
echo.
echo Shutting down...
taskkill /f /im python.exe 2>nul

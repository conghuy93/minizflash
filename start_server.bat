@echo off
echo ========================================
echo   ESP Web Flasher - Local Test Server
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo Please install Python 3.x from https://www.python.org/
    pause
    exit /b 1
)

REM Change to web directory
cd web

echo [INFO] Starting web server at http://localhost:8000
echo [INFO] Press Ctrl+C to stop the server
echo.
echo Open your browser and navigate to:
echo    http://localhost:8000
echo.

REM Start Python HTTP server
python -m http.server 8000

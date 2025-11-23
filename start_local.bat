@echo off
echo Starting ESP Web Flasher on port 8080...
echo.
echo Open browser at: http://localhost:8080
echo Press Ctrl+C to stop server
echo.
python -m http.server 8080
pause

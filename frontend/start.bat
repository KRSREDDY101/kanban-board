@echo off
cd /d "%~dp0"
echo Installing dependencies (React only)...
call npm install
if errorlevel 1 (
  echo npm failed. Install Node.js from https://nodejs.org/
  pause
  exit /b 1
)
echo.
echo Starting Pinboard UI at http://127.0.0.1:5173
echo Keep Django running: manage.py runserver
call npm run dev
pause

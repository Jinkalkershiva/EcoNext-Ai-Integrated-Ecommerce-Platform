@echo off
title EcoNext - Starting...
color 0A

echo.
echo ========================================
echo        ECONEXT - AI E-COMMERCE
echo ========================================
echo.
echo Starting both Backend and Frontend...
echo.
echo Backend will start on: http://127.0.0.1:8000
echo Frontend will start on: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop
echo.
echo ========================================
echo.

:: Start backend in new window
start "EcoNext Backend" cmd /k "cd backend && echo Starting Django Backend... && python manage.py runserver 8000"

:: Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

:: Start frontend in new window
start "EcoNext Frontend" cmd /k "cd frontend && echo Starting React Frontend... && npm start"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
echo Your browser will open automatically...
echo.
pause

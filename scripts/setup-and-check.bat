@echo off
echo ========================================
echo   EcoNext - Complete Startup Script
echo ========================================
echo.

echo [1/5] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.8+
    pause
    exit /b 1
)
echo OK - Python found
echo.

echo [2/5] Checking Node.js installation...
node --version
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js
    pause
    exit /b 1
)
echo OK - Node.js found
echo.

echo [3/5] Checking backend dependencies...
cd backend
pip show django >nul 2>&1
if errorlevel 1 (
    echo Installing backend dependencies...
    pip install -r requirements.txt
)
echo OK - Backend dependencies ready
echo.

echo [4/5] Running database migrations...
python manage.py makemigrations
python manage.py migrate
echo OK - Database ready
echo.

echo [5/5] Checking if data exists...
python manage.py shell -c "from products.models import Product; print('Products:', Product.objects.count())"
echo.

echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Double-click 'start-backend.bat' to start backend
echo 2. Double-click 'start-frontend.bat' to start frontend
echo 3. Open http://localhost:3000 in your browser
echo.
pause

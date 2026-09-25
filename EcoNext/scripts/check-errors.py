#!/usr/bin/env python
"""
EcoNext Project Error Checker
Scans the entire project for common errors and reports them
"""

import os
import sys
import subprocess

def check_python_syntax(directory):
    """Check all Python files for syntax errors"""
    print("\n[CHECK 1] Checking Python syntax...")
    errors = []
    for root, dirs, files in os.walk(directory):
        # Skip virtual environments and migrations
        if 'venv' in root or '__pycache__' in root or 'migrations' in root:
            continue
        
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        compile(f.read(), filepath, 'exec')
                except SyntaxError as e:
                    errors.append(f"{filepath}: {e}")
    
    if errors:
        print(f"  [ERROR] Found {len(errors)} syntax errors:")
        for error in errors:
            print(f"     - {error}")
        return False
    else:
        print("  [OK] No syntax errors found")
        return True

def check_imports(directory):
    """Check if all required packages are installed"""
    print("\n[CHECK 2] Checking Python imports...")
    required_packages = {
        'django': 'django',
        'djangorestframework': 'rest_framework',
        'django-cors-headers': 'corsheaders',
        'djangorestframework-simplejwt': 'rest_framework_simplejwt',
        'numpy': 'numpy',
        'pandas': 'pandas',
        'scikit-learn': 'sklearn',
        'Pillow': 'PIL',
        'opencv-python': 'cv2'
    }
    
    missing = []
    for package, import_name in required_packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing.append(package)
    
    if missing:
        print(f"  [ERROR] Missing packages: {', '.join(missing)}")
        print("     Run: pip install -r requirements.txt")
        return False
    else:
        print("  [OK] All required packages installed")
        return True

def check_database():
    """Check if database is set up"""
    print("\n[CHECK 3] Checking database...")
    db_file = 'backend/db.sqlite3'
    if not os.path.exists(db_file):
        print("  [ERROR] Database not found")
        print("     Run: python manage.py migrate")
        return False
    else:
        print("  [OK] Database exists")
        return True

def check_frontend_deps():
    """Check if frontend dependencies are installed"""
    print("\n[CHECK 4] Checking frontend dependencies...")
    node_modules = 'frontend/node_modules'
    if not os.path.exists(node_modules):
        print("  [ERROR] Frontend dependencies not installed")
        print("     Run: cd frontend && npm install")
        return False
    else:
        print("  [OK] Frontend dependencies installed")
        return True

def check_env_files():
    """Check for environment files"""
    print("\n[CHECK 5] Checking environment configuration...")
    warnings = []
    
    if not os.path.exists('backend/.env'):
        warnings.append("backend/.env not found (optional)")
    
    if not os.path.exists('frontend/.env'):
        warnings.append("frontend/.env not found (optional)")
    
    if warnings:
        print("  [WARNING] Warnings:")
        for warning in warnings:
            print(f"     - {warning}")
    else:
        print("  [OK] Environment files present")
    
    return True

def main():
    print("=" * 60)
    print("  EcoNext Project Error Checker")
    print("=" * 60)
    
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    checks = [
        check_python_syntax('backend'),
        check_imports('backend'),
        check_database(),
        check_frontend_deps(),
        check_env_files()
    ]
    
    print("\n" + "=" * 60)
    if all(checks):
        print("  [SUCCESS] ALL CHECKS PASSED - Project is ready to run!")
    else:
        print("  [FAILED] SOME CHECKS FAILED - Please fix the issues above")
    print("=" * 60)
    print("\nTo start the project:")
    print("  1. Run: start-backend.bat")
    print("  2. Run: start-frontend.bat")
    print("  3. Open: http://localhost:3000")
    print()

if __name__ == '__main__':
    main()

@echo off
echo ========================================
echo   Push to GitHub Repository
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git not found!
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

echo [INFO] Current directory: %cd%
echo.

REM Initialize git if not already
if not exist .git (
    echo [INFO] Initializing git repository...
    git init
    git branch -M main
)

REM Add all files
echo [INFO] Adding files...
git add .

REM Commit
echo [INFO] Creating commit...
git commit -m "ESP Web Flasher - Initial commit"

REM Add remote if not exists
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Adding remote origin...
    set /p REPO_URL="Enter your GitHub repository URL (https://github.com/conghuy93/minizflash.git): "
    git remote add origin %REPO_URL%
)

REM Push to GitHub
echo [INFO] Pushing to GitHub...
git push -u origin main

echo.
echo ========================================
echo   Push complete!
echo ========================================
echo.
echo Next steps:
echo 1. Go to https://github.com/conghuy93/minizflash/settings/pages
echo 2. Under "Build and deployment"
echo 3. Source: Select "GitHub Actions"
echo 4. Wait 2-3 minutes for deployment
echo 5. Visit: https://conghuy93.github.io/minizflash/
echo.
pause

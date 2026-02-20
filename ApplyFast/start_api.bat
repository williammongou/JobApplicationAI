@echo off
echo =======================================
echo  ApplyFast API Server - Quick Start
echo =======================================
echo.

REM Check if .env exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with your ANTHROPIC_API_KEY
    echo.
    echo Example:
    echo   ANTHROPIC_API_KEY=sk-ant-...
    echo.
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r requirements.txt

REM Start the API server
echo.
echo Starting ApplyFast API Server...
echo Server will be available at: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
python apply_fast_api.py

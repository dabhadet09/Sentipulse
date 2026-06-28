@echo off
echo Starting SentimentSense Backend...
cd /d "%~dp0backend"
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
python -m pip install -r requirements.txt -q
if not exist .env copy .env.example .env
python -m uvicorn app.main:app --reload --port 8000
if errorlevel 1 pause


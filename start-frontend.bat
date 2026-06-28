@echo off
echo Starting SentimentSense Frontend...
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing dependencies using NPM...
    call npm install
)
call npm run dev


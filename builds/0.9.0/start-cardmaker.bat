@echo off
cd /d "%~dp0"
echo Starting CardMaker development server...
start "" "http://localhost:5173"
npm run dev
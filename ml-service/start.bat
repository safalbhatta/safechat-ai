@echo off
setlocal

cd /d "%~dp0"

set CREATED_VENV=0

if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  py -m venv .venv 2>nul || python -m venv .venv
  set CREATED_VENV=1
)

if "%CREATED_VENV%"=="1" (
  echo Installing ML requirements...
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
)

echo Starting SafeChat ML service on http://127.0.0.1:8001
".venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 8001

endlocal

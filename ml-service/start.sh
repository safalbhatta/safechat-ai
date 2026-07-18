#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python"

# Create venv if it doesn't exist
if [ ! -f "$VENV_PYTHON" ]; then
    echo "Creating Python virtual environment..."
    if command -v python3 &>/dev/null; then
        python3 -m venv .venv
    elif command -v python &>/dev/null; then
        python -m venv .venv
    else
        echo "ERROR: Python was not found. Install Python 3 and try again." >&2
        exit 1
    fi
fi

# Install/update requirements if uvicorn is missing
if ! "$VENV_PYTHON" -c "import uvicorn" 2>/dev/null; then
    echo "Installing ML requirements..."
    "$VENV_PYTHON" -m pip install --upgrade pip
    "$VENV_PYTHON" -m pip install -r requirements.txt
fi

echo "Starting SafeChat ML service on http://127.0.0.1:8001"
"$VENV_PYTHON" -m uvicorn main:app --host 127.0.0.1 --port 8001

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$venvPython = Join-Path $PSScriptRoot ".venv\Scripts\python.exe"
$createdVenv = $false

if (-not (Test-Path $venvPython)) {
    Write-Host "Creating Python virtual environment..."

    if (Get-Command py -ErrorAction SilentlyContinue) {
        py -m venv .venv
    }
    elseif (Get-Command python -ErrorAction SilentlyContinue) {
        python -m venv .venv
    }
    else {
        throw "Python was not found. Install Python and try again."
    }

    $createdVenv = $true
}

if ($createdVenv) {
    Write-Host "Installing ML requirements..."
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r requirements.txt
}

Write-Host "Starting SafeChat ML service on http://127.0.0.1:8001"
& $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8001

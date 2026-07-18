# SafeChat AI model service

This service loads the exported SBERT + Logistic Regression model and exposes:

- `GET /health`
- `POST /predict`

## Windows PowerShell

```powershell
cd ml-service
Set-ExecutionPolicy -Scope Process Bypass
.\start.ps1
```

The first start may download `sentence-transformers/all-MiniLM-L6-v2`.
Keep the service running at `http://127.0.0.1:8001`.

Add this to `backend/.env`:

```env
ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT_MS=12000
ML_SAFETY_THRESHOLD=0.55
```

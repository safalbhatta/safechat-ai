# SafeChat AI local setup

SafeChat uses three local services:

- React frontend: `http://localhost:5173`
- Node/Express backend: `http://localhost:5002`
- Python ML service: `http://127.0.0.1:8001`

## 1. Backend environment

Create `backend/.env` locally. Do not commit it.

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_long_random_secret
PORT=5002

ML_SERVICE_URL=http://127.0.0.1:8001
ML_SERVICE_TIMEOUT_MS=12000
ML_SAFETY_THRESHOLD=0.55
```

## 2. Install and run the ML service

From the project root:

```powershell
cd ml-service
Set-ExecutionPolicy -Scope Process Bypass
.\start.ps1
```

The first run creates `.venv`, installs the Python packages, and downloads the SBERT encoder. Keep the terminal open.

Test it from another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/health
```

The response should contain `status: online` and `modelLoaded: True`.

## 3. Install and run the backend

```powershell
cd backend
npm install
npm run dev
```

## 4. Install and run the frontend

```powershell
cd frontend
npm install
npm run dev
```

## Updating the trained model

Stop the ML service, replace these two files, and start it again:

- `ml-service/models/sbert_logreg_classifier.joblib`
- `ml-service/models/model_metadata.json`

The classifier and metadata must come from the same Colab export.

## Files that must stay out of Git

- `backend/.env`
- `ml-service/.venv/`
- `backend/uploads/`
- `node_modules/`
- build output and Python cache files

The trained `.joblib` model and `model_metadata.json` should be committed so another developer can run the same classifier.

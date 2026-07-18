from __future__ import annotations

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = Path(os.getenv("MODEL_DIR", BASE_DIR / "models"))
CLASSIFIER_PATH = MODEL_DIR / "sbert_logreg_classifier.joblib"
METADATA_PATH = MODEL_DIR / "model_metadata.json"

app = FastAPI(
    title="SafeChat AI Classification Service",
    version="1.0.0",
    description="SBERT + Logistic Regression text-safety inference service.",
)


class PredictionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


class PredictionResponse(BaseModel):
    label: str
    confidence: float
    probabilities: Dict[str, float]
    modelVersion: str
    modelName: str
    latencyMs: float
    classifiedAt: str


class ModelRuntime:
    classifier = None
    encoder = None
    metadata: dict = {}
    started_at = datetime.now(timezone.utc).isoformat()
    load_error: str | None = None


runtime = ModelRuntime()


def load_runtime() -> None:
    try:
        if not CLASSIFIER_PATH.exists():
            raise FileNotFoundError(
                f"Classifier not found at {CLASSIFIER_PATH}"
            )

        if not METADATA_PATH.exists():
            raise FileNotFoundError(
                f"Model metadata not found at {METADATA_PATH}"
            )

        with METADATA_PATH.open("r", encoding="utf-8") as file:
            runtime.metadata = json.load(file)

        runtime.classifier = joblib.load(CLASSIFIER_PATH)

        model_name = runtime.metadata.get(
            "sbert_model_name",
            "sentence-transformers/all-MiniLM-L6-v2",
        )

        cache_folder = os.getenv("SBERT_CACHE_FOLDER")
        runtime.encoder = SentenceTransformer(
            model_name,
            cache_folder=cache_folder or None,
        )
        runtime.load_error = None
    except Exception as error:
        runtime.load_error = str(error)
        runtime.classifier = None
        runtime.encoder = None


@app.on_event("startup")
def startup_event() -> None:
    load_runtime()


@app.get("/")
def root() -> dict:
    return {
        "service": "SafeChat AI Classification Service",
        "status": "online" if runtime.load_error is None else "error",
    }


@app.get("/health")
def health() -> dict:
    model_loaded = (
        runtime.classifier is not None
        and runtime.encoder is not None
        and runtime.load_error is None
    )

    return {
        "status": "online" if model_loaded else "error",
        "modelLoaded": model_loaded,
        "modelName": runtime.metadata.get(
            "model_name",
            "SBERT + Logistic Regression",
        ),
        "modelVersion": runtime.metadata.get(
            "model_version",
            "unknown",
        ),
        "sbertModelName": runtime.metadata.get(
            "sbert_model_name",
            "",
        ),
        "embeddingDimension": runtime.metadata.get(
            "embedding_dimension",
            None,
        ),
        "classes": runtime.metadata.get("classes", []),
        "startedAt": runtime.started_at,
        "error": runtime.load_error,
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    text = payload.text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Message text cannot be empty.",
        )

    if runtime.classifier is None or runtime.encoder is None:
        raise HTTPException(
            status_code=503,
            detail=runtime.load_error or "Model is not loaded.",
        )

    started = time.perf_counter()

    try:
        embedding = runtime.encoder.encode(
            [text],
            convert_to_numpy=True,
            normalize_embeddings=bool(
                runtime.metadata.get(
                    "normalize_embeddings",
                    True,
                )
            ),
            show_progress_bar=False,
        )

        probabilities = runtime.classifier.predict_proba(
            embedding
        )[0]

        classes = [
            str(label)
            for label in runtime.classifier.classes_
        ]

        probability_map = {
            class_name: float(probability)
            for class_name, probability in zip(
                classes,
                probabilities,
            )
        }

        predicted_index = int(np.argmax(probabilities))
        predicted_label = classes[predicted_index]
        confidence = float(probabilities[predicted_index])
        latency_ms = (
            time.perf_counter() - started
        ) * 1000

        return PredictionResponse(
            label=predicted_label,
            confidence=confidence,
            probabilities=probability_map,
            modelVersion=runtime.metadata.get(
                "model_version",
                "sbert-logreg-v1",
            ),
            modelName=runtime.metadata.get(
                "model_name",
                "SBERT + Logistic Regression",
            ),
            latencyMs=round(latency_ms, 3),
            classifiedAt=datetime.now(
                timezone.utc
            ).isoformat(),
        )
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {error}",
        ) from error

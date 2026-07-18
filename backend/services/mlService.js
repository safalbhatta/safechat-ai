const DEFAULT_ML_SERVICE_URL = "http://127.0.0.1:8001";
const VALID_LABELS = new Set([
  "normal",
  "spam",
  "abusive",
  "hateful",
]);

const getServiceUrl = () =>
  String(
    process.env.ML_SERVICE_URL ||
      DEFAULT_ML_SERVICE_URL
  ).replace(/\/+$/, "");

const getTimeoutMs = () => {
  const configured = Number(
    process.env.ML_SERVICE_TIMEOUT_MS
  );

  return Number.isFinite(configured) &&
    configured > 0
    ? configured
    : 12000;
};

const getSafetyThreshold = () => {
  const configured = Number(
    process.env.ML_SAFETY_THRESHOLD
  );

  if (
    Number.isFinite(configured) &&
    configured >= 0 &&
    configured <= 1
  ) {
    return configured;
  }

  return 0.55;
};

const fallbackClassification = (
  errorMessage = ""
) => ({
  predictedCategory: "unclassified",
  classificationStatus: errorMessage
    ? "error"
    : "unclassified",
  classificationConfidence: null,
  classificationProbabilities: {
    normal: 0,
    spam: 0,
    abusive: 0,
    hateful: 0,
  },
  modelVersion: "",
  modelName: "",
  classificationLatencyMs: null,
  classifiedAt: null,
  classificationError: errorMessage,
  isSafetyHidden: false,
});

const normalizeProbabilities = (
  probabilities = {}
) => ({
  normal: Number(probabilities.normal) || 0,
  spam: Number(probabilities.spam) || 0,
  abusive: Number(probabilities.abusive) || 0,
  hateful: Number(probabilities.hateful) || 0,
});

const requestJson = async (
  path,
  options = {},
  timeoutMs = getTimeoutMs()
) => {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(
      `${getServiceUrl()}${path}`,
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: controller.signal,
      }
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      const message =
        payload.detail ||
        payload.message ||
        `ML service returned ${response.status}`;

      throw new Error(message);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const classifyText = async (text) => {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    return fallbackClassification();
  }

  try {
    const payload = await requestJson(
      "/predict",
      {
        method: "POST",
        body: JSON.stringify({
          text: cleanText,
        }),
      }
    );

    const label = String(
      payload.label || ""
    ).toLowerCase();

    if (!VALID_LABELS.has(label)) {
      throw new Error(
        `Unexpected model label: ${payload.label}`
      );
    }

    const confidence = Number(
      payload.confidence
    );

    const safeConfidence = Number.isFinite(
      confidence
    )
      ? confidence
      : 0;

    const isSafetyCategory =
      label !== "normal";

    return {
      predictedCategory: label,
      classificationStatus: "classified",
      classificationConfidence:
        safeConfidence,
      classificationProbabilities:
        normalizeProbabilities(
          payload.probabilities
        ),
      modelVersion:
        String(payload.modelVersion || ""),
      modelName:
        String(payload.modelName || ""),
      classificationLatencyMs:
        Number.isFinite(
          Number(payload.latencyMs)
        )
          ? Number(payload.latencyMs)
          : null,
      classifiedAt: payload.classifiedAt
        ? new Date(payload.classifiedAt)
        : new Date(),
      classificationError: "",
      isSafetyHidden:
        isSafetyCategory &&
        safeConfidence >=
          getSafetyThreshold(),
    };
  } catch (error) {
    const message =
      error.name === "AbortError"
        ? "ML service timed out"
        : error.message ||
          "ML service unavailable";

    console.error(
      "Text classification failed:",
      message
    );

    return fallbackClassification(message);
  }
};

const getModelHealth = async () => {
  try {
    const payload = await requestJson(
      "/health",
      {
        method: "GET",
      },
      1500
    );

    return {
      ...payload,
      serviceUrl: getServiceUrl(),
      safetyThreshold:
        getSafetyThreshold(),
      reachable: true,
    };
  } catch (error) {
    return {
      status: "offline",
      modelLoaded: false,
      modelName:
        "SBERT + Logistic Regression",
      modelVersion: "",
      sbertModelName:
        "sentence-transformers/all-MiniLM-L6-v2",
      embeddingDimension: 384,
      classes: [
        "abusive",
        "hateful",
        "normal",
        "spam",
      ],
      serviceUrl: getServiceUrl(),
      safetyThreshold:
        getSafetyThreshold(),
      reachable: false,
      error:
        error.name === "AbortError"
          ? "ML service timed out"
          : error.message ||
            "ML service unavailable",
    };
  }
};

module.exports = {
  classifyText,
  getModelHealth,
  fallbackClassification,
};

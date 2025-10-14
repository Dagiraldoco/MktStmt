const headlineEl = document.getElementById("sentiment-headline");
const summaryEl = document.getElementById("sentiment-summary");
const sourcesEl = document.getElementById("source-list");
const timestampEl = document.getElementById("timestamp");
const refreshBtn = document.getElementById("refresh-button");

const documentEl = document.documentElement;
const DEFAULT_API_ENDPOINT = documentEl?.dataset?.apiEndpoint || "/api/sentiment";
const DEFAULT_FALLBACK_ENDPOINT = documentEl?.dataset?.fallbackEndpoint || null;
const STORAGE_KEY = "mktstmt:endpoints";

function loadStoredConfig() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return {
      api: typeof parsed.api === "string" ? parsed.api : undefined,
      fallback:
        typeof parsed.fallback === "string" ? parsed.fallback : undefined,
    };
  } catch (error) {
    console.warn("Unable to read stored API configuration", error);
    return {};
  }
}

function persistConfig(config) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn("Unable to persist API configuration", error);
  }
}

function resolveConfig() {
  const params = new URLSearchParams(window.location.search);
  const stored = loadStoredConfig();
  const config = { ...stored };
  let urlMutated = false;

  if (params.has("resetConfig")) {
    config.api = undefined;
    config.fallback = undefined;
    persistConfig(config);
    params.delete("resetConfig");
    urlMutated = true;
  }

  if (params.has("api")) {
    const api = params.get("api")?.trim();
    config.api = api || undefined;
    params.delete("api");
    urlMutated = true;
  }

  if (params.has("fallback")) {
    const fallback = params.get("fallback")?.trim();
    config.fallback = fallback || undefined;
    params.delete("fallback");
    urlMutated = true;
  }

  if (urlMutated) {
    persistConfig(config);

    const nextUrl = new URL(window.location.href);
    nextUrl.search = params.toString();
    window.history.replaceState({}, document.title, nextUrl.toString());
  }

  return {
    api: config.api || DEFAULT_API_ENDPOINT,
    fallback: config.fallback || DEFAULT_FALLBACK_ENDPOINT,
  };
}

const { api: API_ENDPOINT, fallback: FALLBACK_ENDPOINT } = resolveConfig();

async function fetchSentiment() {
  headlineEl.textContent = "Refreshing sentiment...";
  refreshBtn.disabled = true;

  try {
    const { payload, usedFallback } = await requestWithFallback(API_ENDPOINT);
    updateUI(payload, usedFallback);
  } catch (error) {
    console.error(error);
    showError();
  } finally {
    refreshBtn.disabled = false;
  }
}

async function requestWithFallback(endpoint) {
  try {
    const payload = await requestSentiment(endpoint);
    return { payload, usedFallback: false };
  } catch (primaryError) {
    if (!FALLBACK_ENDPOINT || endpoint === FALLBACK_ENDPOINT) {
      throw primaryError;
    }

    console.warn("Falling back to bundled sentiment data", primaryError);

    const payload = await requestSentiment(FALLBACK_ENDPOINT);
    return { payload, usedFallback: true };
  }
}

async function requestSentiment(endpoint) {
  if (!endpoint) {
    throw new Error("No endpoint configured for sentiment data");
  }

  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload.status && payload.status !== "ok") {
    throw new Error(payload.message || "Unable to fetch sentiment");
  }

  return payload.status ? payload : { status: "ok", ...payload };
}

function updateUI(data, usedFallback = false) {
  headlineEl.textContent = data.level || "Sentiment update";
  summaryEl.textContent =
    data.summary ||
    (usedFallback
      ? "Demo market sentiment is displayed because the live API is unavailable."
      : "Market sentiment summary is unavailable right now.");

  const date = data.as_of ? new Date(data.as_of) : null;
  const timestamp = date ? `Last updated ${date.toLocaleString()}` : "";
  const fallbackNotice = usedFallback
    ? (timestamp ? " · " : "") + "Showing demo data (live API unavailable)."
    : "";
  timestampEl.textContent = `${timestamp}${fallbackNotice}`;

  const cards = (data.sources || []).map((source) => {
    const container = document.createElement("article");
    container.className = "source-card";

    const title = document.createElement("div");
    title.className = "source-card__title";
    title.textContent = source.source || "Source";

    const label = document.createElement("div");
    label.className = "source-card__label";
    label.textContent = source.label || "Unknown";

    const detail = document.createElement("div");
    detail.className = "source-card__detail";
    const detailParts = [];

    if (typeof source.score === "number") {
      detailParts.push(`Score: ${source.score.toFixed(2)}`);
    }

    if (source.details?.raw_score) {
      detailParts.push(`Raw: ${source.details.raw_score}`);
    } else if (source.details?.average_score) {
      detailParts.push(`Average: ${source.details.average_score.toFixed(2)}`);
    }

    if (source.details?.url) {
      const link = document.createElement("a");
      link.href = source.details.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View source";
      link.className = "source-card__link";
      detailParts.push(link.outerHTML);
    }

    detail.innerHTML = detailParts.join(" · ");

    container.appendChild(title);
    container.appendChild(label);
    container.appendChild(detail);

    return container;
  });

  sourcesEl.replaceChildren(...cards);
}

function showError() {
  headlineEl.textContent = "Sentiment unavailable";
  summaryEl.textContent =
    "We could not reach live market data right now. Showing no sentiment information.";
  sourcesEl.innerHTML = "";
  timestampEl.textContent = "";
}

refreshBtn.addEventListener("click", fetchSentiment);

fetchSentiment();

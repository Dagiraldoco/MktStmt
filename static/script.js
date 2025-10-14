const headlineEl = document.getElementById("sentiment-headline");
const summaryEl = document.getElementById("sentiment-summary");
const sourcesEl = document.getElementById("source-list");
const timestampEl = document.getElementById("timestamp");
const refreshBtn = document.getElementById("refresh-button");

const documentEl = document.documentElement;
const API_ENDPOINT = documentEl?.dataset?.apiEndpoint || "/api/sentiment";
const FALLBACK_ENDPOINT = documentEl?.dataset?.fallbackEndpoint || null;

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

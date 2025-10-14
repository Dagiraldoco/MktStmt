const headlineEl = document.getElementById("sentiment-headline");
const summaryEl = document.getElementById("sentiment-summary");
const sourcesEl = document.getElementById("source-list");
const timestampEl = document.getElementById("timestamp");
const refreshBtn = document.getElementById("refresh-button");

async function fetchSentiment() {
  headlineEl.textContent = "Refreshing sentiment...";
  refreshBtn.disabled = true;

  try {
    const response = await fetch("/api/sentiment");
    const payload = await response.json();

    if (payload.status !== "ok") {
      throw new Error(payload.message || "Unable to fetch sentiment");
    }

    updateUI(payload);
  } catch (error) {
    console.error(error);
    headlineEl.textContent = "Sentiment unavailable";
    summaryEl.textContent =
      "We could not reach the data sources right now. Please try again in a moment.";
    sourcesEl.innerHTML = "";
    timestampEl.textContent = "";
  } finally {
    refreshBtn.disabled = false;
  }
}

function updateUI(data) {
  headlineEl.textContent = data.level;
  summaryEl.textContent = data.summary;

  const date = data.as_of ? new Date(data.as_of) : null;
  timestampEl.textContent = date
    ? `Last updated ${date.toLocaleString()}`
    : "";

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

refreshBtn.addEventListener("click", fetchSentiment);

fetchSentiment();

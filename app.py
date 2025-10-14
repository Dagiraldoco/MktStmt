from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import requests
from flask import Flask, jsonify, render_template


app = Flask(__name__)


class SentimentSourceError(RuntimeError):
    """Raised when a sentiment source could not be retrieved or parsed."""


def _classification_to_score(label: str | None) -> float:
    """Map textual classifications into a normalised score in [-2, 2]."""

    if not label:
        return 0.0

    normalised = {
        "extreme fear": -2.0,
        "fear": -1.0,
        "cautious": -0.5,
        "neutral": 0.0,
        "balanced": 0.0,
        "greed": 1.0,
        "bullish": 1.0,
        "optimistic": 1.0,
        "extreme greed": 2.0,
        "bearish": -1.0,
        "very bearish": -2.0,
        "very bullish": 2.0,
        "moderately bullish": 1.0,
        "moderately bearish": -1.0,
    }

    return normalised.get(label.lower(), 0.0)


def _score_to_summary(score: float) -> Tuple[str, str]:
    """Translate an aggregate score into a short label and human summary."""

    if score <= -1.5:
        return "Extreme Fear", "Market is experiencing extreme fear."
    if score <= -0.5:
        return "Fear", "Market sentiment is fearful right now."
    if score < 0.5:
        return "Neutral", "Market sentiment is balanced at the moment."
    if score < 1.5:
        return "Greed", "Market is leaning toward greed."
    return "Extreme Greed", "Market sentiment shows extreme greed."


def fetch_cnn_fear_and_greed() -> Dict[str, Any]:
    url = "https://production.dataviz.cnn.io/index/fearandgreed/summary"
    response = requests.get(url, timeout=6)
    response.raise_for_status()
    data = response.json()

    section = data.get("fear_and_greed") or {}
    rating = section.get("rating") or section.get("classification")
    score = section.get("score")
    derived_score = _classification_to_score(rating)

    if isinstance(score, (int, float)):
        derived_score = max(min((score - 50.0) / 25.0, 2.0), -2.0)

    if rating is None and score is None:
        raise SentimentSourceError("CNN Fear & Greed payload missing rating/score")

    return {
        "source": "CNN Fear & Greed Index",
        "label": rating or "Neutral",
        "score": derived_score,
        "details": {
            "raw_score": score,
            "url": "https://money.cnn.com/data/fear-and-greed/",
        },
    }


def fetch_alternative_fng() -> Dict[str, Any]:
    url = "https://api.alternative.me/fng/"
    response = requests.get(url, timeout=6)
    response.raise_for_status()
    data = response.json()

    entries = data.get("data")
    if not entries:
        raise SentimentSourceError("Alternative.me FNG returned no data")

    latest = entries[0]
    rating = latest.get("value_classification")
    score = latest.get("value")

    return {
        "source": "Alternative.me Fear & Greed",
        "label": rating or "Neutral",
        "score": _classification_to_score(rating),
        "details": {
            "raw_score": score,
            "url": "https://alternative.me/crypto/fear-and-greed-index/",
        },
    }


def fetch_alpha_vantage_news() -> Dict[str, Any]:
    url = (
        "https://www.alphavantage.co/query"
        "?function=NEWS_SENTIMENT&tickers=SPY&apikey=demo"
    )
    response = requests.get(url, timeout=8)
    response.raise_for_status()
    data = response.json()

    feed = data.get("feed")
    if not feed:
        raise SentimentSourceError("Alpha Vantage news sentiment returned no feed")

    scores: List[float] = []
    latest_label = None

    for item in feed[:10]:
        label = item.get("overall_sentiment_label")
        score = item.get("overall_sentiment_score")
        latest_label = latest_label or label

        if isinstance(score, (int, float)):
            scores.append(score)
        elif label:
            scores.append(_classification_to_score(label) / 2.0)

    if not scores:
        raise SentimentSourceError("Alpha Vantage news sentiment missing scores")

    avg_score = sum(scores) / len(scores)

    if latest_label is None:
        if avg_score >= 0.2:
            latest_label = "Bullish"
        elif avg_score <= -0.2:
            latest_label = "Bearish"
        else:
            latest_label = "Neutral"

    scaled_score = max(min(avg_score * 4.0, 2.0), -2.0)

    return {
        "source": "Alpha Vantage News Sentiment",
        "label": latest_label,
        "score": scaled_score,
        "details": {
            "average_score": avg_score,
            "url": "https://www.alphavantage.co/",
        },
    }


def gather_sentiments() -> Dict[str, Any]:
    sources = [
        fetch_cnn_fear_and_greed,
        fetch_alternative_fng,
        fetch_alpha_vantage_news,
    ]

    results: List[Dict[str, Any]] = []
    failures: List[Dict[str, str]] = []

    for source in sources:
        try:
            results.append(source())
        except Exception as exc:  # pragma: no cover - defensive logging
            logging.exception("Error while fetching sentiment from %s", source.__name__)
            failures.append({"source": source.__name__, "reason": str(exc)})

    if not results:
        raise SentimentSourceError("No sentiment sources available")

    aggregate = sum(item["score"] for item in results) / len(results)
    level, summary = _score_to_summary(aggregate)

    return {
        "as_of": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "summary": summary,
        "score": aggregate,
        "sources": results,
        "failures": failures,
    }


@app.route("/")
def index() -> str:
    return render_template("index.html")


@app.route("/api/sentiment")
def sentiment_api() -> Any:
    try:
        sentiment = gather_sentiments()
        payload = {"status": "ok", **sentiment}
    except Exception as exc:
        payload = {
            "status": "error",
            "message": str(exc),
            "failures": [],
        }

    return jsonify(payload)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

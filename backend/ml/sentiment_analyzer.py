"""
Sentiment Analysis using fine-tuned Transformer models.
Supports: DistilBERT, RoBERTa, BERT, MuRIL
"""

from typing import Dict, List, Optional
from ml.model_manager import get_model_manager, AVAILABLE_MODELS


def _normalize_sentiment_label(label: str) -> str:
    label = label.upper().replace("LABEL_", "")
    mapping = {
        "POSITIVE": "positive",
        "NEGATIVE": "negative",
        "NEUTRAL": "neutral",
        "1 STAR": "negative",
        "2 STARS": "negative",
        "3 STARS": "neutral",
        "4 STARS": "positive",
        "5 STARS": "positive",
    }
    return mapping.get(label, label.lower())


class SentimentAnalyzer:
    def __init__(self, default_model: str = "distilbert"):
        self.manager = get_model_manager()
        self.default_model = default_model

    def analyze(self, text: str, model_key: Optional[str] = None) -> Dict:
        model_key = model_key or self.default_model
        if model_key not in AVAILABLE_MODELS or AVAILABLE_MODELS[model_key]["type"] not in (
            "sentiment",
            "multilingual",
        ):
            model_key = "distilbert"

        pipe = self.manager.get_pipeline(model_key)
        if pipe is None:
            return self._fallback_analyze(text, model_key)

        results = pipe(text[:512])[0]
        if isinstance(results, dict):
            results = [results]

        best = max(results, key=lambda x: x["score"])
        return {
            "label": _normalize_sentiment_label(best["label"]),
            "score": round(best["score"], 4),
            "model_used": AVAILABLE_MODELS[model_key]["name"],
            "all_scores": {
                _normalize_sentiment_label(r["label"]): round(r["score"], 4)
                for r in results
            },
        }

    def analyze_batch(self, texts: List[str], model_key: Optional[str] = None) -> List[Dict]:
        return [self.analyze(text, model_key) for text in texts]

    def _fallback_analyze(self, text: str, model_key: str) -> Dict:
        """Rule-based fallback when ML models aren't loaded."""
        positive_words = {"good", "great", "love", "awesome", "excellent", "amazing", "best", "happy"}
        negative_words = {"bad", "hate", "worst", "terrible", "awful", "poor", "sad", "angry"}
        words = set(text.lower().split())
        pos = len(words & positive_words)
        neg = len(words & negative_words)
        if pos > neg:
            label, score = "positive", 0.6 + min(pos * 0.05, 0.35)
        elif neg > pos:
            label, score = "negative", 0.6 + min(neg * 0.05, 0.35)
        else:
            label, score = "neutral", 0.55
        return {
            "label": label,
            "score": round(score, 4),
            "model_used": f"{AVAILABLE_MODELS.get(model_key, {}).get('name', model_key)} (fallback)",
            "all_scores": {label: round(score, 4)},
        }


def aggregate_sentiments(results: List[Dict]) -> Dict[str, float]:
    if not results:
        return {"positive": 0, "negative": 0, "neutral": 0}
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    for r in results:
        label = r.get("label", "neutral")
        if label in counts:
            counts[label] += 1
        else:
            counts["neutral"] += 1
    total = len(results)
    return {k: round(v / total * 100, 2) for k, v in counts.items()}

"""
Emotion Analysis using fine-tuned DistilRoBERTa.
Detects: anger, disgust, fear, joy, neutral, sadness, surprise
"""

from typing import Dict, List
from ml.model_manager import get_model_manager, EMOTION_LABELS


class EmotionAnalyzer:
    def __init__(self):
        self.manager = get_model_manager()

    def analyze(self, text: str) -> Dict:
        pipe = self.manager.get_pipeline("emotion")
        if pipe is None:
            return self._fallback_analyze(text)

        results = pipe(text[:512])[0]
        if isinstance(results, dict):
            results = [results]

        all_emotions = {}
        for r in results:
            label = r["label"].lower()
            all_emotions[label] = round(r["score"], 4)

        best = max(results, key=lambda x: x["score"])
        return {
            "label": best["label"].lower(),
            "score": round(best["score"], 4),
            "all_emotions": all_emotions,
            "model_used": "DistilRoBERTa Emotion",
        }

    def analyze_batch(self, texts: List[str]) -> List[Dict]:
        return [self.analyze(text) for text in texts]

    def _fallback_analyze(self, text: str) -> Dict:
        text_lower = text.lower()
        emotion_keywords = {
            "joy": {"happy", "love", "great", "awesome", "excited", "wonderful"},
            "anger": {"angry", "furious", "hate", "mad", "annoyed"},
            "sadness": {"sad", "depressed", "cry", "miss", "lonely"},
            "fear": {"scared", "afraid", "worried", "anxious", "terror"},
            "surprise": {"wow", "amazing", "unexpected", "shocked"},
            "disgust": {"disgusting", "gross", "nasty", "revolting"},
        }
        scores = {e: 0.0 for e in EMOTION_LABELS}
        words = set(text_lower.split())
        for emotion, keywords in emotion_keywords.items():
            overlap = len(words & keywords)
            if overlap:
                scores[emotion] = min(0.3 + overlap * 0.15, 0.85)
        if max(scores.values()) == 0:
            scores["neutral"] = 0.6
        best = max(scores, key=scores.get)
        return {
            "label": best,
            "score": round(scores[best], 4),
            "all_emotions": {k: round(v, 4) for k, v in scores.items()},
            "model_used": "DistilRoBERTa Emotion (fallback)",
        }


def aggregate_emotions(results: List[Dict]) -> Dict[str, float]:
    if not results:
        return {e: 0.0 for e in EMOTION_LABELS}
    totals = {e: 0.0 for e in EMOTION_LABELS}
    for r in results:
        label = r.get("label", "neutral")
        if label in totals:
            totals[label] += 1
    total = len(results)
    return {k: round(v / total * 100, 2) for k, v in totals.items()}

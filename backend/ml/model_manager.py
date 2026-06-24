"""
SentiPulse ML Model Manager
Manages loading and inference for fine-tuned Transformer models:
- DistilBERT (sentiment)
- RoBERTa (Twitter/social sentiment)
- BERT (general sentiment)
- MuRIL (multilingual - Hindi/English)
- DistilRoBERTa (emotion classification)
"""

import logging
from typing import Dict, Optional, Tuple
from functools import lru_cache

logger = logging.getLogger(__name__)

AVAILABLE_MODELS = {
    "distilbert": {
        "id": "distilbert",
        "name": "DistilBERT",
        "description": "Distilled BERT for fast sentiment analysis (SST-2 fine-tuned)",
        "type": "sentiment",
        "huggingface_id": "distilbert-base-uncased-finetuned-sst-2-english",
        "is_finetuned": True,
    },
    "roberta": {
        "id": "roberta",
        "name": "RoBERTa",
        "description": "RoBERTa fine-tuned on Twitter sentiment (CardiffNLP)",
        "type": "sentiment",
        "huggingface_id": "cardiffnlp/twitter-roberta-base-sentiment-latest",
        "is_finetuned": True,
    },
    "bert": {
        "id": "bert",
        "name": "BERT",
        "description": "BERT base uncased fine-tuned for sentiment classification",
        "type": "sentiment",
        "huggingface_id": "nlptown/bert-base-multilingual-uncased-sentiment",
        "is_finetuned": True,
    },
    "muril": {
        "id": "muril",
        "name": "MuRIL",
        "description": "Multilingual Representations for Indian Languages (17 languages)",
        "type": "multilingual",
        "huggingface_id": "google/muril-base-cased",
        "is_finetuned": False,
        "sentiment_head": "cardiffnlp/twitter-xlm-roberta-base-sentiment",
    },
    "emotion": {
        "id": "emotion",
        "name": "DistilRoBERTa Emotion",
        "description": "DistilRoBERTa fine-tuned for 7-class emotion detection",
        "type": "emotion",
        "huggingface_id": "j-hartmann/emotion-english-distilroberta-base",
        "is_finetuned": True,
    },
}

EMOTION_LABELS = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]


class ModelManager:
    """Singleton manager for Hugging Face transformer pipelines."""

    _instance: Optional["ModelManager"] = None
    _pipelines: Dict[str, object] = {}
    _loaded: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def load_models(self, models_to_load: list = None):
        """Load specified models or default sentiment + emotion models."""
        if self._loaded and not models_to_load:
            return

        try:
            from transformers import pipeline
        except ImportError:
            logger.warning("transformers not installed — ML features disabled")
            return

        default_models = models_to_load or ["distilbert", "emotion"]
        for model_key in default_models:
            if model_key in self._pipelines:
                continue
            config = AVAILABLE_MODELS.get(model_key)
            if not config:
                continue
            try:
                hf_id = config["huggingface_id"]
                task = "text-classification"
                if model_key == "muril":
                    hf_id = config.get("sentiment_head", hf_id)
                logger.info(f"Loading model: {config['name']} ({hf_id})")
                self._pipelines[model_key] = pipeline(
                    task,
                    model=hf_id,
                    top_k=None,
                    truncation=True,
                    max_length=512,
                )
                logger.info(f"Loaded {config['name']} successfully")
            except Exception as e:
                logger.error(f"Failed to load {model_key}: {e}")

        self._loaded = True

    def get_pipeline(self, model_key: str):
        if model_key not in self._pipelines:
            self.load_models([model_key])
        return self._pipelines.get(model_key)

    def list_models(self) -> list:
        return list(AVAILABLE_MODELS.values())

    def is_ready(self) -> bool:
        return bool(self._pipelines)


@lru_cache(maxsize=1)
def get_model_manager() -> ModelManager:
    manager = ModelManager()
    manager.load_models()
    return manager

"""
Fine-tuning script for Transformer models on custom sentiment/emotion datasets.
Run: python -m ml.fine_tuning.train_sentiment --model distilbert --epochs 3
"""

import argparse
import json
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SAMPLE_DATASET = [
    {"text": "This product is amazing, I love it!", "label": 1},
    {"text": "Terrible experience, would not recommend.", "label": 0},
    {"text": "It's okay, nothing special.", "label": 2},
    {"text": "Best purchase I've ever made!", "label": 1},
    {"text": "Complete waste of money.", "label": 0},
    {"text": "Average quality, meets expectations.", "label": 2},
    {"text": "Outstanding service and fast delivery!", "label": 1},
    {"text": "Very disappointed with the quality.", "label": 0},
    {"text": "Neither good nor bad, just fine.", "label": 2},
    {"text": "Exceeded all my expectations!", "label": 1},
]


MODEL_MAP = {
    "distilbert": "distilbert-base-uncased",
    "bert": "bert-base-uncased",
    "roberta": "roberta-base",
    "muril": "google/muril-base-cased",
}


def train_sentiment_model(
    model_key: str = "distilbert",
    epochs: int = 3,
    batch_size: int = 16,
    learning_rate: float = 2e-5,
    output_dir: str = "ml/fine_tuning/checkpoints",
):
    try:
        import torch
        from datasets import Dataset
        from transformers import (
            AutoTokenizer,
            AutoModelForSequenceClassification,
            TrainingArguments,
            Trainer,
        )
        from sklearn.model_selection import train_test_split
    except ImportError:
        logger.error("Install ML dependencies: pip install torch transformers datasets scikit-learn")
        return

    model_name = MODEL_MAP.get(model_key, MODEL_MAP["distilbert"])
    logger.info(f"Fine-tuning {model_key} ({model_name}) for sentiment analysis")

    texts = [d["text"] for d in SAMPLE_DATASET]
    labels = [d["label"] for d in SAMPLE_DATASET]
    train_texts, val_texts, train_labels, val_labels = train_test_split(
        texts, labels, test_size=0.2, random_state=42
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=3)

    def tokenize(examples):
        return tokenizer(examples["text"], padding="max_length", truncation=True, max_length=128)

    train_dataset = Dataset.from_dict({"text": train_texts, "label": train_labels})
    val_dataset = Dataset.from_dict({"text": val_texts, "label": val_labels})
    train_dataset = train_dataset.map(tokenize, batched=True)
    val_dataset = val_dataset.map(tokenize, batched=True)

    save_path = Path(output_dir) / f"{model_key}_sentiment"
    save_path.mkdir(parents=True, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=str(save_path),
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        logging_steps=10,
        report_to="none",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        tokenizer=tokenizer,
    )

    logger.info("Starting fine-tuning...")
    results = trainer.train()
    trainer.save_model(str(save_path))
    tokenizer.save_pretrained(str(save_path))

    metrics = {
        "model": model_key,
        "epochs": epochs,
        "train_loss": results.training_loss,
        "output_dir": str(save_path),
    }
    with open(save_path / "training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"Fine-tuning complete. Model saved to {save_path}")
    logger.info(f"Training loss: {results.training_loss:.4f}")
    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune Transformer for sentiment analysis")
    parser.add_argument("--model", default="distilbert", choices=list(MODEL_MAP.keys()))
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=2e-5)
    parser.add_argument("--output-dir", default="ml/fine_tuning/checkpoints")
    args = parser.parse_args()

    train_sentiment_model(
        model_key=args.model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        output_dir=args.output_dir,
    )

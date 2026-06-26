import json
import os

notebook = {
    "cells": [],
    "metadata": {
        "colab": {
            "name": "MuRIL_Colab_Training.ipynb",
        },
        "kernelspec": {
            "display_name": "Python 3",
            "name": "python3"
        },
        "language_info": {
            "name": "python"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 0
}

def add_markdown(text):
    notebook["cells"].append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [text]
    })

def add_code(text):
    # Split text into lines, append '\n' to each except the last
    lines = text.split('\n')
    source = [line + '\n' for line in lines[:-1]]
    if lines:
        source.append(lines[-1])
    
    notebook["cells"].append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": source
    })

add_markdown("# 1. Install dependencies")
add_code("!pip install transformers datasets scikit-learn matplotlib seaborn")

add_markdown("# 2. Upload dataset files")
add_code('from google.colab import files\nimport os\n\nprint("Please upload train.json, validation.json, and test.json")\nuploaded = files.upload()')

add_markdown("# 3. Load train.json\n# 4. Load validation.json\n# 5. Load test.json")
add_code('''import pandas as pd

train_df = pd.read_json("train.json")
val_df = pd.read_json("validation.json")
test_df = pd.read_json("test.json")

print(f"Train size: {len(train_df)}")
print(f"Validation size: {len(val_df)}")
print(f"Test size: {len(test_df)}")''')

add_markdown("# 6. Label encoding")
add_code('''# Convert sentiments to integer labels
label_map = {"negative": 0, "neutral": 1, "positive": 2}

train_df['label'] = train_df['sentiment'].map(label_map)
val_df['label'] = val_df['sentiment'].map(label_map)
test_df['label'] = test_df['sentiment'].map(label_map)

# Drop any rows with unmapped/missing labels or empty text
train_df = train_df.dropna(subset=['label', 'text'])
val_df = val_df.dropna(subset=['label', 'text'])
test_df = test_df.dropna(subset=['label', 'text'])

# Ensure label is int
train_df['label'] = train_df['label'].astype(int)
val_df['label'] = val_df['label'].astype(int)
test_df['label'] = test_df['label'].astype(int)''')

add_markdown("# 7. MuRIL tokenizer")
add_code('''from transformers import AutoTokenizer

model_name = "google/muril-base-cased"
print(f"Loading tokenizer: {model_name}")
tokenizer = AutoTokenizer.from_pretrained(model_name)''')

add_markdown("# 8. Dataset creation")
add_code('''from datasets import Dataset

# Convert pandas dataframes to HuggingFace datasets
train_dataset = Dataset.from_pandas(train_df)
val_dataset = Dataset.from_pandas(val_df)
test_dataset = Dataset.from_pandas(test_df)

def tokenize_function(examples):
    return tokenizer(examples['text'], padding='max_length', truncation=True, max_length=128)

print("Tokenizing datasets...")
train_encoded = train_dataset.map(tokenize_function, batched=True)
val_encoded = val_dataset.map(tokenize_function, batched=True)
test_encoded = test_dataset.map(tokenize_function, batched=True)

# Set format for PyTorch
train_encoded.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
val_encoded.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])
test_encoded.set_format('torch', columns=['input_ids', 'attention_mask', 'label'])''')

add_markdown("# 9. Trainer setup\n# 10. CPU/GPU detection")
add_code('''import torch
from transformers import AutoModelForSequenceClassification, TrainingArguments, Trainer
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Using device: {device}")

print("Loading model...")
model = AutoModelForSequenceClassification.from_pretrained(
    model_name, 
    num_labels=3,
    id2label={0: "negative", 1: "neutral", 2: "positive"},
    label2id={"negative": 0, "neutral": 1, "positive": 2}
)
model.to(device)

training_args = TrainingArguments(
    output_dir="./muril_checkpoints",
    num_train_epochs=5,
    per_device_train_batch_size=16, # Optimized for T4
    per_device_eval_batch_size=16,
    learning_rate=2e-5,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    fp16=True, # Enable mixed precision for T4 GPU speedup
    report_to="none"
)

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='weighted', zero_division=0)
    acc = accuracy_score(labels, predictions)
    return {
        'accuracy': acc,
        'f1': f1,
        'precision': precision,
        'recall': recall
    }

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_encoded,
    eval_dataset=val_encoded,
    tokenizer=tokenizer,
    compute_metrics=compute_metrics
)''')

add_markdown("# 11. Training")
add_code('''print("Starting training on Colab T4...")
trainer.train()''')

add_markdown("# 12. Evaluation\n# 13. Accuracy\n# 14. Precision\n# 15. Recall\n# 16. F1 Score")
add_code('''print("Evaluating on test dataset...")
eval_results = trainer.evaluate(test_encoded)

print("\\n--- Test Set Metrics ---")
print(f"Accuracy:  {eval_results['eval_accuracy']:.4f}")
print(f"Precision: {eval_results['eval_precision']:.4f}")
print(f"Recall:    {eval_results['eval_recall']:.4f}")
print(f"F1 Score:  {eval_results['eval_f1']:.4f}")''')

add_markdown("# 17. Confusion Matrix")
add_code('''import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix

predictions_output = trainer.predict(test_encoded)
y_pred = np.argmax(predictions_output.predictions, axis=-1)
y_true = predictions_output.label_ids

cm = confusion_matrix(y_true, y_pred)
labels_text = ["negative", "neutral", "positive"]

plt.figure(figsize=(8, 6))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels_text, yticklabels=labels_text)
plt.xlabel('Predicted Sentiment')
plt.ylabel('True Sentiment')
plt.title('Confusion Matrix - MuRIL')
plt.tight_layout()
plt.show()''')

add_markdown("# 18. Save model")
add_code('''import os
output_dir = "saved_models/muril_sentiment"
os.makedirs(output_dir, exist_ok=True)

print(f"Saving model to {output_dir}...")
model.save_pretrained(output_dir)
tokenizer.save_pretrained(output_dir)''')

add_markdown("# 19. Zip model")
add_code('''import shutil

print(f"Zipping the saved model...")
shutil.make_archive("muril_sentiment_model", 'zip', output_dir)
print("Model zipped to muril_sentiment_model.zip")''')

add_markdown("# 20. Download model")
add_code('''from google.colab import files

print("Downloading zipped model to your local machine...")
files.download("muril_sentiment_model.zip")''')

output_path = "c:/Users/tusha/OneDrive/Desktop/New SE/MuRIL_Colab_Training.ipynb"
with open(output_path, "w", encoding='utf-8') as f:
    json.dump(notebook, f, indent=2)
print(f"Successfully generated notebook at {output_path}")

import os
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from dataset import MurilSentimentDataset, LABEL_MAP

def compute_metrics(eval_pred):
    """
    Computes Accuracy, Precision, Recall, and F1-Score.
    """
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    
    precision, recall, f1, _ = precision_recall_fscore_support(labels, predictions, average='weighted', zero_division=0)
    acc = accuracy_score(labels, predictions)
    
    return {
        'accuracy': acc,
        'precision': precision,
        'recall': recall,
        'f1': f1
    }

def plot_confusion_matrix(labels, predictions, save_path="confusion_matrix.png"):
    """
    Generates and saves the confusion matrix heatmap.
    """
    cm = confusion_matrix(labels, predictions)
    
    # Ensure class names match the LABEL_MAP order
    class_names = [k for k, v in sorted(LABEL_MAP.items(), key=lambda item: item[1])]
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=class_names, yticklabels=class_names)
    plt.xlabel('Predicted Sentiment')
    plt.ylabel('True Sentiment')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"Confusion matrix plot successfully saved to {save_path}")

def main():
    model_dir = "saved_models/muril_sentiment/"
    test_file = "test.json"
    
    if not os.path.exists(model_dir):
        print(f"Error: Model directory {model_dir} not found. Please run training.py first.")
        return
        
    if not os.path.exists(test_file):
        print(f"Error: {test_file} not found.")
        return
    
    print(f"Loading fine-tuned model and tokenizer from {model_dir}...")
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    
    print(f"Loading Test Dataset from {test_file}...")
    test_dataset = MurilSentimentDataset(test_file, tokenizer, max_length=128)
    
    # We use Trainer here just for the easy evaluation/prediction loop
    training_args = TrainingArguments(
        output_dir="./eval_output",
        per_device_eval_batch_size=16,
        report_to="none"
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        compute_metrics=compute_metrics
    )
    
    print("Running evaluation on test data...")
    predictions_output = trainer.predict(test_dataset)
    
    metrics = predictions_output.metrics
    print("\n" + "="*30)
    print("      EVALUATION METRICS      ")
    print("="*30)
    print(f"Accuracy:  {metrics.get('test_accuracy', 0):.4f}")
    print(f"Precision: {metrics.get('test_precision', 0):.4f}")
    print(f"Recall:    {metrics.get('test_recall', 0):.4f}")
    print(f"F1 Score:  {metrics.get('test_f1', 0):.4f}")
    print("="*30)
            
    # Extract actual predictions to build confusion matrix
    preds = np.argmax(predictions_output.predictions, axis=-1)
    labels = predictions_output.label_ids
    
    print("\nGenerating confusion matrix...")
    plot_confusion_matrix(labels, preds, save_path="confusion_matrix.png")
    print("Evaluation complete!")

if __name__ == "__main__":
    main()

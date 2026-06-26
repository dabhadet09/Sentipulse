import os
import json
import joblib
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_recall_fscore_support,
    confusion_matrix, classification_report
)

# Import the text preprocessing function from the training script
from baseline_train import preprocess_text

def plot_confusion_matrix(y_true, y_pred, labels, save_path):
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.xlabel('Predicted Sentiment')
    plt.ylabel('True Sentiment')
    plt.title('Confusion Matrix - Logistic Regression Baseline')
    plt.tight_layout()
    plt.savefig(save_path, dpi=300)
    plt.close()
    print(f"✓ Confusion matrix plot saved to {save_path}")

def main():
    model_path = "saved_models/logistic_regression/baseline_model.joblib"
    test_file = "backend/data/test.json"
    output_metrics = "metrics.json"
    output_cm = "confusion_matrix.png"
    
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found. Please run baseline_train.py first.")
        return
        
    if not os.path.exists(test_file):
        print(f"Error: {test_file} not found.")
        return

    print("Loading baseline model pipeline...")
    pipeline = joblib.load(model_path)
    
    print("Loading test data...")
    df_test = pd.read_json(test_file)
    
    print("Preprocessing text data...")
    df_test['clean_text'] = df_test['text'].apply(preprocess_text)
    
    # Safely filter out instances that became completely empty
    df_test = df_test[df_test['clean_text'] != '']
    
    X_test = df_test['clean_text']
    y_test = df_test['sentiment']
    
    print("Running predictions...")
    y_pred = pipeline.predict(X_test)
    
    print("\nCalculating metrics...")
    acc = accuracy_score(y_test, y_pred)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='weighted', zero_division=0)
    
    print("\n" + "="*40)
    print("         CLASSIFICATION REPORT          ")
    print("="*40)
    report = classification_report(y_test, y_pred, zero_division=0)
    print(report)
    print("="*40)
    
    # Save metrics JSON
    metrics_dict = {
        "accuracy": round(acc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4)
    }
    
    with open(output_metrics, "w", encoding="utf-8") as f:
        json.dump(metrics_dict, f, indent=4)
    print(f"✓ Metrics saved to {output_metrics}")
    
    # Generate and save Confusion Matrix
    unique_labels = sorted(y_test.unique())
    plot_confusion_matrix(y_test, y_pred, labels=unique_labels, save_path=output_cm)
    
if __name__ == "__main__":
    main()
